import { config } from "../config";

/**
 * Besales AI agent — inbound direction only (API -> Besales).
 *
 * Used by the catalogue "Bu buyum haqida so'rash" button. The agent's answer comes back through
 * Besales' callback to the bot (apps/bot/src/callback-server.ts), which delivers it into the user's
 * chat — so this side never receives anything.
 *
 * Ported from apps/bot/src/besales.ts (sendInbound). One deliberate difference: it returns a result
 * instead of fire-and-forget, because here a person is waiting on a button and must be told when
 * the question did not go through. Keep the two in step if the Besales contract changes.
 */

export interface BesalesContact {
	firstName?: string;
	lastName?: string;
	username?: string;
	phone?: string;
	languageCode?: string;
}

/** API -> Besales (§3.2 InboundMessage). */
export interface BesalesInbound {
	externalUserId: string; // Telegram user id — also the chat Besales replies into
	externalMessageId: string; // unique per contact; Besales dedupes on it
	externalChatId?: string;
	text?: string;
	sourceChannel?: "telegram";
	contact?: BesalesContact;
	metadata?: Record<string, unknown>;
	timestamp?: number; // unix seconds
}

export function besalesConfigured(): boolean {
	return config.BESALES_ENABLED && Boolean(config.BESALES_INBOUND_URL && config.BESALES_API_KEY);
}

const TIMEOUT_MS = 8000;

/**
 * Sends one inbound message. Never throws.
 * 202 = queued, 200 = duplicate externalMessageId (already accepted) — both count as delivered.
 */
export async function sendInbound(msg: BesalesInbound): Promise<{ ok: boolean; status?: number }> {
	if (!besalesConfigured()) return { ok: false };

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(config.BESALES_INBOUND_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${config.BESALES_API_KEY}`
			},
			body: JSON.stringify(msg),
			signal: controller.signal
		});

		if (res.status === 202 || res.status === 200) {
			console.log(`[besales] inbound ${res.status === 202 ? "queued" : "duplicate"} externalMessageId=${msg.externalMessageId}`);
			return { ok: true, status: res.status };
		}

		const body = await res.text().catch(() => "");
		console.error(`[besales] inbound failed status=${res.status} externalMessageId=${msg.externalMessageId} body=${body.slice(0, 300)}`);
		return { ok: false, status: res.status };
	} catch (err) {
		console.error(`[besales] inbound request error externalMessageId=${msg.externalMessageId}:`, err);
		return { ok: false };
	} finally {
		clearTimeout(timer);
	}
}
