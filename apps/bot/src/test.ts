import { config } from "dotenv";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { connectToDb, users } from "./db";
import { MyContext } from "./types";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { infoText } from "./messages";

config();

// Get bot token and webapp url from environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://aslzar.uz"; // fallback
const CHANNEL_ID = process.env.CHANNEL_ID || 0;

if (!BOT_TOKEN) {
	throw new Error("BOT_TOKEN environment variable is required!");
}

const bot = new Bot<MyContext>(BOT_TOKEN);

async function bootstrap() {
	// Connects to DB
	await connectToDb();

	// Install middlewares here
	bot.use(
		session({
			initial: () => ({
				id: undefined,
				username: undefined,
				first_name: undefined,
				last_name: undefined,
				phone_number: undefined,
				isChannelMember: undefined,
				createdAt: new Date()
			}),
			getSessionKey: (ctx) => {
				// Use user ID as session key
				return ctx.from?.id.toString();
			},
			storage: new MongoDBAdapter({ collection: users })
		})
	);

	bot.command("start", async (ctx) => {
		const name = ctx.from?.first_name || "Hurmatli mijoz";
		const greetingText = `*Assalomu alaykum, ${name}\\! 👋*\n\n*ASLZAR💎* Telegram botiga xush kelibsiz\\.\n\nIltimos, bizning rasmiy kanalimizga a'zo bo'ling\\.`;

		if (!ctx.session.isChannelMember) {
			await ctx.reply(greetingText, {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "ASLZAR💎 kanaliga a'zo bo'lish",
								url: "https://t.me/ASLZAR_tilla"
							}
						],
						[
							{
								text: "🔎 A'zolikni tekshirish",
								callback_data: "check_subscription"
							}
						]
					]
				},
				parse_mode: "MarkdownV2"
			});
		} else if (!ctx.session.phone_number) {
			// User doesn't exist - ask for contact
			await ctx.reply(
				"Iltimos, o'zingizni tasdiqlash uchun telefon raqamingizni yuboring\\.\n\nTelefon raqamingizni yuborish uchun pastdagi tugmani bosing\\.",
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
					},
					parse_mode: "MarkdownV2"
				}
			);
		} else {
			await ctx.reply(infoText, {
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
	});

	bot.callbackQuery("check_subscription", async (ctx) => {
		try {
			const chatMember = await ctx.api.getChatMember(CHANNEL_ID, ctx.from.id);
			const status = chatMember.status;
			const isSubscribed = ["member", "administrator", "creator"].includes(status);

			if (isSubscribed) {
				ctx.session.isChannelMember = true;
				if (!ctx.session.phone_number) {
					await ctx.reply(
						"Iltimos, o'zingizni tasdiqlash uchun telefon raqamingizni yuboring\\.\n\nTelefon raqamingizni yuborish uchun pastdagi tugmani bosing\\.",
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
							},
							parse_mode: "MarkdownV2"
						}
					);
				} else {
					await ctx.reply(infoText, {
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
				await ctx.answerCallbackQuery({ text: "✅ Rahmat! Siz kanal a'zosisiz." });
				await ctx.reply("ASLZAR ilovasini ochish uchun quyidagi tugmani bosing:", {
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "🚀 ASLZAR💎 ilovasini ochish",
									web_app: { url: WEBAPP_URL }
								}
							]
						]
					}
				});
			} else {
				await ctx.answerCallbackQuery({ text: "❌ Siz hali a'zo emassiz!" });
				await ctx.reply("Iltimos, kanalga a'zo bo'ling:", {
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "🔗 ASLZAR💎 kanaliga a'zo bo'lish",
									url: "https://t.me/ASLZAR_tilla"
								}
							],
							[{ text: "✅ Qayta tekshirish", callback_data: "check_subscription" }]
						]
					}
				});
			}
		} catch (error) {
			console.error("Error checking subscription:", error);
			await ctx.answerCallbackQuery({ text: "⚠️ Tekshiruvda xatolik yuz berdi" });
		}
	});

	bot.on(":contact", async (ctx) => {
		const contact = ctx.message?.contact;
		if (!contact) return;

		// Save contact to session
		ctx.session.phone_number = contact.phone_number;

		await ctx.reply(infoText, {
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
	});

	// Error Handler
	bot.catch((err) => {
		const ctx = err.ctx;
		console.error(`Error while handling update ${ctx.update.update_id}:`);
		const e = err.error;
		if (e instanceof GrammyError) {
			console.error("Error in request:", e.description);
		} else if (e instanceof HttpError) {
			console.error("Could not contact Telegram:", e);
		} else {
			console.error("Unknown error:", e);
		}
	});

	// Start the bot
	bot.start();
}

bootstrap();
