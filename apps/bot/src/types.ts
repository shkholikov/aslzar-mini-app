import { Context, SessionFlavor } from "grammy";

/**
 * Contract state as reported by 1C on each `contract.ids[]` entry.
 * `closed` and `returned` contracts carry no further payment obligation, even when 1C
 * leaves their installment schedule populated. See `isActiveContract` in helper.ts.
 */
export type ContractStatus = "active" | "closed" | "returned";

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
			/** Contract state. Absent on responses from 1C versions before 2026-08-29. */
			status?: ContractStatus;
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
	/** Whether the user visited in the current month */
	lastVisit: boolean;
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
	user1CData?: Partial<I1CUserData>;
	user1CDataUpdatedAt?: Date;
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
	lastVisit?: boolean; // user1CData.lastVisit === true
	lastVisitNo?: boolean; // user1CData.lastVisit === false
	contractFirst?: boolean; // user1CData.contractFirst === true
	contractFirstNo?: boolean; // user1CData.contractFirst === false
}

/** Single media attachment (photo or video URL stored in R2) */
export interface BroadcastMedia {
	url: string;
	type: "photo" | "video";
}

/** Broadcast job created by admin; processed by bot */
export interface BroadcastJob {
	_id?: unknown;
	message: string;
	/** @deprecated Legacy single-media field. New jobs use `media`. Read both for backward compat. */
	mediaUrl?: string;
	/** @deprecated Legacy single-media field. New jobs use `media`. Read both for backward compat. */
	mediaType?: "photo" | "video";
	/** Up to 5 attachments. When length >= 2 the bot sends a media group (no inline button supported). */
	media?: BroadcastMedia[];
	buttonText?: string;
	buttonUrl?: string;
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
