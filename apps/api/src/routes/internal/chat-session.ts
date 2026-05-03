import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import {
	getChatArchivesCollection,
	getChatSessionsCollection,
	type ChatMessage,
	type ChatSessionDoc,
	type ChatToolCall
} from "../../db";

type WireMessagePart =
	| { type: "text"; text: string }
	| {
			type: `tool-${string}`;
			toolCallId: string;
			state: "output-available";
			input: Record<string, unknown>;
			output: Record<string, unknown> | undefined;
	  };

type WireMessage = {
	id: string;
	role: "user" | "assistant";
	parts: WireMessagePart[];
	createdAt: string;
};

/**
 * Converts a stored ChatMessage into the AI SDK UIMessage shape so the webapp
 * can hydrate `useChat` with prior history when the user reopens the chat.
 */
function toWireMessage(m: ChatMessage): WireMessage {
	const parts: WireMessagePart[] = [];
	if (m.content) parts.push({ type: "text", text: m.content });
	for (const tc of m.toolCalls ?? []) {
		parts.push({
			type: `tool-${tc.name}`,
			toolCallId: tc.id,
			state: "output-available",
			input: tc.input,
			output: tc.output
		});
	}
	return {
		id: m.id,
		role: m.role === "tool" ? "assistant" : m.role,
		parts,
		createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString()
	};
}

/**
 * GET /v1/chat/session
 *
 * Returns the active chat session (if any) plus the full message history so
 * the webapp can render past turns. Empty `messages` means a fresh session.
 */
export async function getChatSessionHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const telegramId = String(req.miniAppUser!.id);
	try {
		const col = await getChatSessionsCollection();
		const session = await col.findOne({ telegramId, status: "active" });
		if (!session) {
			res.status(200).json({
				exists: false,
				messages: [] as WireMessage[],
				language: "uz",
				leadStatus: "none" as const
			});
			return;
		}
		res.status(200).json({
			exists: true,
			language: session.language,
			leadStatus: session.leadStatus,
			amoLeadId: session.amoLeadId ?? null,
			messages: session.allMessages.map(toWireMessage)
		});
	} catch (err) {
		console.error("[chat-session] load failed", err);
		res.status(500).json({ error: "Failed to load chat session" });
	}
}

/**
 * POST /v1/chat/session/reset
 *
 * User-initiated reset. Archives the current active session into chat_session_archives
 * and starts fresh on the next /v1/chat call. Extracted facts are dropped because
 * the user is signalling they want a clean slate.
 */
export async function resetChatSessionHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const telegramId = String(req.miniAppUser!.id);
	try {
		const sessions = await getChatSessionsCollection();
		const archives = await getChatArchivesCollection();
		const session = await sessions.findOne({ telegramId, status: "active" });
		if (!session?._id) {
			res.status(200).json({ ok: true, archived: false });
			return;
		}
		const archived: ChatSessionDoc = { ...session, status: "archived", archivedAt: new Date() };
		await archives.insertOne(archived);
		await sessions.deleteOne({ _id: session._id });
		res.status(200).json({ ok: true, archived: true });
	} catch (err) {
		console.error("[chat-session] reset failed", err);
		res.status(500).json({ error: "Failed to reset chat session" });
	}
}
