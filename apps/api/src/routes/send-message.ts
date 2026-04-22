import type { Request, Response } from "express";
import { z } from "zod";
import { sendTelegramMessage, TelegramApiError } from "../telegram";

const SendMessageSchema = z
	.object({
		chat_id: z.union([z.string().min(1), z.number()]),
		text: z.string().min(1).max(4096)
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

export async function sendMessageHandler(req: Request, res: Response): Promise<void> {
	const parseResult = SendMessageSchema.safeParse(req.body);
	if (!parseResult.success) {
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

	try {
		const result = await sendTelegramMessage(parseResult.data);
		res.status(200).json({ ok: true, result });
	} catch (err) {
		if (err instanceof TelegramApiError) {
			const { status, code } = mapTelegramError(err.errorCode, err.description);
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
		res.status(500).json({
			ok: false,
			error: { code: "internal_error", message: "Unexpected server error" }
		});
	}
}
