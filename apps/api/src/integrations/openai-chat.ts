import { createOpenAI } from "@ai-sdk/openai";
import { generateText, jsonSchema, tool, type ToolSet } from "ai";
import { z } from "zod";
import { config } from "../config";
import type { ChatExtractedFacts, ChatMessage } from "../db";
import type { Language } from "./openai-prompts";

let cachedClient: ReturnType<typeof createOpenAI> | null = null;

function getOpenAI() {
	if (!cachedClient) {
		if (!config.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
		cachedClient = createOpenAI({ apiKey: config.OPENAI_API_KEY });
	}
	return cachedClient;
}

export function getChatModel() {
	return getOpenAI()(config.OPENAI_CHAT_MODEL);
}

export function getSummaryModel() {
	return getOpenAI()(config.OPENAI_SUMMARY_MODEL);
}

/**
 * Tool inputs the model can call.
 * `recommend_products` is a UI-only tool: its result is consumed by the frontend
 *   (renders a product carousel below the assistant message). The execute() body
 *   simply echoes ok so the model can continue the turn.
 * `create_lead` actually performs work — it's wired by the route handler so it
 *   has access to req-scoped state (telegram user, current chat session id).
 */
export type RecommendProductsInput = {
	productIds: string[];
	reason: string;
};

export type CreateLeadInput = {
	summary: string;
	interestedProductIds: string[];
	readiness: "warm" | "hot";
	budget?: string;
	preferredContactTime?: string;
	reason: "ready_to_buy" | "human_requested" | "wants_more_info";
};

export type CreateLeadHandler = (input: CreateLeadInput) => Promise<{ ok: boolean; leadId?: number; error?: string }>;

type RecommendProductsResult = { ok: true; productIds: string[]; reason: string };
type CreateLeadResult = { ok: boolean; leadId?: number; error?: string };

const recommendProductsJsonSchema = jsonSchema<RecommendProductsInput>({
	type: "object",
	properties: {
		productIds: {
			type: "array",
			items: { type: "string", minLength: 1 },
			minItems: 1,
			maxItems: 3,
			description: "1-3 product IDs from the injected catalog"
		},
		reason: {
			type: "string",
			minLength: 1,
			maxLength: 200,
			description: "Short why-this-fits note in the user's language"
		}
	},
	required: ["productIds", "reason"],
	additionalProperties: false
});

const createLeadJsonSchema = jsonSchema<CreateLeadInput>({
	type: "object",
	properties: {
		summary: { type: "string", minLength: 1, maxLength: 500, description: "One-paragraph chat summary in the user's language" },
		interestedProductIds: { type: "array", items: { type: "string" } },
		readiness: { type: "string", enum: ["warm", "hot"], description: "Hot = ready to buy now, warm = needs a small nudge" },
		budget: { type: "string" },
		preferredContactTime: { type: "string" },
		reason: { type: "string", enum: ["ready_to_buy", "human_requested", "wants_more_info"] }
	},
	required: ["summary", "interestedProductIds", "readiness", "reason"],
	additionalProperties: false
});

// Plain JSON Schema bypasses AI SDK v6's zod generic inference (which goes
// "excessively deep" with our schemas). Runtime validation is still performed
// against the JSON schema by the SDK before calling execute().
export function buildTools(handlers: { onCreateLead: CreateLeadHandler }): ToolSet {
	const tools: ToolSet = {
		recommend_products: tool<RecommendProductsInput, RecommendProductsResult>({
			description:
				"Render product cards (image, title, price, button) inline under the assistant message. Call this every time you recommend specific products instead of just describing them in text. The user will see actual photos.",
			inputSchema: recommendProductsJsonSchema,
			execute: async (input) => ({ ok: true, productIds: input.productIds, reason: input.reason })
		}),
		create_lead: tool<CreateLeadInput, CreateLeadResult>({
			description:
				"Hand the conversation off to a human sales manager by creating an AmoCRM lead. Only call after the user has expressed buying intent and confirmed they want a manager to contact them.",
			inputSchema: createLeadJsonSchema,
			execute: async (input) => handlers.onCreateLead(input)
		})
	};
	return tools;
}

/**
 * Async summarizer — folds older messages into `summary` + structured `facts`.
 * Called every ~8 user turns. Failure is non-fatal; we just keep the existing summary.
 */
export async function summarizeConversation(args: {
	lang: Language;
	previousSummary: string;
	previousFacts: ChatExtractedFacts;
	newMessages: ChatMessage[];
}): Promise<{ summary: string; facts: ChatExtractedFacts }> {
	const transcript = args.newMessages
		.filter((m) => m.role === "user" || m.role === "assistant")
		.map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
		.join("\n");

	const instruction =
		args.lang === "uz"
			? "Sotuv suhbatining yangi qismini xulosa qilib, oldingi xulosa bilan birlashtiring va strukturalangan faktlarni yangilang. Hammasi o'zbek tilida bo'lsin."
			: "Подытожьте новую часть продажного диалога, объедините с предыдущим итогом и обновите структурированные факты. Всё на русском языке.";

	const schema = z.object({
		summary: z.string().describe("Updated rolling summary (max 4 sentences)"),
		facts: z.object({
			interestedProducts: z.array(z.string()).default([]),
			budget: z.string().optional(),
			objections: z.array(z.string()).default([]),
			readiness: z.enum(["cold", "warm", "hot"]).default("cold"),
			preferredContactTime: z.string().optional()
		})
	});

	try {
		const { text } = await generateText({
			model: getSummaryModel(),
			system: `You update a rolling sales-conversation summary and extracted facts. Reply ONLY with a JSON object matching: {"summary": string, "facts": {"interestedProducts": string[], "budget"?: string, "objections": string[], "readiness": "cold"|"warm"|"hot", "preferredContactTime"?: string}}. ${instruction}`,
			prompt: `PREVIOUS SUMMARY:\n${args.previousSummary || "(none)"}\n\nPREVIOUS FACTS:\n${JSON.stringify(args.previousFacts)}\n\nNEW TRANSCRIPT:\n${transcript}\n\nReturn the updated JSON now.`
		});

		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return { summary: args.previousSummary, facts: args.previousFacts };
		const parsed = schema.safeParse(JSON.parse(jsonMatch[0]));
		if (!parsed.success) return { summary: args.previousSummary, facts: args.previousFacts };
		return parsed.data as { summary: string; facts: ChatExtractedFacts };
	} catch (err) {
		console.warn("[chat] summarization failed (non-fatal):", err);
		return { summary: args.previousSummary, facts: args.previousFacts };
	}
}
