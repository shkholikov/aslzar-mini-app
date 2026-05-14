import type { BroadcastMedia } from "@/lib/db";
import type { BroadcastButton } from "@/lib/broadcast-validation";

const TG_BASE = "https://api.telegram.org";

interface TelegramResponse<T> {
	ok: boolean;
	result?: T;
	description?: string;
	error_code?: number;
}

export class TelegramApiError extends Error {
	constructor(
		public readonly description: string,
		public readonly errorCode?: number
	) {
		super(description);
		this.name = "TelegramApiError";
	}
}

async function tgFetch<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
	const token = process.env.BOT_TOKEN;
	if (!token) {
		throw new Error("BOT_TOKEN is not configured");
	}
	const res = await fetch(`${TG_BASE}/bot${token}/${method}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload)
	});
	const data = (await res.json()) as TelegramResponse<T>;
	if (!data.ok) {
		throw new TelegramApiError(data.description ?? `Telegram API error (${res.status})`, data.error_code);
	}
	return data.result as T;
}

/**
 * Send the broadcast composition to a single chat. Mirrors `apps/bot/src/broadcast.ts` exactly:
 * - 0 media       → sendMessage (with optional reply_markup)
 * - 1 media       → sendPhoto / sendVideo (caption + optional reply_markup)
 * - 2+ media      → sendMediaGroup (caption on first item, no reply_markup — Telegram constraint)
 *
 * Throws TelegramApiError when Telegram returns ok=false. Caller should surface the description.
 */
export async function sendTestBroadcast(params: {
	chatId: number;
	message: string;
	media: BroadcastMedia[];
	button?: BroadcastButton;
}): Promise<void> {
	const { chatId, message, media, button } = params;
	const reply_markup = button ? { inline_keyboard: [[{ text: button.buttonText, url: button.buttonUrl }]] } : undefined;
	const caption = message || undefined;

	if (media.length >= 2) {
		const groupMedia = media.map((m, idx) =>
			m.type === "video"
				? { type: "video" as const, media: m.url, supports_streaming: true, caption: idx === 0 ? caption : undefined }
				: { type: "photo" as const, media: m.url, caption: idx === 0 ? caption : undefined }
		);
		await tgFetch("sendMediaGroup", { chat_id: chatId, media: groupMedia });
		return;
	}

	if (media.length === 1) {
		const m = media[0];
		if (m.type === "photo") {
			await tgFetch("sendPhoto", { chat_id: chatId, photo: m.url, caption, reply_markup });
		} else {
			await tgFetch("sendVideo", { chat_id: chatId, video: m.url, caption, supports_streaming: true, reply_markup });
		}
		return;
	}

	await tgFetch("sendMessage", { chat_id: chatId, text: message, reply_markup });
}
