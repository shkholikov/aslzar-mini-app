import "./config";
import { createHmac, timingSafeEqual } from "crypto";
import type { MyContext } from "./types";

/**
 * Besales external AI dialog API client (apps/bot only).
 *
 * Two directions, two shared secrets (both issued by Besales):
 *   - Bot  -> Besales (inbound):  Authorization: Bearer <BESALES_API_KEY>
 *   - Besales -> Bot (callback):  HMAC-SHA256 of the raw body, header X-Besales-Webhook-Signature
 *
 * Success convention mirrors api.ts: functions never throw into grammY handlers;
 * on any failure they log and return the failure value.
 */

const INBOUND_URL = process.env.BESALES_INBOUND_URL || "";
const API_KEY = process.env.BESALES_API_KEY || "";
const WEBHOOK_SECRET = process.env.BESALES_WEBHOOK_SECRET || "";

/** Master switch. Only the exact string "true" enables Besales — unset/empty/"1"/"TRUE" all mean off. */
export const besalesEnabled = process.env.BESALES_ENABLED === "true";

// --- Types (Besales external API v2, camelCase) ---

export interface BesalesContact {
	firstName?: string;
	lastName?: string;
	username?: string;
	phone?: string;
	email?: string;
	languageCode?: string;
}

export interface BesalesMedia {
	type: "image" | "voice" | "audio" | "video" | "document" | string;
	url: string;
	mimeType?: string;
	fileName?: string;
	caption?: string;
}

/** Bot -> Besales (§3.2 InboundMessage) */
export interface BesalesInbound {
	externalUserId: string; // required, stable opaque id (= Telegram user id)
	externalMessageId: string; // required, unique per contact -> idempotency
	externalChatId?: string; // defaults to externalUserId
	text?: string;
	sourceChannel?: "telegram" | string;
	buttonPayload?: string;
	contact?: BesalesContact;
	media?: BesalesMedia[];
	metadata?: Record<string, unknown>;
	timestamp?: number; // unix seconds
}

export interface BesalesButton {
	label: string;
	value: string;
}

/** One outbound message from Besales; long AI answers are split into several. */
export interface BesalesOutboundMessage {
	text?: string;
	buttons?: BesalesButton[][]; // rows x buttons
	media?: BesalesMedia[];
}

/** Besales -> Bot callback body (§4.1). One endpoint serves reply + followup. */
export interface BesalesWebhookPayload {
	id: string; // delivery id -> idempotency on our side
	event: "message.reply" | "message.followup";
	workspaceId?: string;
	channelId?: string;
	createdAt?: string;
	data: {
		externalUserId: string;
		externalChatId?: string;
		requestId?: string; // present for reply, absent for followup
		messages: BesalesOutboundMessage[];
	};
}

/**
 * Map a grammY context to Besales contact attributes (best-effort; omit unknowns).
 * Names prefer verified 1C data, then fall back to the Telegram profile.
 * languageCode is not persisted in the session — read it live from ctx.from.
 * Returns undefined when nothing useful is available.
 */
export function buildContact(ctx: MyContext): BesalesContact | undefined {
	const s = ctx.session ?? {};
	const oneC = s.user1CData;

	const firstName = oneC?.imya || ctx.from?.first_name || undefined;
	const lastName = oneC?.familiya || ctx.from?.last_name || undefined;
	const username = ctx.from?.username || undefined;
	const phone = s.phone_number ? (s.phone_number.startsWith("+") ? s.phone_number : `+${s.phone_number}`) : undefined;
	const languageCode = ctx.from?.language_code || undefined;

	const contact: BesalesContact = { firstName, lastName, username, phone, languageCode };

	// Drop undefined keys; return undefined if everything is empty.
	const cleaned = Object.fromEntries(Object.entries(contact).filter(([, v]) => v !== undefined)) as BesalesContact;
	return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Forward an inbound message to Besales. Fire-and-forget from the caller's view:
 * never throws (safe inside grammY handlers), just logs on failure.
 */
export async function sendInbound(msg: BesalesInbound): Promise<void> {
	try {
		if (!INBOUND_URL || !API_KEY) {
			console.error("[besales] inbound not configured (BESALES_INBOUND_URL / BESALES_API_KEY missing)");
			return;
		}

		const response = await fetch(INBOUND_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${API_KEY}`
			},
			body: JSON.stringify(msg)
		});

		if (response.status === 202) {
			const body = (await response.json().catch(() => ({}))) as { requestId?: string };
			console.log(`[besales] inbound queued externalMessageId=${msg.externalMessageId} requestId=${body.requestId ?? "?"}`);
			return;
		}
		if (response.status === 200) {
			// Duplicate externalMessageId — idempotently ignored by Besales.
			console.log(`[besales] inbound duplicate ignored externalMessageId=${msg.externalMessageId}`);
			return;
		}
		if (response.status === 429) {
			const retryAfter = response.headers.get("Retry-After");
			console.warn(`[besales] inbound rate-limited (429), Retry-After=${retryAfter ?? "?"} — dropping externalMessageId=${msg.externalMessageId}`);
			return;
		}

		const text = await response.text().catch(() => "");
		console.error(`[besales] inbound failed status=${response.status} externalMessageId=${msg.externalMessageId} body=${text.slice(0, 300)}`);
	} catch (error) {
		console.error("[besales] inbound request error:", error);
	}
}

/**
 * Verify a callback's HMAC signature against the raw request body (§4.2).
 * header may be "sha256=<hex>". Constant-time comparison; false on any mismatch/missing config.
 */
export function verifyWebhookSignature(rawBody: Buffer, header: string | undefined): boolean {
	if (!WEBHOOK_SECRET || !header) return false;

	const provided = header.startsWith("sha256=") ? header.slice("sha256=".length) : header;
	const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

	const providedBuf = Buffer.from(provided, "hex");
	const expectedBuf = Buffer.from(expected, "hex");

	// timingSafeEqual throws on length mismatch — guard first.
	if (providedBuf.length !== expectedBuf.length) return false;
	return timingSafeEqual(providedBuf, expectedBuf);
}
