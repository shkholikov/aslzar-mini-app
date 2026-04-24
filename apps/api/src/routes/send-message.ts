import type { Response } from "express";
import { z } from "zod";
import { sendTelegramMessage, TelegramApiError } from "../telegram";
import { findTelegramIdByPhone, getApiCallsCollection, type ApiCallStatus } from "../db";
import type { AuthedRequest, AuthenticatedApiKey } from "../auth";

/**
 * `phone` must be digits-only, no '+' or separators.
 * The bot stores `value.phone_number` as digits-only (see apps/bot/src/bot.ts:105,
 * which normalizes via `.replace(/\D/g, "")`). Keeping the input contract strict
 * means lookups are a direct equality match with zero normalization drift.
 */
const SendMessageSchema = z
	.object({
		phone: z.string().regex(/^\d{7,15}$/, "phone must contain 7–15 digits only, no '+' or separators"),
		text: z.string().min(1).max(4096),
		parse_mode: z.enum(["HTML", "MarkdownV2", "Markdown"]).optional()
	})
	.strict();

type MappedError = { status: number; code: string };

function mapTelegramError(errorCode: number, description: string): MappedError {
	const lower = description.toLowerCase();

	if (errorCode === 400) {
		if (lower.includes("chat not found")) return { status: 400, code: "chat_not_found" };
		if (lower.includes("message is too long")) return { status: 400, code: "text_too_long" };
		if (lower.includes("message text is empty")) return { status: 400, code: "empty_text" };
		return { status: 400, code: "bad_request" };
	}
	if (errorCode === 401) return { status: 502, code: "bot_misconfigured" };
	if (errorCode === 403) {
		if (lower.includes("blocked by the user")) return { status: 403, code: "user_blocked_bot" };
		if (lower.includes("can't initiate conversation")) return { status: 403, code: "user_not_started" };
		if (lower.includes("user is deactivated")) return { status: 403, code: "user_deactivated" };
		if (lower.includes("kicked")) return { status: 403, code: "bot_kicked" };
		return { status: 403, code: "forbidden" };
	}
	if (errorCode === 404) return { status: 502, code: "unknown_method" };
	if (errorCode === 429) return { status: 429, code: "rate_limited" };
	if (errorCode >= 500) return { status: 502, code: "telegram_unavailable" };
	return { status: 502, code: "telegram_error" };
}

type AuditInput = {
	apiKey: AuthenticatedApiKey;
	phone: string;
	chatId?: number;
	status: ApiCallStatus;
	errorCode?: string;
	telegramMessageId?: number;
};

function logApiCall(input: AuditInput): void {
	// Fire-and-forget — the response is returned before this promise resolves.
	getApiCallsCollection()
		.then((col) =>
			col.insertOne({
				apiKeyId: input.apiKey.id,
				apiKeyName: input.apiKey.name,
				phone: input.phone,
				chatId: input.chatId,
				status: input.status,
				errorCode: input.errorCode,
				telegramMessageId: input.telegramMessageId,
				createdAt: new Date()
			})
		)
		.catch((err) => {
			console.error("[sendMessage] audit log write failed", err);
		});
}

export async function sendMessageHandler(req: AuthedRequest, res: Response): Promise<void> {
	const apiKey = req.apiKey;
	if (!apiKey) {
		// requireApiKey should have blocked this path; defensive guard.
		res.status(500).json({
			ok: false,
			error: { code: "internal_error", message: "Missing authenticated API key context" }
		});
		return;
	}

	const parseResult = SendMessageSchema.safeParse(req.body);
	if (!parseResult.success) {
		const attemptedPhone = typeof (req.body as { phone?: unknown })?.phone === "string" ? ((req.body as { phone: string }).phone) : "";
		logApiCall({
			apiKey,
			phone: attemptedPhone,
			status: "invalid_request",
			errorCode: "invalid_request"
		});
		res.status(400).json({
			ok: false,
			error: {
				code: "invalid_request",
				message: "Request body is invalid",
				issues: parseResult.error.issues
			}
		});
		return;
	}

	const { phone, text, parse_mode } = parseResult.data;

	const chatId = await findTelegramIdByPhone(phone);
	if (chatId === null) {
		logApiCall({
			apiKey,
			phone,
			status: "user_not_registered",
			errorCode: "user_not_registered"
		});
		res.status(404).json({
			ok: false,
			error: {
				code: "user_not_registered",
				message:
					"No user with that phone number has started the bot yet. Ask the user to open @aslzar_bot and tap Start, then share their phone."
			}
		});
		return;
	}

	try {
		const result = await sendTelegramMessage({
			chat_id: chatId,
			text,
			...(parse_mode && { parse_mode })
		});
		logApiCall({
			apiKey,
			phone,
			chatId,
			status: "sent",
			telegramMessageId: result.message_id
		});
		res.status(200).json({ ok: true, result });
	} catch (err) {
		if (err instanceof TelegramApiError) {
			const { status, code } = mapTelegramError(err.errorCode, err.description);
			logApiCall({
				apiKey,
				phone,
				chatId,
				status: "telegram_error",
				errorCode: code
			});
			res.status(status).json({
				ok: false,
				error: {
					code,
					message: err.description,
					...(err.retryAfter !== undefined && { retry_after: err.retryAfter })
				}
			});
			return;
		}
		console.error("[sendMessage] internal error", err);
		logApiCall({
			apiKey,
			phone,
			chatId,
			status: "telegram_error",
			errorCode: "internal_error"
		});
		res.status(500).json({
			ok: false,
			error: { code: "internal_error", message: "Unexpected server error" }
		});
	}
}
