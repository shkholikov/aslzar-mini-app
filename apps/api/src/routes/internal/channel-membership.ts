import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { config } from "../../config";
import { updateUserChannelMember } from "../../db";

/**
 * GET /v1/channel-membership
 *
 * Calls Telegram `getChatMember` for CHANNEL_ID + caller's id, persists the result
 * onto the session so the admin panel column stays in sync. Same shape as before:
 *   { isMember: boolean }
 */
export async function getChannelMembershipHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const userId = String(req.miniAppUser!.id);
	try {
		const url = `https://api.telegram.org/bot${config.BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(config.CHANNEL_ID)}&user_id=${userId}`;
		const tgRes = await fetch(url);
		const data = (await tgRes.json()) as { ok?: boolean; result?: { status?: string } };

		if (!data.ok || !data.result) {
			res.status(200).json({ isMember: false });
			return;
		}

		const isMember = ["creator", "administrator", "member"].includes(data.result.status ?? "");

		updateUserChannelMember(userId, isMember).catch((err) => {
			console.error("[channel-membership] persist failed", err);
		});

		res.status(200).json({ isMember });
	} catch (err) {
		console.error("[channel-membership] check failed", err);
		res.status(500).json({ error: "Internal server error" });
	}
}
