import type { Request, Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { config } from "../../config";
import { getDefaultReferralLimit, getUserSessionDoc } from "../../db";
import { OneCError, listReferrals } from "../../integrations/aslzar1c";

/**
 * GET /v1/referrals?clientId=<1c-client-id>
 *
 * Proxies 1C `listReferals` for the authenticated user. The clientId comes from
 * the previously fetched 1C user data; we don't try to derive it here.
 */
export async function listReferralsHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const clientId = String(req.query.clientId ?? "").trim();
	if (!clientId) {
		res.status(400).json({ error: "clientId parameter is required" });
		return;
	}
	try {
		const data = await listReferrals(clientId);
		res.status(200).json(data);
	} catch (err) {
		console.error("[referrals] 1C call failed", err);
		if (err instanceof OneCError) {
			res.status(502).json({ error: "Failed to fetch user referrals from 1C API", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}

/**
 * GET /v1/users/:key/referrals  (API key auth — used by the admin app, not by partners)
 *
 * Resolves the user's 1C `clientId` from their stored session and proxies 1C `listReferals`,
 * so apps/admin never has to hold 1C credentials.
 */
export async function listUserReferralsHandler(req: Request, res: Response): Promise<void> {
	const key = String(req.params.key ?? "").trim();
	if (!key) {
		res.status(400).json({ error: "key parameter is required" });
		return;
	}

	const userDoc = await getUserSessionDoc(key);
	if (!userDoc) {
		res.status(404).json({ error: "User not found" });
		return;
	}

	const clientId = (userDoc.value?.user1CData as { clientId?: unknown } | undefined)?.clientId;
	if (typeof clientId !== "string" || !clientId) {
		// Not an error: the user simply isn't in 1C yet, so they cannot have referrals.
		res.status(200).json({ list: [] });
		return;
	}

	try {
		const data = await listReferrals(clientId);
		res.status(200).json(data);
	} catch (err) {
		console.error("[referrals] 1C call failed (admin)", err);
		if (err instanceof OneCError) {
			res.status(502).json({ error: "Failed to fetch user referrals from 1C API", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}

/**
 * POST /v1/referrals/link
 *
 * Calls Telegram `savePreparedInlineMessage` to mint a sharable referral message
 * for the authenticated user. Returns `{ preparedMessageId }`. Same shape as before.
 */
export async function createReferralLinkHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const userId = req.miniAppUser!.id;

	// Refuse to mint a sharable message once the user is at their referral cap, so the miniapp's
	// hidden share UI can't simply be called around. The cached `referalCount` is good enough here —
	// the bot re-checks live against 1C before it actually attributes a referral.
	const userDoc = await getUserSessionDoc(String(userId));
	const limit = userDoc?.referralLimit ?? (await getDefaultReferralLimit());
	const used = Number((userDoc?.value?.user1CData as { referalCount?: unknown } | undefined)?.referalCount ?? 0);
	if (Number.isFinite(used) && used >= limit) {
		res.status(403).json({ error: "referral_limit_reached" });
		return;
	}

	const referralLink = `${config.BOT_TELEGRAM_LINK}?start=${userId}`;

	const inlineResult = {
		type: "article",
		id: `referral-${userId}`,
		title: "ASLZAR💎 Referral",
		description: "Do‘stlaringizni taklif qiling va bonusga ega bo'ling!",
		input_message_content: {
			message_text: "ASLZAR💎 platformasiga qo‘shiling\\!\n\n🔗 Mening taklif havolam orqali ro‘yxatdan o‘tishingiz mumkin:",
			parse_mode: "MarkdownV2"
		},
		reply_markup: {
			inline_keyboard: [[{ text: "ASLZAR💎", url: referralLink }]]
		}
	};

	try {
		const response = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/savePreparedInlineMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				user_id: userId,
				result: inlineResult,
				allow_user_chats: true,
				allow_bot_chats: true,
				allow_group_chats: true,
				allow_channel_chats: true
			})
		});
		const data = (await response.json()) as { ok?: boolean; description?: string; result?: { id: string } };
		if (!data.ok || !data.result?.id) {
			console.error("[referrals/link] Telegram error", data);
			res.status(502).json({ error: data.description ?? "Telegram rejected the prepared message" });
			return;
		}
		res.status(200).json({ preparedMessageId: data.result.id });
	} catch (err) {
		console.error("[referrals/link] threw", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
}
