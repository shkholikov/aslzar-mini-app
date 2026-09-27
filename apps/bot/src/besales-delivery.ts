import { Api, GrammyError, InlineKeyboard, Keyboard } from "grammy";
import { sendInbound, type BesalesButton, type BesalesMedia, type BesalesOutboundMessage } from "./besales";
import { besalesDeliveries } from "./db";
import { WEBAPP_URL } from "./helper";
import type { InlineKeyboardButton } from "grammy/types";

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

/**
 * Hosts that serve our Mini App. A link to one of them is rendered as a web_app button so it opens
 * inside Telegram with initData; a plain url button would open a browser, where the app's
 * TelegramGuard turns the user away. The canonical production host is listed explicitly so this
 * holds even if WEBAPP_URL points at another alias (e.g. the *.vercel.app one).
 */
const MINI_APP_HOSTS = new Set(
	[WEBAPP_URL, "https://app.aslzarbot.uz"].flatMap((u) => {
		try {
			return [new URL(u).host];
		} catch {
			return [];
		}
	})
);

type InlineButton = InlineKeyboardButton;

/**
 * One inline button from a Besales button, or null when it can't be rendered:
 *   url on a Mini App host -> web_app button (opens the Mini App inside Telegram)
 *   other https url        -> url button
 *   value                  -> callback button (as before)
 */
function toInlineButton(b: BesalesButton): InlineButton | null {
	if (b.url) {
		let parsed: URL;
		try {
			parsed = new URL(b.url);
		} catch {
			console.warn(`[besales] button "${b.label}" has an unparseable url, skipped: ${b.url}`);
			return null;
		}
		if (parsed.protocol !== "https:") {
			console.warn(`[besales] button "${b.label}" url is not https, skipped: ${b.url}`);
			return null;
		}
		return MINI_APP_HOSTS.has(parsed.host) ? InlineKeyboard.webApp(b.label, b.url) : InlineKeyboard.url(b.label, b.url);
	}
	if (b.value) return InlineKeyboard.text(b.label, safeCallbackData(b.value));
	console.warn(`[besales] button "${b.label}" has neither url nor value, skipped`);
	return null;
}

/**
 * Builds the keyboard for one Besales message.
 *
 * A `requestContact` button can only live on a reply keyboard (bottom of the screen), and Telegram
 * does not allow a reply keyboard and inline buttons on the same message. So when the message asks
 * for the phone, that button is shown on its own and any other buttons are dropped. One-time: it
 * hides after the tap. `requestsContact` tells the caller to remember the request, so the contact
 * that comes back is reported to Besales (see the :contact handler).
 *
 * Inline rows are built whole, so a row whose buttons were all skipped never becomes an empty row.
 */
export function buildKeyboard(buttons?: BesalesOutboundMessage["buttons"]): {
	markup?: InlineKeyboard | Keyboard;
	requestsContact: boolean;
} {
	if (!buttons || buttons.length === 0) return { requestsContact: false };

	const all = buttons.flat();
	const contactButton = all.find((b) => b.requestContact);
	if (contactButton) {
		if (all.length > 1) {
			console.warn(`[besales] requestContact must come alone; dropped ${all.length - 1} other button(s) in the same message`);
		}
		return { markup: new Keyboard().requestContact(contactButton.label).oneTime().resized(), requestsContact: true };
	}

	const rows = buttons.map((row) => row.map(toInlineButton).filter((b): b is InlineButton => b !== null)).filter((row) => row.length > 0);
	return { markup: rows.length > 0 ? InlineKeyboard.from(rows) : undefined, requestsContact: false };
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
			const { markup, requestsContact } = buildKeyboard(message.buttons);

			// Telegram requires text for sendMessage; if a message is buttons-only, use a minimal placeholder.
			if (message.text || markup) {
				const text = message.text && message.text.length > 0 ? message.text : "…";
				await api.sendMessage(chatId, text, markup ? { reply_markup: markup } : undefined);

				// Remember that the agent asked for the phone, so the contact that comes back is
				// reported to Besales. Mini App registrations never set this, so they report nothing.
				if (requestsContact) {
					await besalesDeliveries
						.updateOne({ _id: `contact-requested:${chatId}` }, { $set: { createdAt: new Date() } }, { upsert: true })
						.catch((e) => console.error(`[besales] could not record contact request for ${chatId}:`, e));
				}
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
