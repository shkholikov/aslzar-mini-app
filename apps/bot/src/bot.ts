import { config } from "dotenv";
import { Bot } from "grammy";

config();

// Get bot token and webapp url from environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://aslzar.uz"; // fallback

if (!BOT_TOKEN) {
	throw new Error("BOT_TOKEN environment variable is required!");
}

const bot = new Bot(BOT_TOKEN);



bot.command("start", async (ctx) => {
	const name = ctx.from?.first_name || "Hurmatli mijoz";
	await ctx.reply(
		`Assalomu alaykum, ${name}! 👋\nASLZAR Telegram botiga xush kelibsiz.\nIltimos, o'zingizni tasdiqlash uchun telefon raqamingizni yuboring.\nTelefon raqamingizni yuborish uchun quyidagi tugmani bosing.`,
		{
			reply_markup: {
				keyboard: [
					[
						{
							text: "📱 Telefon raqamni ulashish",
							request_contact: true
						}
					]
				],
				resize_keyboard: true,
				one_time_keyboard: true
			}
		}
	);
});

bot.on(":contact", async (ctx) => {
	const contact = ctx.message?.contact;
	if (!contact) return;

	const miniAppUrl = "https://aslzar-mini-app-webapp.vercel.app/";
	const infoText =
		"*ASLZAR* — Sizning sodiqlik va zamonaviy to‘lovlar markazingiz.\n\n" +
		"Tez, xavfsiz va ishonchli to‘lovlar, doimiy keshbek va maxsus takliflar aynan shu platformada.\n\n" +
		"*Platformada:*\n" +
		"• Qulay interfeys va tez ro‘yxatdan o‘tish;\n" +
		"• Avtomatik keshbek va sodiqlik bonusi;\n" +
		"• Yuqori darajadagi ma’lumot xavfsizligi;\n" +
		"• 24/7 yordam xizmati.\n\n" +
		"ASLZAR imkoniyatlaridan foydalanish uchun pastdagi tugmadan foydalaning:";

	await ctx.reply(infoText, {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "ASLZAR💎 ilovasini ochish",
						web_app: {
							url: miniAppUrl
						}
					}
				]
			]
		}
	});
});

// Start the bot.
bot.start();
