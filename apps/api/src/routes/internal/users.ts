import type { Response } from "express";
import { z } from "zod";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { buildBonusToken } from "../../bonus-token";
import { config } from "../../config";
import { getDefaultReferralLimit, getUserSessionDoc, updateUserSession1CData } from "../../db";
import { OneCError, createUser, searchUserByPhone } from "../../integrations/aslzar1c";

// bonusOstatok changes in 1C at any time, so keep the cache window short.
// Past the window we still answer from Mongo and refresh 1C in the background
// (see refreshOneCInBackground) — the miniapp renders instantly on every open
// and picks up the new balance on the next one.
const CACHE_TTL_MS = 60 * 1000;

// Guards against a burst of requests from the same user each firing their own
// 1C call. Only the first stale hit schedules a refresh; the rest ride along.
const refreshesInFlight = new Set<string>();

/**
 * Re-fetches 1C data and mirrors it onto the session without blocking the response.
 * Failures are logged and swallowed: the caller already has cached data, and a
 * transient 1C outage must not turn into an unhandled rejection.
 */
function refreshOneCInBackground(userId: string, phone: string): void {
	if (refreshesInFlight.has(userId)) return;
	refreshesInFlight.add(userId);

	void (async () => {
		try {
			const data = await searchUserByPhone(phone);
			if (data?.code === 0) {
				await updateUserSession1CData(userId, data, true);
			}
		} catch (err) {
			console.error("[users/me] background 1C refresh failed", err);
		} finally {
			refreshesInFlight.delete(userId);
		}
	})();
}

/**
 * GET /v1/users/me
 *
 * Reads the caller's session from Mongo (caller identified by initData),
 * returns cached 1C data if it's still fresh, otherwise re-fetches from 1C
 * and updates the session. Mirrors the previous webapp /api/users GET shape.
 */
export async function getMeHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const user = req.miniAppUser!;
	const userId = String(user.id);

	const userDoc = await getUserSessionDoc(userId);
	const tgSessionData = userDoc?.value ?? null;
	if (!tgSessionData?.phone_number) {
		res.status(404).json({ error: "User not found or phone number not available" });
		return;
	}

	// Our own referral cap (1C's `referalLimit` is intentionally ignored). Resolved here so the
	// miniapp never has to know the default. The used count travels with the 1C data (`referalCount`).
	const referralLimit = userDoc?.referralLimit ?? (await getDefaultReferralLimit());

	const rawUpdatedAt = tgSessionData.user1CDataUpdatedAt;
	const updatedAt = rawUpdatedAt instanceof Date ? rawUpdatedAt : rawUpdatedAt ? new Date((rawUpdatedAt as { $date: string }).$date) : null;
	const isStale = !updatedAt || Date.now() - updatedAt.getTime() > CACHE_TTL_MS;

	// Stale-while-revalidate: any cached copy is served immediately. Blocking on 1C here
	// meant every launch past the 60s window waited a full round-trip before the profile
	// could render, so the stats grid and verification badge appeared late on each open.
	if (tgSessionData.user1CData) {
		if (isStale) refreshOneCInBackground(userId, tgSessionData.phone_number);
		// Minted per request and never stored — the QR is only good for 5 minutes, so a shared
		// screenshot expires before anyone can spend against it. Placed after the spread so a
		// future 1C field of the same name can't shadow it.
		const bonusToken = buildBonusToken((tgSessionData.user1CData as { clientId?: unknown }).clientId, config.BONUS_TOKEN_SECRET);
		res.status(200).json({ ...tgSessionData.user1CData, referralLimit, bonusToken, tgData: tgSessionData });
		return;
	}

	// Nothing cached yet (first open after phone verification) — 1C is the only source.
	try {
		const data = await searchUserByPhone(tgSessionData.phone_number);
		if (data?.code === 0) {
			await updateUserSession1CData(userId, data, true);
		}
		// `data.code !== 0` (user unknown to 1C) carries no clientId, so this correctly yields null.
		const bonusToken = buildBonusToken((data as { clientId?: unknown } | null)?.clientId, config.BONUS_TOKEN_SECRET);
		res.status(200).json({ ...data, referralLimit, bonusToken, tgData: tgSessionData });
	} catch (err) {
		console.error("[users/me] 1C search failed", err);
		if (err instanceof OneCError) {
			res.status(502).json({ error: "Failed to search user in 1C API", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}

/**
 * GET /v1/users/me/bonus-token
 *
 * Mints a fresh QR token for the caller and nothing else.
 *
 * Deliberately separate from /v1/users/me. The card renews every few minutes, and routing
 * that through the full profile endpoint cost us twice: on the client every screen bound to
 * user data re-rendered, and on the server each renewal found the 60s cache stale and
 * scheduled another background 1C fetch. This reads one Mongo document and signs it.
 */
export async function getBonusTokenHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const userId = String(req.miniAppUser!.id);

	const userDoc = await getUserSessionDoc(userId);
	const clientId = (userDoc?.value?.user1CData as { clientId?: unknown } | undefined)?.clientId;
	const token = buildBonusToken(clientId, config.BONUS_TOKEN_SECRET);

	if (!token) {
		// No 1C record yet, or no signing key configured. The card treats this the same as a
		// failed renewal and shows its reconnect state rather than a code the till would reject.
		res.status(404).json({ error: "No bonus token available for this user" });
		return;
	}

	res.status(200).json({ token });
}

const RegisterSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	phone: z.string().min(7)
});

/**
 * POST /v1/users/register
 *
 * Calls 1C CreateUser, then re-fetches via search and stores the result on
 * the caller's session so the bot (reminders, referrals) sees them as verified.
 */
export async function registerHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const parsed = RegisterSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
		return;
	}
	const { firstName, lastName, phone } = parsed.data;
	const userId = String(req.miniAppUser!.id);

	try {
		const created = await createUser({ phone, familiya: lastName, imya: firstName });

		// Best-effort follow-up: get full 1C data and mirror onto session.
		try {
			const searchData = (await searchUserByPhone(phone)) as { code?: number };
			if (searchData?.code === 0) {
				await updateUserSession1CData(userId, searchData as Record<string, unknown>, true);
			}
		} catch (followupErr) {
			console.warn("[users/register] post-create search failed (non-fatal)", followupErr);
		}

		res.status(200).json(created);
	} catch (err) {
		console.error("[users/register] CreateUser failed", err);
		if (err instanceof OneCError) {
			res.status(502).json({ error: "Failed to create user in 1C API", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}
