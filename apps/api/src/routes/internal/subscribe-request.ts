import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { config } from "../../config";

const SUBSCRIBE_TEXT = `Iltimos, *ASLZAR💎* Rasmiy telegram kanaliga a'zo bo'ling\\.

✅ A'zo bo'lgach, "🔎 A'zolikni tekshirish" tugmasini bosing\\.
`;

/**
 * POST /v1/subscribe-request
 *
 * Sends the channel-subscribe nudge message to the caller via the bot.
 * Same behaviour as the previous webapp `/api/send-subscribe-request`.
 */
export async function sendSubscribeRequestHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const userId = req.miniAppUser!.id;
	const replyMarkup = {
		inline_keyboard: [
			[{ text: "ASLZAR💎 kanaliga a'zo bo'lish", url: "https://t.me/ASLZAR_tilla" }],
			[{ text: "🔎 A'zolikni tekshirish", callback_data: "check_subscription" }]
		]
	};

	try {
		await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: userId,
				text: SUBSCRIBE_TEXT,
				parse_mode: "MarkdownV2",
				reply_markup: replyMarkup
			})
		});
		res.status(200).json({ sent: true });
	} catch (err) {
		console.error("[subscribe-request] send failed", err);
		res.status(500).json({ error: "Internal server error" });
	}
}
