import { config } from "dotenv";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { connectToDb, users } from "./db";
import { MyContext } from "./types";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { initializeSession } from "./helper";

config();

// Get bot token and webapp url from environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://aslzar.uz"; // fallback

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

		// Check if user exists (has phone number in session/database)
		if (ctx.session?.phone_number) {
			// User exists - send webapp URL directly
			const infoText =
				"*ASLZAR* — Sizning sodiqlik va zamonaviy to'lovlar markazingiz.\n\n" +
				"Tez, xavfsiz va ishonchli to'lovlar, doimiy keshbek va maxsus takliflar aynan shu platformada.\n\n" +
				"*Platformada:*\n" +
				"• Qulay interfeys va tez ro'yxatdan o'tish;\n" +
				"• Avtomatik keshbek va sodiqlik bonusi;\n" +
				"• Yuqori darajadagi ma'lumot xavfsizligi;\n" +
				"• 24/7 yordam xizmati.\n\n" +
				"ASLZAR imkoniyatlaridan foydalanish uchun pastdagi tugmadan foydalaning:";

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
				}
			});
		} else {
			// Initialize session data
			initializeSession(ctx);

			// User doesn't exist - ask for contact
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
		}
	});

	bot.on(":contact", async (ctx) => {
		const contact = ctx.message?.contact;
		if (!contact) return;

		// Save contact to session
		ctx.session.phone_number = contact.phone_number;

		const infoText =
			"*ASLZAR* — Sizning sodiqlik va zamonaviy to'lovlar markazingiz.\n\n" +
			"Tez, xavfsiz va ishonchli to'lovlar, doimiy keshbek va maxsus takliflar aynan shu platformada.\n\n" +
			"*Platformada:*\n" +
			"• Qulay interfeys va tez ro'yxatdan o'tish;\n" +
			"• Avtomatik keshbek va sodiqlik bonusi;\n" +
			"• Yuqori darajadagi ma'lumot xavfsizligi;\n" +
			"• 24/7 yordam xizmati.\n\n" +
			"ASLZAR imkoniyatlaridan foydalanish uchun pastdagi tugmadan foydalaning:";

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
			}
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
