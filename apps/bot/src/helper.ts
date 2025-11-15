import { infoText, subscribeRequestText } from "./messages";
import { MyContext } from "./types";

const WEBAPP_URL = process.env.WEBAPP_URL || "https://aslzar.uz";
const CHANNEL_ID = process.env.CHANNEL_ID || "@ASLZAR_tilla";

export function initializeSession(ctx: MyContext): void {
	if (!ctx.from) return;

	ctx.session.id = ctx.from.id;
	ctx.session.username = ctx.from.username;
	ctx.session.first_name = ctx.from.first_name;
	ctx.session.last_name = ctx.from.last_name;
}

export async function sendContactRequest(ctx: MyContext) {
	const name = ctx.from?.first_name || "Hurmatli mijoz";
	const greetingText = `*Assalomu alaykum, ${name}\\! 👋*\n\n*ASLZAR💎* Telegram botiga xush kelibsiz\\.\n\nIltimos, o'zingizni tasdiqlash uchun telefon raqamingizni yuboring\\.\n\nTelefon raqamingizni yuborish uchun pastdagi tugmani bosing\\.`;

	// User doesn't exist - ask for contact
	await ctx.reply(greetingText, {
		reply_markup: {
			keyboard: [
				[
					{
						text: "📱 Telefon raqamni ulashish",
						request_contact: true
					}
				]
			],
			one_time_keyboard: true
		},
		parse_mode: "MarkdownV2"
	});
}

export async function sendSubscribeRequest(ctx: MyContext) {
	await ctx.reply(subscribeRequestText, {
		reply_markup: {
			remove_keyboard: true,
			inline_keyboard: [
				[
					{
						text: "ASLZAR💎 kanaliga a'zo bo'lish",
						url: "https://t.me/ASLZAR_tilla"
					}
				],
				[
					{
						text: "🔎 A’zolikni tekshirish",
						callback_data: "check_subscription"
					}
				]
			]
		},
		parse_mode: "MarkdownV2"
	});
}

export async function sendWebApp(ctx: MyContext) {
	await ctx.reply(infoText, {
		reply_markup: {
			remove_keyboard: true,
			inline_keyboard: [
				[
					{
						text: "ASLZAR💎 ilovasini ochish",
						web_app: {
							url: WEBAPP_URL
						}
					}
				]
			]
		},
		parse_mode: "MarkdownV2"
	});
}

export async function checkSubscriptionFlow(ctx: MyContext) {
	const userId = ctx.from?.id;
	if (!userId) return;

	try {
		const member = await ctx.api.getChatMember(CHANNEL_ID, userId);
		const isSubscribed = ["member", "administrator", "creator"].includes(member.status);

		if (isSubscribed) {
			ctx.session.isChannelMember = true;
			await ctx.answerCallbackQuery({ show_alert: true, text: "✅ A'zolik tasdiqlandi!" });

			const chatId = ctx.callbackQuery!.message?.chat.id;
			const msgId = ctx.callbackQuery!.message?.message_id;

			if (chatId && msgId) {
				await ctx.api.editMessageText(chatId, msgId, infoText, {
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "ASLZAR💎 ilovasini ochish",
									web_app: {
										url: WEBAPP_URL
									}
								}
							]
						]
					},
					parse_mode: "MarkdownV2"
				});
			}
		} else {
			ctx.session.isChannelMember = false;
			await ctx.answerCallbackQuery({ show_alert: true, text: "❌ Siz hali a'zo emassiz!" });
		}
	} catch (e) {
		console.error("Error checking subscription:", e);
	}
}

export async function prepareReferralMessage(ctx: MyContext) {
	const userId = ctx.from?.id;
	if (!userId) return;

	// Already generated? Do NOT regenerate.
	if (ctx.session.preparedMessageId) {
		return ctx.session.preparedMessageId;
	}

	const referralLink = `https://t.me/aslzardevbot?start=${userId}`;

	const result = await ctx.api.savePreparedInlineMessage(userId, {
		type: "article",
		id: "referral-" + userId,
		title: "Referral Link",
		input_message_content: {
			message_text: `🔥 ASLZAR platformasiga qo‘shiling!\n\nBu mening referral havolam:\n${referralLink}`,
			parse_mode: "HTML"
		},
		description: "Do‘stingizni taklif qiling"
	});

	ctx.session.preparedMessageId = result.id;

	return result.id;
}
