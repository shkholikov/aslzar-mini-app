import type { Response } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { convertToModelMessages, pipeUIMessageStreamToResponse, stepCountIs, streamText, type ModelMessage } from "ai";
import { config } from "../../config";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import {
	getChatArchivesCollection,
	getChatSessionsCollection,
	getProductsCollection,
	getUserSession,
	type ChatExtractedFacts,
	type ChatMessage,
	type ChatSessionDoc,
	type ChatToolCall
} from "../../db";
import { AmoCRMError, createChatLead } from "../../integrations/amocrm";
import { buildTools, getChatModel, summarizeConversation, type CreateLeadInput } from "../../integrations/openai-chat";
import { buildSystemPrompt, detectLanguage, type CatalogItem, type Language, type PromptUser } from "../../integrations/openai-prompts";

const RECENT_LIMIT = 10;
const SUMMARIZE_EVERY = 8;
const RESUME_GRACE_DAYS = 7;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PartSchema = z.object({ type: z.string(), text: z.string().optional() }).passthrough();
const MessageSchema = z.object({
	id: z.string().optional(),
	role: z.enum(["user", "assistant", "system"]),
	parts: z.array(PartSchema).optional()
});
const ChatRequestSchema = z
	.object({
		messages: z.array(MessageSchema).optional(),
		text: z.string().optional()
	})
	.passthrough();

function extractText(parts: { type: string; text?: string }[] | undefined): string {
	if (!parts) return "";
	return parts
		.filter((p) => p.type === "text" && typeof p.text === "string")
		.map((p) => p.text!)
		.join(" ")
		.trim();
}

function defaultFacts(): ChatExtractedFacts {
	return { interestedProducts: [], objections: [], readiness: "cold" };
}

function freshSession(telegramId: string, language: Language, carryFacts: ChatExtractedFacts | null): ChatSessionDoc {
	const now = new Date();
	return {
		telegramId,
		status: "active",
		language,
		summary: "",
		recentMessages: [],
		allMessages: [],
		extractedFacts: carryFacts ?? defaultFacts(),
		leadStatus: "none",
		dailyCount: 0,
		dailyResetAt: new Date(now.getTime() + DAY_MS),
		hourlyCount: 0,
		hourlyResetAt: new Date(now.getTime() + HOUR_MS),
		createdAt: now,
		updatedAt: now
	};
}

async function loadOrCreateActiveSession(telegramId: string, fallbackLang: Language): Promise<ChatSessionDoc> {
	const col = await getChatSessionsCollection();
	const existing = await col.findOne({ telegramId, status: "active" });
	if (existing) {
		const idleMs = Date.now() - new Date(existing.updatedAt).getTime();
		if (idleMs <= RESUME_GRACE_DAYS * DAY_MS) return existing;
		await archiveSession(existing);
		return freshSession(telegramId, existing.language, existing.extractedFacts);
	}
	const archives = await getChatArchivesCollection();
	const lastArchived = await archives.findOne({ telegramId }, { sort: { archivedAt: -1 } });
	return freshSession(telegramId, lastArchived?.language ?? fallbackLang, lastArchived?.extractedFacts ?? null);
}

async function archiveSession(session: ChatSessionDoc): Promise<void> {
	if (!session._id) return;
	const archives = await getChatArchivesCollection();
	const sessions = await getChatSessionsCollection();
	await archives.insertOne({ ...session, status: "archived", archivedAt: new Date() });
	await sessions.deleteOne({ _id: session._id });
}

function applyRateLimits(session: ChatSessionDoc): { ok: true } | { ok: false; reason: "daily" | "hourly" } {
	const now = Date.now();
	if (session.dailyResetAt.getTime() <= now) {
		session.dailyCount = 0;
		session.dailyResetAt = new Date(now + DAY_MS);
	}
	if (session.hourlyResetAt.getTime() <= now) {
		session.hourlyCount = 0;
		session.hourlyResetAt = new Date(now + HOUR_MS);
	}
	if (session.dailyCount >= config.CHAT_DAILY_LIMIT) return { ok: false, reason: "daily" };
	if (session.hourlyCount >= config.CHAT_HOURLY_LIMIT) return { ok: false, reason: "hourly" };
	return { ok: true };
}

function rateLimitMessage(reason: "daily" | "hourly", lang: Language): string {
	if (lang === "ru") {
		return reason === "daily"
			? `Сегодня вы уже использовали лимит сообщений (${config.CHAT_DAILY_LIMIT} в сутки). Попробуйте завтра или напишите менеджеру.`
			: `Слишком много сообщений за час (${config.CHAT_HOURLY_LIMIT}). Подождите немного и продолжим.`;
	}
	return reason === "daily"
		? `Bugun xabarlar limiti tugadi (kuniga ${config.CHAT_DAILY_LIMIT} ta). Ertaga sinab ko'ring yoki menejerga yozing.`
		: `Bir soatda juda ko'p xabar (${config.CHAT_HOURLY_LIMIT}). Biroz kuting va davom etamiz.`;
}

async function loadCatalog(): Promise<CatalogItem[]> {
	const col = await getProductsCollection();
	const list = await col.find({}).sort({ createdAt: -1 }).limit(100).toArray();
	return list.map((p) => ({
		id: String(p._id),
		title: p.title,
		description: p.description,
		price: typeof p.price === "number" && isFinite(p.price) && p.price > 0 ? p.price : undefined,
		url: p.url ?? p.imageUrl ?? undefined,
		badgeLabel: p.badgeLabel
	}));
}

function buildPromptUser(telegramId: string, miniApp: MiniAppAuthedRequest["miniAppUser"], session1c: Awaited<ReturnType<typeof getUserSession>>): PromptUser {
	return {
		telegramId,
		firstName: session1c?.first_name ?? miniApp?.first_name,
		lastName: session1c?.last_name ?? miniApp?.last_name,
		username: session1c?.username ?? miniApp?.username,
		phone: session1c?.phone_number,
		user1CData: session1c?.user1CData
	};
}

/**
 * POST /v1/chat
 *
 * Streaming sales-chat endpoint. Body shape mirrors what `useChat` from
 * @ai-sdk/react sends:
 *   { messages: UIMessage[], ... }
 *
 * The route is server-canonical: we read the last user message from the
 * request and rebuild model context from the persisted chat session
 * (system prompt + summary + facts + last 10 turns). The full transcript
 * lives only in MongoDB; the model never sees more than the recent window.
 */
export async function chatHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const parsed = ChatRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
		return;
	}

	const telegramId = String(req.miniAppUser!.id);
	const lastUserMsg = parsed.data.messages?.slice().reverse().find((m) => m.role === "user");
	const userText = (parsed.data.text ?? extractText(lastUserMsg?.parts)).trim();
	if (!userText) {
		res.status(400).json({ error: "Empty user message" });
		return;
	}

	const tgLangHint: Language = req.miniAppUser?.language_code === "ru" ? "ru" : "uz";
	let session = await loadOrCreateActiveSession(telegramId, tgLangHint);
	const isFirstTurn = session.allMessages.length === 0;
	if (isFirstTurn) session.language = detectLanguage(userText);

	const limitCheck = applyRateLimits(session);
	if (!limitCheck.ok) {
		res.status(429).json({ error: rateLimitMessage(limitCheck.reason, session.language) });
		return;
	}

	const session1c = await getUserSession(telegramId);
	const catalog = await loadCatalog();

	const userMessage: ChatMessage = {
		id: lastUserMsg?.id ?? new ObjectId().toHexString(),
		role: "user",
		content: userText,
		createdAt: new Date()
	};

	const promptUser = buildPromptUser(telegramId, req.miniAppUser, session1c);
	const system = buildSystemPrompt({
		lang: session.language,
		user: promptUser,
		catalog,
		summary: session.summary,
		facts: session.extractedFacts
	});

	const modelMessages: ModelMessage[] = [
		...session.recentMessages
			.filter((m) => m.role === "user" || m.role === "assistant")
			.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
		{ role: "user", content: userText }
	];

	const onCreateLead = async (input: CreateLeadInput) => {
		try {
			if (!session1c?.phone_number) {
				return { ok: false, error: "no_phone" } as const;
			}
			const interestedProducts = input.interestedProductIds
				.map((id) => catalog.find((p) => p.id === id))
				.filter((p): p is CatalogItem => !!p)
				.map((p) => ({ id: p.id, title: p.title, price: p.price, url: p.url }));

			const { leadId } = await createChatLead({
				telegramUserId: telegramId,
				phone: session1c.phone_number,
				firstName: session1c.first_name ?? "",
				lastName: session1c.last_name ?? "",
				username: session1c.username,
				language: session.language,
				summary: input.summary,
				readiness: input.readiness,
				reason: input.reason,
				budget: input.budget,
				preferredContactTime: input.preferredContactTime,
				interestedProducts,
				objections: session.extractedFacts.objections
			});
			session.leadStatus = "created";
			if (leadId) session.amoLeadId = leadId;
			return { ok: true, leadId: leadId ?? undefined } as const;
		} catch (err) {
			console.error("[chat] create_lead failed", err);
			if (err instanceof AmoCRMError) return { ok: false, error: `amocrm_${err.status}` } as const;
			return { ok: false, error: err instanceof Error ? err.message : "unknown" } as const;
		}
	};

	const tools = buildTools({ onCreateLead });

	const result = streamText({
		model: getChatModel(),
		system,
		messages: modelMessages,
		tools,
		stopWhen: stepCountIs(4),
		onFinish: async ({ text, toolCalls, toolResults }) => {
			try {
				const sessions = await getChatSessionsCollection();
				const assistantToolCalls: ChatToolCall[] = (toolCalls ?? []).map((tc, i) => {
					const matched = (toolResults ?? [])[i];
					return {
						id: tc.toolCallId,
						name: tc.toolName as ChatToolCall["name"],
						input: (tc.input ?? {}) as Record<string, unknown>,
						output: (matched?.output ?? undefined) as Record<string, unknown> | undefined
					};
				});

				const assistantMessage: ChatMessage = {
					id: new ObjectId().toHexString(),
					role: "assistant",
					content: text,
					toolCalls: assistantToolCalls.length > 0 ? assistantToolCalls : undefined,
					createdAt: new Date()
				};

				session.allMessages.push(userMessage, assistantMessage);
				session.recentMessages.push(userMessage, assistantMessage);
				if (session.recentMessages.length > RECENT_LIMIT) {
					session.recentMessages = session.recentMessages.slice(-RECENT_LIMIT);
				}
				session.dailyCount += 1;
				session.hourlyCount += 1;
				session.updatedAt = new Date();

				const userTurnCount = session.allMessages.filter((m) => m.role === "user").length;
				const shouldSummarize = userTurnCount > 0 && userTurnCount % SUMMARIZE_EVERY === 0;

				if (session._id) {
					await sessions.updateOne(
						{ _id: session._id },
						{
							$set: {
								status: session.status,
								language: session.language,
								summary: session.summary,
								recentMessages: session.recentMessages,
								allMessages: session.allMessages,
								extractedFacts: session.extractedFacts,
								leadStatus: session.leadStatus,
								amoLeadId: session.amoLeadId,
								dailyCount: session.dailyCount,
								dailyResetAt: session.dailyResetAt,
								hourlyCount: session.hourlyCount,
								hourlyResetAt: session.hourlyResetAt,
								updatedAt: session.updatedAt
							}
						}
					);
				} else {
					const insertRes = await sessions.insertOne(session);
					session._id = insertRes.insertedId;
				}

				if (shouldSummarize) {
					const oldest = session.allMessages.slice(-RECENT_LIMIT - 4, -RECENT_LIMIT);
					summarizeConversation({
						lang: session.language,
						previousSummary: session.summary,
						previousFacts: session.extractedFacts,
						newMessages: oldest
					})
						.then(({ summary, facts }) => {
							if (!session._id) return;
							return sessions.updateOne({ _id: session._id }, { $set: { summary, extractedFacts: facts, updatedAt: new Date() } });
						})
						.catch((err) => console.warn("[chat] async summarize failed:", err));
				}

				if (session.leadStatus === "created" && session._id) {
					setTimeout(
						() => {
							getChatSessionsCollection()
								.then((c) => c.findOne({ _id: session._id }))
								.then((doc) => {
									if (!doc) return;
									const idleMs = Date.now() - new Date(doc.updatedAt).getTime();
									if (idleMs >= HOUR_MS) return archiveSession(doc);
								})
								.catch((err) => console.warn("[chat] post-lead archive check failed:", err));
						},
						HOUR_MS + 5000
					);
				}
			} catch (err) {
				console.error("[chat] persist turn failed:", err);
			}
		}
	});

	pipeUIMessageStreamToResponse({
		response: res,
		stream: result.toUIMessageStream()
	});
}
