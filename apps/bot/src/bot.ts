import { config } from "dotenv";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { connectToDb, users } from "./db";
import { MyContext } from "./types";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { checkSubscriptionFlow, initializeSession, sendContactRequest, sendSubscribeRequest, sendWebApp } from "./helper";
import { searchUserByPhone } from "./api";

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
				preparedMessageId: undefined,
				createdAt: new Date(),
				isVerified: undefined,
				user1CData: undefined
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
		// Check if there's a referral code in the start parameter
		// Format: /start 6764272076
		const referralCode = ctx.match as string | undefined;

		if (referralCode) {
			// Handle referral code
			console.log(ctx.match);
			console.log(ctx.session.isVerified);
		}

		if (!ctx.session?.phone_number) {
			// user doesn't exist in a database
			initializeSession(ctx);
			// Request a contact
			await sendContactRequest(ctx);
			// User exists - send webapp URL directly
		} else if (!ctx.session.isChannelMember) {
			// send subscribe request
			await sendSubscribeRequest(ctx);
		} else {
			await sendWebApp(ctx);
		}
	});

	// on receiving contact
	bot.on(":contact", async (ctx) => {
		const contact = ctx.message?.contact;
		if (!contact) return;

		// Save contact to session
		ctx.session.phone_number = contact.phone_number;

		// Load 1C user data once when phone is received
		const user1CData = await searchUserByPhone(contact.phone_number);
		if (user1CData) {
			ctx.session.user1CData = user1CData;
			ctx.session.isVerified = true;
		}

		// Remove the contact request button
		await ctx.reply("✅ Telefon raqamingiz qabul qilindi!", {
			reply_markup: { remove_keyboard: true }
		});

		// send subscribe request
		await sendSubscribeRequest(ctx);
	});

	// on check_subscription callback
	bot.callbackQuery("check_subscription", async (ctx) => {
		await checkSubscriptionFlow(ctx);
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
