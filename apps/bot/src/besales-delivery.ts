import { Api, GrammyError, InlineKeyboard } from "grammy";
import type { BesalesMedia, BesalesOutboundMessage } from "./besales";

/** Telegram limits inline callback_data to 64 bytes. */
const CALLBACK_DATA_MAX_BYTES = 64;

/**
 * Keep callback_data within Telegram's 64-byte limit. Besales `value`s are expected to be
 * short tokens; if one ever exceeds the limit we log loudly and truncate at a UTF-8 boundary.
 * A proper token map is deferred until this warning is actually observed.
 */
function safeCallbackData(value: string): string {
	if (Buffer.byteLength(value, "utf8") <= CALLBACK_DATA_MAX_BYTES) return value;

	console.warn(`[besales] callback_data exceeds ${CALLBACK_DATA_MAX_BYTES} bytes, truncating: ${value}`);
	const buf = Buffer.from(value, "utf8");
	let end = CALLBACK_DATA_MAX_BYTES;
	// Back off if we'd cut in the middle of a multi-byte character.
	while (end > 0 && (buf[end] & 0xc0) === 0x80) end--;
	return buf.toString("utf8", 0, end);
}

function buildKeyboard(buttons?: BesalesOutboundMessage["buttons"]): InlineKeyboard | undefined {
	if (!buttons || buttons.length === 0) return undefined;
	const kb = new InlineKeyboard();
	for (const row of buttons) {
		for (const b of row) kb.text(b.label, safeCallbackData(b.value));
		kb.row();
	}
	return kb;
}

async function sendMedia(api: Api, chatId: number, media: BesalesMedia): Promise<void> {
	const opts = media.caption ? { caption: media.caption } : undefined;
	switch (media.type) {
		case "image":
			await api.sendPhoto(chatId, media.url, opts);
			break;
		case "voice":
			await api.sendVoice(chatId, media.url, opts);
			break;
		case "audio":
			await api.sendAudio(chatId, media.url, opts);
			break;
		case "video":
			await api.sendVideo(chatId, media.url, opts);
			break;
		default: // "document" and any unknown type
			await api.sendDocument(chatId, media.url, opts);
			break;
	}
}

/**
 * Deliver Besales outbound messages to a Telegram chat, in order.
 * Runs outside grammY (no session/ctx) — the chat id is the numeric externalUserId.
 * If the user blocked the bot (403) we abort this delivery; other errors are logged and skipped.
 */
export async function deliverBesalesMessages(api: Api, chatId: number, messages: BesalesOutboundMessage[]): Promise<void> {
	for (const message of messages) {
		try {
			const keyboard = buildKeyboard(message.buttons);

			// Telegram requires text for sendMessage; if a message is buttons-only, use a minimal placeholder.
			if (message.text || keyboard) {
				const text = message.text && message.text.length > 0 ? message.text : "…";
				await api.sendMessage(chatId, text, keyboard ? { reply_markup: keyboard } : undefined);
			}

			for (const media of message.media ?? []) {
				await sendMedia(api, chatId, media);
			}
		} catch (error) {
			if (error instanceof GrammyError && error.error_code === 403) {
				console.warn(`[besales] user ${chatId} blocked the bot — aborting delivery`);
				return;
			}
			console.error(`[besales] delivery error to chat ${chatId}:`, error);
			// Continue to the next message.
		}
	}
}
