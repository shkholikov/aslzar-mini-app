import { Api, GrammyError, InlineKeyboard } from "grammy";
import { sendInbound, type BesalesMedia, type BesalesOutboundMessage } from "./besales";
import { besalesDeliveries } from "./db";

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
 * Why Telegram refused a message, when the refusal means "this person can't be reached" rather
 * than "this one message was bad". Only these are reported to Besales: a network blip or a
 * broken media URL says nothing about whether the user is reachable.
 */
export type DeliveryFailureReason = "user_blocked_bot" | "user_not_started" | "user_deactivated" | "chat_not_found";

export function classifyDeliveryFailure(error: unknown): DeliveryFailureReason | null {
	if (!(error instanceof GrammyError)) return null;
	const description = error.description.toLowerCase();
	if (error.error_code === 403) {
		if (description.includes("blocked by the user")) return "user_blocked_bot";
		if (description.includes("can't initiate conversation")) return "user_not_started";
		if (description.includes("user is deactivated")) return "user_deactivated";
		return null;
	}
	if (error.error_code === 400 && description.includes("chat not found")) return "chat_not_found";
	return null;
}

/**
 * Tell Besales the agent's message never reached the user.
 *
 * We ack every callback with 200 before delivering (Besales' 10s budget), so without this they
 * count a message to someone who blocked the bot as delivered and keep writing into the void.
 *
 * Loop guard: if their agent ever answers this event, that answer fails the same way and would
 * produce another event, indefinitely. One report per user per hour is enough to mark the contact
 * unreachable and bounds any such loop to a trickle. The guard key lives in the existing dedup
 * collection (7-day TTL), so there is no new collection to manage. If the guard write itself
 * fails we skip the report: losing one event is better than risking the loop.
 */
async function reportDeliveryFailure(chatId: number, reason: DeliveryFailureReason, callbackId: string): Promise<void> {
	const hour = new Date().toISOString().slice(0, 13); // e.g. "2026-09-27T12" (UTC)
	try {
		await besalesDeliveries.insertOne({ _id: `delivery-failed:${chatId}:${hour}`, createdAt: new Date() });
	} catch (error) {
		if ((error as { code?: number }).code === 11000) {
			console.log(`[besales] delivery_failed for ${chatId} already reported this hour, skipped (${reason}, callback ${callbackId})`);
		} else {
			console.error(`[besales] delivery_failed guard write failed for ${chatId}, not reporting:`, error);
		}
		return;
	}

	console.warn(`[besales] delivery to ${chatId} failed (${reason}), reporting to Besales (callback ${callbackId})`);
	await sendInbound({
		externalUserId: String(chatId),
		externalChatId: String(chatId),
		// Keyed on the callback, so a Besales retry of the same callback is deduplicated on their side.
		externalMessageId: `delivery-failed:${callbackId}`,
		sourceChannel: "telegram",
		// No text: this is not something the user said.
		metadata: { event: "delivery_failed", reason, callbackId },
		timestamp: Math.floor(Date.now() / 1000)
	});
}

/**
 * Deliver Besales outbound messages to a Telegram chat, in order.
 * Runs outside grammY (no session/ctx) — the chat id is the numeric externalUserId.
 *
 * If Telegram says the user can't be reached, the rest of this callback is abandoned and the
 * failure is reported back to Besales. Any other 403 also aborts (nothing more will get through),
 * but isn't reported. Other errors are logged and delivery continues with the next message.
 */
export async function deliverBesalesMessages(
	api: Api,
	chatId: number,
	messages: BesalesOutboundMessage[],
	callbackId: string
): Promise<void> {
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
			const reason = classifyDeliveryFailure(error);
			if (reason) {
				await reportDeliveryFailure(chatId, reason, callbackId);
				return;
			}
			if (error instanceof GrammyError && error.error_code === 403) {
				console.warn(`[besales] delivery to ${chatId} forbidden (${error.description}), aborting`);
				return;
			}
			console.error(`[besales] delivery error to chat ${chatId}:`, error);
			// Continue to the next message.
		}
	}
}
