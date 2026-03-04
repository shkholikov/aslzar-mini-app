import { Context, SessionFlavor } from "grammy";

/**
 * 1C API User Data Response
 * Typed structure based on current API response, with flexibility for future changes
 * Use Partial<I1CUserData> to make all properties optional
 */
export interface I1CUserData {
	code: number;
	message: string;
	contract: {
		active: number;
		ended: number;
		returned: number;
		ids: Array<{
			code: number;
			message: string | null;
			id: string;
			months: number;
			sum: number;
			skidka: number;
			vznos: number;
			consultant: string;
			consultantPhone: string;
			date: string;
			schedule: Array<{
				id: number;
				step: number;
				sumToPay: number;
				sumPayed: number;
				status: boolean;
				date: string;
				[key: string]: unknown;
			}>;
			pays: Array<{
				id: number;
				sum: number;
				comment: string;
				date: string;
				[key: string]: unknown;
			}>;
			goods: Array<{
				id: string;
				category: string;
				name: string;
				weight: number;
				koltso: number;
				sergi: number;
				[key: string]: unknown;
			}>;
			[key: string]: unknown;
		}>;
		[key: string]: unknown;
	};
	debt: number;
	remain: number;
	latePayment: number;
	suboffice: string | null;
	familiya: string;
	imya: string;
	otchestvo: string;
	inn: string | null;
	phone: string;
	passport: string | null;
	bonusOstatok: number;
	bonusInfo: {
		nachislenie: number;
		spisanie: number;
		nachislenieVSrok: number;
		uroven: string;
		oborot: number;
		[key: string]: unknown;
	};
	clientId: string;
	contractFirst: boolean;
	referalCount: number;
	referalLimit: number;
	/** 1C activity status: true = Aktiv, false = Aktiv emas */
	status?: boolean;
	// Allow additional fields that might be added in the future
	[key: string]: unknown;
}

export interface ISessionData {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	phone_number?: string;
	isChannelMember?: boolean;
	lastMessageId?: number;
	preparedMessageId?: string;
	createdAt: Date;
	isVerified?: boolean;
	user1CData?: Partial<I1CUserData>; // Store 1C user data in session (all properties optional)
	pendingReferralCode?: string; // Store referral code until user registers with phone (user-to-user referral)
	pendingEmployeeReferralCode?: string; // Store employee referral code (e.g. emp5) until user shares contact
	referredByEmployeeCode?: string; // Set once when user joins via employee link
}

export type MyContext = Context & SessionFlavor<Partial<ISessionData>>;

/** Broadcast audience: legacy single-select (old jobs) */
export type BroadcastAudience = "all" | "verified" | "non_verified";

/** Broadcast filters: when none set, all users; when any set, AND them. Level filters (Silver/Gold/Diamond) are ORed. */
export interface BroadcastAudienceFilters {
	verified?: boolean;
	nonVerified?: boolean;
	aktiv?: boolean;
	aktivEmas?: boolean;
	silver?: boolean;
	gold?: boolean;
	diamond?: boolean;
}

/** Broadcast job created by admin; processed by bot */
export interface BroadcastJob {
	_id?: unknown;
	message: string;
	audience?: BroadcastAudience;
	audienceFilters?: BroadcastAudienceFilters;
	status: "pending" | "processing" | "completed" | "failed" | "cancelled";
	createdAt: Date;
	completedAt?: Date;
	totalUsers?: number;
	sentCount?: number;
	failedCount?: number;
	error?: string;
}

/** Log entry when a payment reminder is sent (or failed) to a user */
export interface ReminderLogEntry {
	telegramUserId: string;
	sentAt: Date;
	status: "sent" | "failed";
	messageText: string;
	paymentCount: number;
	contractIds: string[];
	paymentDates: string[];
	telegramMessageId?: number;
	error?: string;
	source: "cron" | "test";
	/** YYYY-MM-DD in Tashkent; used for idempotency (one reminder per user per day for cron) */
	reminderDate?: string;
}

/** Channel post stored when bot receives a channel_post from the configured channel */
export interface ChannelPostDocument {
	messageId: number;
	chatId: number;
	channelUsername: string;
	date: Date;
	text: string;
	/** Telegram file_id for photo (largest size) */
	photoFileId?: string;
	/** From getFile; used to build URL: https://api.telegram.org/file/bot<token>/<path> */
	photoFilePath?: string;
	videoFileId?: string;
	videoFilePath?: string;
	createdAt: Date;
}
