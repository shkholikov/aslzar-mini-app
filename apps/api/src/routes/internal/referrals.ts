import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { config } from "../../config";
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
 * POST /v1/referrals/link
 *
 * Calls Telegram `savePreparedInlineMessage` to mint a sharable referral message
 * for the authenticated user. Returns `{ preparedMessageId }`. Same shape as before.
 */
export async function createReferralLinkHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const userId = req.miniAppUser!.id;
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
