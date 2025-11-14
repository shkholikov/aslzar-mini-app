import { config } from "dotenv";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { connectToDb, users } from "./db";
import { MyContext } from "./types";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { checkSubscriptionFlow, initializeSession, sendContactRequest, sendSubscribeRequest, sendWebApp } from "./helper";

config();

// Get bot token and webapp url from environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;

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
				lastMessageId: undefined,
				createdAt: new Date()
			}),
			getSessionKey: (ctx) => {
				// Use user ID as session key
				return ctx.from?.id.toString();
			},
			storage: new MongoDBAdapter({ collection: users })
		})
	);

	// start command
	bot.command("start", async (ctx) => {
		console.log(ctx.session);

		if (!ctx.session?.phone_number) {
			// user doesn't exist in a database
			initializeSession(ctx);
			// Request a contact
			sendContactRequest(ctx);
			// User exists - send webapp URL directly
		} else if (!ctx.session.isChannelMember) {
			// send subscribe request
			sendSubscribeRequest(ctx);
		} else {
			sendWebApp(ctx);
		}
	});

	// on receiving contact
	bot.on(":contact", async (ctx) => {
		const contact = ctx.message?.contact;
		if (!contact) return;

		// Save contact to session
		ctx.session.phone_number = contact.phone_number;

		// send subscribe request
		sendSubscribeRequest(ctx);
	});

	// on check_subscription callback
	bot.callbackQuery("check_subscription", async (ctx) => {
		checkSubscriptionFlow(ctx);
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
