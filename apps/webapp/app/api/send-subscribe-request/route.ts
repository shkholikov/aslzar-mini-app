import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN;

// Same as bot's sendSubscribeRequest (messages.subscribeRequestText + keyboard)
const SUBSCRIBE_TEXT = `Iltimos, *ASLZAR💎* Rasmiy telegram kanaliga a'zo bo'ling\\.

✅ A'zo bo'lgach, "🔎 A'zolikni tekshirish" tugmasini bosing\\.
`;

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const userId = body?.userId;
		if (!userId) {
			return NextResponse.json({ error: "userId is required" }, { status: 400 });
		}
		if (!BOT_TOKEN) {
			return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
		}

		const replyMarkup = {
			inline_keyboard: [
				[{ text: "ASLZAR💎 kanaliga a'zo bo'lish", url: "https://t.me/ASLZAR_tilla" }],
				[{ text: "🔎 A'zolikni tekshirish", callback_data: "check_subscription" }]
			]
		};

		await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: userId,
				text: SUBSCRIBE_TEXT,
				parse_mode: "MarkdownV2",
				reply_markup: replyMarkup
			})
		});

		return NextResponse.json({ sent: true }, { status: 200 });
	} catch (error) {
		console.error("Error sending subscribe request:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
