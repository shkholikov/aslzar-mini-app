import { InlineKeyboard } from "grammy";
import { infoText, referralAddedText } from "./messages";
import { I1CUserData, ISessionData, MyContext } from "./types";
import { users, employees } from "./db";
import { addReferral } from "./api";

const WEBAPP_URL = process.env.WEBAPP_URL || "https://app.aslzarbot.uz";
const BOT_TELEGRAM_LINK = process.env.BOT_TELEGRAM_LINK || "https://t.me/aslzardevbot";

/**
 * ASLZAR mijozi check — same source of truth as the admin dashboard's "Xarid qilgan":
 * 1C sets contractFirst=true once the user has made at least one purchase.
 */
export function isAslzarCustomer(user1CData: Partial<I1CUserData> | undefined): boolean {
	return user1CData?.contractFirst === true;
}

/** Escapes user-provided text for Telegram MarkdownV2. */
function escapeMarkdownV2(text: string): string {
	return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

export function initializeSession(ctx: MyContext): void {
	if (!ctx.from) return;

	ctx.session.id = ctx.from.id;
	ctx.session.username = ctx.from.username;
	ctx.session.first_name = ctx.from.first_name;
	ctx.session.last_name = ctx.from.last_name;
}

export async function sendWebApp(ctx: MyContext, ref?: string) {
	const url = ref ? `${WEBAPP_URL}${WEBAPP_URL.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}` : WEBAPP_URL;
	await ctx.reply(infoText, {
		reply_markup: new InlineKeyboard().webApp("ASLZAR💎 ilovasini ochish", url),
		parse_mode: "MarkdownV2"
	});
}

export async function prepareReferralMessage(ctx: MyContext) {
	const userId = ctx.from?.id;
	if (!userId) return;

	// Already generated? Do NOT regenerate.
	if (ctx.session.preparedMessageId) {
		return ctx.session.preparedMessageId;
	}

	const referralLink = `${BOT_TELEGRAM_LINK}?start=${userId}`;

	const result = await ctx.api.savePreparedInlineMessage(
		userId,
		{
			type: "article",
			id: "referral-" + userId,
			title: "ASLZAR💎 Referral",
			input_message_content: {
				message_text: `ASLZAR💎 platformasiga qo‘shiling\\!\n\n🔗Mening taklif havolam orqali ro‘yxatdan o‘tishingiz mumkin:`,
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
			},
			description: "Do‘stlaringizni taklif qiling va bonusga ega bo'ling!"
		},
		{ allow_user_chats: true, allow_bot_chats: true, allow_group_chats: true, allow_channel_chats: true }
	);

	ctx.session.preparedMessageId = result.id;

	return result.id;
}

/**
 * Handles referral code when a user joins via referral link
 * @param ctx - Bot context (the person who opened the referral link)
 * @param referralCode - The referral code (Telegram user ID of the referrer)
 */
export async function handleReferralCode(ctx: MyContext, referralCode: string) {
	const currentUserId = ctx.from?.id;
	if (!currentUserId) return;

	// Check if user has provided phone number (required for referral)
	if (!ctx.session?.phone_number) {
		console.log(`User ${currentUserId} hasn't provided phone number yet`);
		return;
	}

	// Parse referral code as number (Telegram user ID)
	const referrerId = parseInt(referralCode, 10);

	// Validate referral code
	if (isNaN(referrerId) || referrerId <= 0) {
		console.log(`Invalid referral code: ${referralCode}`);
		return;
	}

	// Don't allow self-referral
	if (referrerId === currentUserId) {
		console.log(`User ${currentUserId} tried to refer themselves`);
		return;
	}

	// The invited user must NOT already be an ASLZAR customer — only new
	// (non-purchased) people can be added as referrals. Their 1C data is fresh
	// here: loaded on :contact / refreshed on stale /start before this call.
	if (isAslzarCustomer(ctx.session.user1CData)) {
		console.log(`User ${currentUserId} is already an ASLZAR customer, skipping referral`);
		return;
	}

	try {
		// Get referrer's session data from database
		const referrerSession = await users.findOne({ key: referrerId.toString() });
		if (!referrerSession?.value) {
			console.log(`Referrer ${referrerId} not found in database`);
			return;
		}

		// Access user1CData from session (type assertion needed for MongoDB document)
		const referrerSessionData = referrerSession.value as Partial<ISessionData>;
		const referrer1CData = referrerSessionData.user1CData;
		if (!referrer1CData?.clientId) {
			console.log(`Referrer ${referrerId} doesn't have clientId in 1C data`);
			return;
		}

		// The referral program is only for ASLZAR customers — the inviter must have purchased
		if (!isAslzarCustomer(referrer1CData)) {
			console.log(`Referrer ${referrerId} is not an ASLZAR customer (contractFirst !== true), skipping referral`);
			return;
		}

		// Get referred user's phone number, first name, and last name
		const referredUserPhone = ctx.session.phone_number;
		const referredUserFirstName = ctx.from?.first_name || ctx.session.first_name || "";
		const referredUserLastName = ctx.from?.last_name || ctx.session.last_name || "";

		// Add referral to 1C
		const success = await addReferral(referrer1CData.clientId, referredUserPhone, referredUserFirstName, referredUserLastName);
		if (success) {
			console.log(`Referral registered: User ${referredUserPhone} was referred by ${referrerId}`);

			// Notify the inviter (must never fail the flow — e.g. inviter blocked the bot)
			try {
				const invitedName = escapeMarkdownV2(`${referredUserFirstName} ${referredUserLastName}`.trim() || "Yangi mijoz");
				await ctx.api.sendMessage(referrerId, referralAddedText.replace("{name}", invitedName), {
					parse_mode: "MarkdownV2"
				});
			} catch (notifyError) {
				console.error(`Failed to notify referrer ${referrerId}:`, notifyError);
			}
		} else {
			console.error(`Failed to register referral for user ${referredUserPhone}`);
		}
	} catch (error) {
		console.error("Error handling referral code:", error);
	}
}

/**
 * Handles employee referral code (empN) when a user joins via employee's link/QR.
 * Validates that the employee exists, then stores referredByEmployeeCode on the user document once.
 */
export async function handleEmployeeReferralCode(ctx: MyContext, employeeCode: string) {
	const currentUserId = ctx.from?.id;
	if (!currentUserId) return;

	const normalizedCode = employeeCode.toLowerCase();

	// Require phone number so we only attribute real clients
	if (!ctx.session?.phone_number) {
		console.log(`User ${currentUserId} hasn't provided phone number yet (employee referral)`);
		return;
	}

	try {
		const employee = await employees.findOne({ referralCode: normalizedCode });
		if (!employee) {
			console.log(`Employee not found for code: ${normalizedCode}`);
			return;
		}

		const key = currentUserId.toString();

		// Only set referral if user does not already have an employee assigned
		const result = await users.updateOne(
			{
				key,
				$or: [{ "value.referredByEmployeeCode": { $exists: false } }, { "value.referredByEmployeeCode": null }]
			},
			{ $set: { "value.referredByEmployeeCode": normalizedCode } }
		);

		if (result.matchedCount === 0) {
			console.log(`User ${key} already has an employee referral, skipping (${normalizedCode})`);
			return;
		}

		ctx.session.referredByEmployeeCode = normalizedCode;
		console.log(`Employee referral registered: User ${key} was referred by employee ${normalizedCode}`);
	} catch (error) {
		console.error("Error handling employee referral code:", error);
	}
}
