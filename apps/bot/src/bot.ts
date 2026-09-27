import "./config";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { besalesDeliveries, connectToDb, users } from "./db";
import { MyContext } from "./types";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { handleEmployeeReferralCode, handleReferralCode, initializeSession, sendWebApp } from "./helper";
import { searchUserByPhone } from "./api";
import { startPaymentReminderScheduler } from "./scheduler";
import { startBroadcastScheduler } from "./broadcast";
import { besalesEnabled, buildContact, sendInbound, startReferral } from "./besales";
import { startBesalesCallbackServer } from "./callback-server";
import { startTyping } from "./besales-typing";
import { ownContactOnlyText } from "./messages";

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
				user1CData: undefined,
				pendingReferralCode: undefined,
				pendingEmployeeReferralCode: undefined,
				referredByEmployeeCode: undefined
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
		// - Numeric: user referral (/start 6764272076)
		// - Employee: /start emp5, emp123, ...
		const rawMatch = ctx.match as string | undefined;
		const rawCode = rawMatch?.trim();
		const normalizedEmployeeCode = rawCode?.toLowerCase();
		const isEmployeeCode = normalizedEmployeeCode ? /^emp\d+$/.test(normalizedEmployeeCode) : false;

		if (rawCode) {
			if (isEmployeeCode && normalizedEmployeeCode) {
				// Employee referral:
				// Option A – only new users (no phone yet) can be attached to employees.
				// Returning users with an existing phone_number are ignored for employee referrals.
				if (!ctx.session?.phone_number) {
					// Will be processed after contact is shared
					ctx.session.pendingEmployeeReferralCode = normalizedEmployeeCode;
				}
			} else if (ctx.session?.phone_number) {
				// User referral – process immediately if already has phone
				await handleReferralCode(ctx, rawCode);
			} else {
				// User referral – store until phone verification
				ctx.session.pendingReferralCode = rawCode;
			}
		}

		if (!ctx.session?.phone_number) {
			initializeSession(ctx);
			await sendWebApp(ctx, rawCode ?? undefined);
		} else {
			const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
			const updatedAt = ctx.session.user1CDataUpdatedAt;
			const isStale = !updatedAt || Date.now() - new Date(updatedAt).getTime() > TWENTY_FOUR_HOURS;
			if (isStale) {
				const fresh1C = await searchUserByPhone(ctx.session.phone_number);
				if (fresh1C) {
					ctx.session.user1CData = fresh1C;
					ctx.session.isVerified = true;
					ctx.session.user1CDataUpdatedAt = new Date();
				}
			}
			await sendWebApp(ctx, rawCode ?? undefined);
		}

		// Tell Besales someone pressed Start, and through which kind of link, so the agent can write
		// first to people a client invited. A copy only: the referral itself is stored above and
		// decided later in the :contact handler, exactly as before. Our welcome has already gone out,
		// and sendInbound never throws, so Besales being slow or down can't affect /start.
		if (besalesEnabled) {
			void sendInbound({
				externalUserId: String(ctx.from?.id),
				externalChatId: String(ctx.chat.id),
				externalMessageId: `start:${ctx.message?.message_id}`,
				sourceChannel: "telegram",
				text: "/start",
				contact: buildContact(ctx),
				metadata: { event: "start", ...startReferral(rawCode) },
				timestamp: ctx.message?.date
			});
		}
	});

	// on receiving contact
	bot.on(":contact", async (ctx) => {
		const contact = ctx.message?.contact;
		if (!contact) return;

		// Only the sender's own number. Telegram sets `user_id` to the sender when they share their
		// own contact — through a request_contact button and through the Mini App's requestContact()
		// alike. A card picked from the phone book carries someone else's user_id, or none. Without
		// this check, sending another person's contact made the sender "verified" as that 1C client:
		// their contracts, bonus balance, and a bonus QR signed with their clientId.
		if (!contact.user_id || contact.user_id !== ctx.from?.id) {
			console.warn(`[contact] rejected a contact that is not the sender's own (from ${ctx.from?.id})`);
			await ctx.reply(ownContactOnlyText);
			return;
		}

		// Save normalized phone (digits only, without +) to session
		const rawPhone = contact.phone_number ?? "";
		const normalizedPhone = rawPhone.replace(/\D/g, "");
		ctx.session.phone_number = normalizedPhone;

		// Load 1C user data once when phone is received
		const user1CData = await searchUserByPhone(normalizedPhone);
		if (user1CData) {
			ctx.session.user1CData = user1CData;
			ctx.session.isVerified = true;
			ctx.session.user1CDataUpdatedAt = new Date();
		}

		// Process pending user referral (numeric code) if exists (after phone verification)
		if (ctx.session.pendingReferralCode) {
			await handleReferralCode(ctx, ctx.session.pendingReferralCode);
			// Clear the pending referral code after processing
			ctx.session.pendingReferralCode = undefined;
		}

		// Process pending employee referral (empN code) if exists (after phone verification)
		if (ctx.session.pendingEmployeeReferralCode) {
			await handleEmployeeReferralCode(ctx, ctx.session.pendingEmployeeReferralCode);
			ctx.session.pendingEmployeeReferralCode = undefined;
		}

		// No reply: contact was shared from webapp; user continues in webapp

		// If the Besales agent asked for this number (its "share phone" button, see
		// besales-delivery.ts), hand it back so the agent can carry on. Only then: a Mini App
		// registration leaves no marker and reports nothing. The marker is consumed, so this fires
		// once per request. foundIn1C tells the agent whether this is an existing client or a new
		// person who still has to register in the Mini App to become one.
		if (besalesEnabled && ctx.from && ctx.chat) {
			const requested = await besalesDeliveries
				.findOneAndDelete({
					_id: `contact-requested:${ctx.from.id}`,
					createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
				})
				.catch((e) => {
					console.error(`[besales] contact-request lookup failed for ${ctx.from?.id}:`, e);
					return null;
				});
			if (requested) {
				startTyping(ctx.api, ctx.chat.id);
				void sendInbound({
					externalUserId: String(ctx.from.id),
					externalChatId: String(ctx.chat.id),
					externalMessageId: `contact:${ctx.message?.message_id}`,
					sourceChannel: "telegram",
					contact: buildContact(ctx),
					metadata: { event: "contact_shared", foundIn1C: Boolean(ctx.session.user1CData) },
					timestamp: ctx.message?.date
				});
			}
		}
	});

	// AI fallback: any free text not consumed by the flows above goes to Besales.
	// Registered after start/contact so known flows always win (fallback semantics).
	bot.on("message:text", async (ctx) => {
		if (!besalesEnabled) return;
		if (ctx.message.text.startsWith("/")) return; // defensive: unknown commands stay silent
		startTyping(ctx.api, ctx.chat.id);
		await sendInbound({
			externalUserId: String(ctx.from.id),
			externalMessageId: String(ctx.message.message_id),
			externalChatId: String(ctx.chat.id),
			sourceChannel: "telegram",
			text: ctx.message.text,
			contact: buildContact(ctx),
			timestamp: ctx.message.date
		});
	});

	// AI button taps. The bot has no inline buttons of its own today; if any are added later,
	// namespace their callback_data (e.g. "app:") and early-return here so they aren't forwarded.
	bot.on("callback_query:data", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {}); // always clear the client spinner first
		if (!besalesEnabled) return;
		const chatId = ctx.chat?.id ?? ctx.from.id;
		startTyping(ctx.api, chatId);
		const data = ctx.callbackQuery.data;
		const label = ctx.callbackQuery.message?.reply_markup?.inline_keyboard
			?.flat()
			.find((b) => "callback_data" in b && b.callback_data === data)?.text;
		await sendInbound({
			externalUserId: String(ctx.from.id),
			externalMessageId: `cbq:${ctx.callbackQuery.id}`,
			externalChatId: String(chatId),
			sourceChannel: "telegram",
			buttonPayload: data,
			text: label,
			contact: buildContact(ctx)
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

	// Payment reminder: daily at 10:00 Tashkent; logs to reminder_logs
	startPaymentReminderScheduler(bot.api);

	// Broadcast: process pending jobs from admin every minute
	startBroadcastScheduler(bot.api);

	// Besales AI callback receiver (no-op unless BESALES_ENABLED=true). Must start before bot.start().
	startBesalesCallbackServer(bot.api);

	// Start the bot
	bot.start();
}

bootstrap();
