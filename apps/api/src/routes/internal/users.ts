import type { Response } from "express";
import { z } from "zod";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { getUserSession, updateUserSession1CData } from "../../db";
import { OneCError, createUser, searchUserByPhone } from "../../integrations/aslzar1c";

const ONE_HOUR_MS = 60 * 60 * 1000;

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

	const tgSessionData = await getUserSession(userId);
	if (!tgSessionData?.phone_number) {
		res.status(404).json({ error: "User not found or phone number not available" });
		return;
	}

	const rawUpdatedAt = tgSessionData.user1CDataUpdatedAt;
	const updatedAt = rawUpdatedAt instanceof Date ? rawUpdatedAt : rawUpdatedAt ? new Date((rawUpdatedAt as { $date: string }).$date) : null;
	const isStale = !updatedAt || Date.now() - updatedAt.getTime() > ONE_HOUR_MS;

	if (!isStale && tgSessionData.user1CData) {
		res.status(200).json({ ...tgSessionData.user1CData, tgData: tgSessionData });
		return;
	}

	try {
		const data = await searchUserByPhone(tgSessionData.phone_number);
		if (data?.code === 0) {
			await updateUserSession1CData(userId, data, true);
		}
		res.status(200).json({ ...data, tgData: tgSessionData });
	} catch (err) {
		console.error("[users/me] 1C search failed", err);
		if (err instanceof OneCError) {
			res.status(502).json({ error: "Failed to search user in 1C API", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
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
