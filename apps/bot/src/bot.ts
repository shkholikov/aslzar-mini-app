import "./config";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { connectToDb, users, channelPosts } from "./db";
import { MyContext } from "./types";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { handleEmployeeReferralCode, handleReferralCode, initializeSession, sendWebApp } from "./helper";
import { searchUserByPhone } from "./api";
import { startPaymentReminderScheduler } from "./scheduler";
import { startBroadcastScheduler } from "./broadcast";

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
			const fresh1C = await searchUserByPhone(ctx.session.phone_number);
			if (fresh1C) {
				ctx.session.user1CData = fresh1C;
				ctx.session.isVerified = true;
			}
			await sendWebApp(ctx, rawCode ?? undefined);
		}
	});

	// on receiving contact
	bot.on(":contact", async (ctx) => {
		const contact = ctx.message?.contact;
		if (!contact) return;

		// Save normalized phone (digits only, without +) to session
		const rawPhone = contact.phone_number ?? "";
		const normalizedPhone = rawPhone.replace(/\D/g, "");
		ctx.session.phone_number = normalizedPhone;

		// Load 1C user data once when phone is received
		const user1CData = await searchUserByPhone(normalizedPhone);
		if (user1CData) {
			ctx.session.user1CData = user1CData;
			ctx.session.isVerified = true;
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
	});

	// Store group messages for the webapp "Yangiliklar" section.
	// grammY: chatType() filters by chat type so only group/supergroup messages reach this handler.
	// @see https://grammy.dev/ref/core/composer#method_chattype
	const GROUP_ID = process.env.CHANNEL_ID; // group id (e.g. -1001234567890) or @username
	bot.chatType(["group", "supergroup"]).on("message", async (ctx) => {
		if (!GROUP_ID || !channelPosts) return;
		const chat = ctx.chat;
		const envGroupId = GROUP_ID.trim();
		const isMatch = envGroupId.startsWith("@") ? "username" in chat && chat.username === envGroupId.slice(1) : String(chat.id) === envGroupId;
		if (!isMatch) return;

		const msg = ctx.message;
		const text = msg.text ?? msg.caption ?? "";
		const groupLabel = ("username" in chat && chat.username ? `@${chat.username}` : null) ?? ("title" in chat ? chat.title : null) ?? "group";

		const doc: import("./types").ChannelPostDocument = {
			messageId: msg.message_id,
			chatId: chat.id,
			channelUsername: groupLabel,
			date: new Date(msg.date * 1000),
			text,
			createdAt: new Date()
		};

		// Try to resolve file paths for media, but don't fail the whole insert if this breaks
		try {
			if (msg.photo && msg.photo.length > 0) {
				const largest = msg.photo[msg.photo.length - 1];
				doc.photoFileId = largest.file_id;
				try {
					const file = await ctx.api.getFile(largest.file_id);
					if (file.file_path) doc.photoFilePath = file.file_path;
				} catch (mediaErr) {
					// E.g. Bad Request: file is too big — we still keep file_id and store the post
					console.error("[group message] Failed to get photo file path:", mediaErr);
				}
			}
			if (msg.video) {
				doc.videoFileId = msg.video.file_id;
				// Only use the video thumbnail as preview image (small, safe to fetch).
				// We do NOT fetch or store the actual video file.
				const thumb = (msg.video as any).thumbnail ?? (msg.video as any).thumb;
				if (thumb && !doc.photoFileId) {
					doc.photoFileId = thumb.file_id;
					try {
						const thumbFile = await ctx.api.getFile(thumb.file_id);
						if (thumbFile.file_path) doc.photoFilePath = thumbFile.file_path;
					} catch (thumbErr) {
						console.error("[group message] Failed to get video thumbnail file path:", thumbErr);
					}
				}
			}
		} catch (err) {
			// Should be very rare; log but continue to insert the post
			console.error("[group message] Unexpected error while resolving media paths:", err);
		}

		try {
			await channelPosts.insertOne(doc);
		} catch (err) {
			console.error("[group message] Failed to insert post into DB:", err);
		}
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

	// Start the bot
	bot.start();
}

bootstrap();
