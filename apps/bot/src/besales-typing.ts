import "./config";
import type { Api } from "grammy";

/**
 * "Typing…" indicator for the async Besales channel (fully bot-side; Besales sends no field for it).
 *
 * Flow, per the Besales integration guide:
 *   - Wait BESALES_TYPING_DELAY_MS before showing anything, so fast AI replies feel instant
 *     (if the callback lands within the delay, typing never appears).
 *   - Then re-send the "typing" chat action every ~4.5s (Telegram's action fades after ~5s),
 *     keeping the indicator alive until the callback arrives.
 *   - Cap the visible duration at BESALES_TYPING_MAX_MS so a missing callback (silent mode,
 *     network failure) can never hang the indicator forever.
 *
 * One loop per chat; call stopTyping(chatId) when the Besales callback is received.
 */

const DELAY_MS = Number(process.env.BESALES_TYPING_DELAY_MS) || 10_000;
const MAX_MS = Number(process.env.BESALES_TYPING_MAX_MS) || 30_000;
const REFRESH_MS = 4_500;

interface TypingHandle {
	delayTimer?: NodeJS.Timeout;
	refreshTimer?: NodeJS.Timeout;
	stopTimer?: NodeJS.Timeout;
}

const active = new Map<number, TypingHandle>();

/** Begin (or keep) the typing indicator for a chat. No-op if one is already running. */
export function startTyping(api: Api, chatId: number): void {
	if (active.has(chatId)) return;

	const handle: TypingHandle = {};
	active.set(chatId, handle);

	const sendAction = () => {
		void api.sendChatAction(chatId, "typing").catch(() => stopTyping(chatId));
	};

	handle.delayTimer = setTimeout(() => {
		sendAction();
		handle.refreshTimer = setInterval(sendAction, REFRESH_MS);
		handle.stopTimer = setTimeout(() => stopTyping(chatId), MAX_MS);
	}, DELAY_MS);
}

/** Stop the typing indicator for a chat (idempotent). */
export function stopTyping(chatId: number): void {
	const handle = active.get(chatId);
	if (!handle) return;
	if (handle.delayTimer) clearTimeout(handle.delayTimer);
	if (handle.refreshTimer) clearInterval(handle.refreshTimer);
	if (handle.stopTimer) clearTimeout(handle.stopTimer);
	active.delete(chatId);
}
