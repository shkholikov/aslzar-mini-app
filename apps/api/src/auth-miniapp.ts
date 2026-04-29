import { createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config";

/**
 * Authenticated Telegram Mini App user, parsed from initData.
 * Mirrors the `user` field in WebAppInitData (https://core.telegram.org/bots/webapps#webappinitdata).
 */
export type MiniAppUser = {
	id: number;
	first_name?: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	photo_url?: string;
	is_premium?: boolean;
	allows_write_to_pm?: boolean;
};

export interface MiniAppAuthedRequest extends Request {
	miniAppUser?: MiniAppUser;
	miniAppInitData?: URLSearchParams;
}

/** Max age (24h) for initData per Telegram's recommendation. */
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/**
 * Verifies a Telegram WebApp initData payload by recomputing its HMAC against BOT_TOKEN.
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1. Parse the URL-encoded initData string into key=value pairs.
 * 2. Drop the `hash` field; sort remaining pairs alphabetically; join as "k=v\nk=v".
 * 3. Compute secret = HMAC_SHA256("WebAppData", BOT_TOKEN).
 * 4. Compute HMAC_SHA256(secret, data_check_string) — must equal the supplied hash.
 *
 * @returns parsed URLSearchParams when valid, null otherwise.
 */
export function verifyInitData(initDataRaw: string, botToken: string): URLSearchParams | null {
	if (!initDataRaw) return null;

	const params = new URLSearchParams(initDataRaw);
	const hash = params.get("hash");
	if (!hash) return null;

	// auth_date must be present and within MAX_AUTH_AGE_SECONDS
	const authDateStr = params.get("auth_date");
	if (!authDateStr) return null;
	const authDate = Number(authDateStr);
	if (!Number.isFinite(authDate)) return null;
	const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
	if (ageSeconds > MAX_AUTH_AGE_SECONDS || ageSeconds < -60) return null;

	// Build data_check_string: all pairs except `hash`, sorted, joined with \n.
	const pairs: [string, string][] = [];
	params.forEach((value, key) => {
		if (key === "hash") return;
		pairs.push([key, value]);
	});
	pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

	const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
	const computed = createHmac("sha256", secret).update(dataCheckString).digest("hex");

	if (computed !== hash) return null;

	return params;
}

/** Reads initData from `Authorization: tma <initDataRaw>` (preferred) or `?_initData=` query (fallback). */
function extractInitData(req: Request): string | null {
	const auth = req.header("authorization");
	if (auth) {
		const match = /^tma\s+(.+)$/i.exec(auth);
		if (match) return match[1].trim();
	}
	const queryInit = req.query["_initData"];
	if (typeof queryInit === "string" && queryInit.length > 0) return queryInit;
	return null;
}

/**
 * Express middleware: requires a valid Telegram WebApp initData payload.
 * Attaches `req.miniAppUser` and `req.miniAppInitData` on success.
 *
 * Use for endpoints under `/v1/*` consumed only by our own webapp.
 * External partners use `requireApiKey` instead.
 */
export function requireMiniAppAuth(req: Request, res: Response, next: NextFunction): void {
	const initDataRaw = extractInitData(req);
	if (!initDataRaw) {
		res.status(401).json({
			ok: false,
			error: { code: "missing_init_data", message: "Missing Telegram initData. Send `Authorization: tma <initDataRaw>`." }
		});
		return;
	}

	const verified = verifyInitData(initDataRaw, config.BOT_TOKEN);
	if (!verified) {
		res.status(401).json({
			ok: false,
			error: { code: "invalid_init_data", message: "initData failed signature or freshness check." }
		});
		return;
	}

	const userJson = verified.get("user");
	if (!userJson) {
		res.status(401).json({
			ok: false,
			error: { code: "invalid_init_data", message: "initData has no `user` field." }
		});
		return;
	}

	let user: MiniAppUser;
	try {
		const parsed = JSON.parse(userJson);
		if (typeof parsed?.id !== "number") throw new Error("user.id missing");
		user = parsed as MiniAppUser;
	} catch {
		res.status(401).json({
			ok: false,
			error: { code: "invalid_init_data", message: "initData `user` is not valid JSON." }
		});
		return;
	}

	(req as MiniAppAuthedRequest).miniAppUser = user;
	(req as MiniAppAuthedRequest).miniAppInitData = verified;
	next();
}
