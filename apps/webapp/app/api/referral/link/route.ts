import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const BOT_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// /api/referral/link
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json({ error: "userId is required" }, { status: 400 });
		}

		const referralLink = `https://t.me/aslzardevbot?start=${userId}`;

		// Build InlineQueryResultArticle
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
				inline_keyboard: [
					[
						{
							text: "ASLZAR💎",
							url: referralLink
						}
					]
				]
			}
		};

		// Call Telegram Bot API
		const response = await fetch(`${BOT_API}/savePreparedInlineMessage`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				user_id: Number(userId),
				result: inlineResult,
				allow_user_chats: true,
				allow_bot_chats: true,
				allow_group_chats: true,
				allow_channel_chats: true
			})
		});

		const data = await response.json();

		if (!data.ok) {
			console.error("Telegram API error:", data);
			return NextResponse.json({ error: data.description }, { status: 500 });
		}

		const preparedMessageId = data.result.id;

		return NextResponse.json({ preparedMessageId });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
