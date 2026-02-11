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
	pendingReferralCode?: string; // Store referral code until user registers with phone
}

export type MyContext = Context & SessionFlavor<Partial<ISessionData>>;

/** Broadcast audience: all, or by isVerified (verified = true, non_verified = not true) */
export type BroadcastAudience = "all" | "verified" | "non_verified";

/** Broadcast job created by admin; processed by bot */
export interface BroadcastJob {
	_id?: unknown;
	message: string;
	audience?: BroadcastAudience;
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
