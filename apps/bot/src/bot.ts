import { config } from "dotenv";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { connectToDb, users } from "./db";
import { MyContext } from "./types";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { initializeSession } from "./helper";
import { infoText } from "./messages";

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
		} else {
			// Initialize session data
			initializeSession(ctx);

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
					resize_keyboard: true,
					one_time_keyboard: true
				},
				parse_mode: "MarkdownV2"
			});
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
