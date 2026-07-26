import { MongoClient, ObjectId, type Db, type Collection } from "mongodb";
import { DEFAULT_REFERRAL_LIMIT, config } from "./config";

export type ApiKeyDoc = {
	_id: ObjectId;
	keyHash: string;
	name: string;
	createdAt: Date;
	lastUsedAt?: Date;
	disabled?: boolean;
};

/**
 * Shape of a grammY MongoDBAdapter session doc.
 * The bot owns writes to this collection. The API:
 *   - reads `key`, `value.phone_number`, `value.id`, `value.first_name`, etc.
 *   - writes only `value.user1CData`, `value.user1CDataUpdatedAt`, `value.isVerified`,
 *     `value.isChannelMember` — fields that mirror state already in the user-facing flow.
 */
export type UserSessionDoc = {
	_id: ObjectId;
	key: string;
	/**
	 * Referral cap for this user, managed by apps/admin. Absent/null → DEFAULT_REFERRAL_LIMIT.
	 * Top-level on purpose: the bot's grammY adapter rewrites `value` wholesale on every
	 * interaction, so an admin-owned field inside it could be clobbered.
	 */
	referralLimit?: number | null;
	referralLimitUpdatedBy?: string;
	referralLimitUpdatedAt?: Date;
	value: {
		id?: number;
		phone_number?: string;
		first_name?: string;
		last_name?: string;
		username?: string;
		isVerified?: boolean;
		isChannelMember?: boolean;
		user1CData?: Record<string, unknown>;
		user1CDataUpdatedAt?: Date | { $date: string };
	};
};

export type ProductDoc = {
	_id?: ObjectId;
	title: string;
	description: string;
	price?: number;
	url?: string;
	imageUrl?: string;
	badgeLabel?: string;
	createdAt?: Date;
};

export type NewsItemDoc = {
	_id?: ObjectId;
	title: string;
	description: string;
	mediaUrl?: string;
	mediaType?: "photo" | "video";
	buttonText?: string;
	buttonUrl?: string;
	isActive?: boolean;
	createdAt: Date;
};

export type SuggestionDoc = {
	_id?: ObjectId;
	text: string;
	userId?: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	createdAt: Date;
};

export type Sync1CJobStatus = "processing" | "completed" | "failed";

export type Sync1CJobDoc = {
	_id?: ObjectId;
	status: Sync1CJobStatus;
	triggeredBy: "cron" | "admin";
	createdAt: Date;
	startedAt: Date;
	completedAt?: Date;
	totalUsers?: number;
	/** Snapshot at sync end: how many users in the DB now have value.user1CData set. */
	usersWith1CDataCount?: number;
	syncedCount?: number;
	errorCount?: number;
	error?: string;
};

export type ApiCallStatus = "sent" | "user_not_registered" | "telegram_error" | "rate_limited" | "invalid_request";

export type ApiCallDoc = {
	_id?: ObjectId;
	apiKeyId: string;
	apiKeyName: string;
	phone: string;
	chatId?: number;
	status: ApiCallStatus;
	errorCode?: string;
	telegramMessageId?: number;
	createdAt: Date;
};

let client: MongoClient | undefined;
let apiKeysIndexEnsured = false;
let apiCallsIndexEnsured = false;

async function getClient(): Promise<MongoClient> {
	if (!client) {
		client = new MongoClient(config.MONGO_DB_CONNECTION_STRING);
		await client.connect();
	}
	return client;
}

export async function getDb(): Promise<Db> {
	const c = await getClient();
	return c.db(config.MONGO_DB_NAME);
}

export async function getApiKeysCollection(): Promise<Collection<ApiKeyDoc>> {
	const db = await getDb();
	const col = db.collection<ApiKeyDoc>(config.MONGO_DB_COLLECTION_API_KEYS);
	if (!apiKeysIndexEnsured) {
		await col.createIndex({ keyHash: 1 }, { unique: true });
		apiKeysIndexEnsured = true;
	}
	return col;
}

/**
 * Read-only access to the bot's users collection.
 * Do NOT create an index on `value.phone_number` from here — the bot owns writes
 * to this collection and silent schema changes would surprise it. If lookups get slow,
 * add the index via an admin script.
 */
export async function getUsersCollection(): Promise<Collection<UserSessionDoc>> {
	const db = await getDb();
	return db.collection<UserSessionDoc>(config.MONGO_DB_COLLECTION_USERS);
}

/**
 * Finds a user's Telegram ID by phone number.
 * @param phone Digits-only phone (e.g. "998957770000") — the exact format the bot
 *              writes to `value.phone_number` (see apps/bot/src/bot.ts:105, which
 *              normalizes incoming contact.phone_number via `replace(/\D/g, "")`).
 *              No normalization happens here; the caller must pass digits only.
 * @returns Telegram user ID (number), or null if no user has that phone.
 */
export async function findTelegramIdByPhone(phone: string): Promise<number | null> {
	const col = await getUsersCollection();
	const doc = await col.findOne({ "value.phone_number": phone });
	if (!doc?.value) return null;
	const id = doc.value.id ?? Number(doc.key);
	return Number.isFinite(id) ? id : null;
}

// Platform-wide referral default, set on the admin Referal page. Cached in-process because
// /v1/users/me is a hot path; the window matches the 1C cache TTL so both refresh together.
const REFERRAL_SETTINGS_TTL_MS = 60 * 1000;
let referralDefaultCache: { value: number; fetchedAt: number } | null = null;

/**
 * Default referral limit for users without an individual one.
 * Falls back to DEFAULT_REFERRAL_LIMIT when nothing has been configured or the read fails —
 * a settings lookup must never break a user-facing request.
 */
export async function getDefaultReferralLimit(): Promise<number> {
	if (referralDefaultCache && Date.now() - referralDefaultCache.fetchedAt < REFERRAL_SETTINGS_TTL_MS) {
		return referralDefaultCache.value;
	}

	try {
		const db = await getDb();
		const doc = await db.collection(config.MONGO_DB_COLLECTION_SETTINGS).findOne({ _id: "referral" as never });
		const limit = (doc as { defaultReferralLimit?: unknown } | null)?.defaultReferralLimit;
		const value = typeof limit === "number" ? limit : DEFAULT_REFERRAL_LIMIT;
		referralDefaultCache = { value, fetchedAt: Date.now() };
		return value;
	} catch (err) {
		console.error("[settings] failed to read referral default, using fallback", err);
		return DEFAULT_REFERRAL_LIMIT;
	}
}

/** Reads the whole user document by Telegram ID — use when a top-level field (e.g. `referralLimit`) is needed. */
export async function getUserSessionDoc(userId: string): Promise<UserSessionDoc | null> {
	const col = await getUsersCollection();
	return col.findOne({ key: userId });
}

/** Reads a user session by Telegram ID (session key). */
export async function getUserSession(userId: string): Promise<UserSessionDoc["value"] | null> {
	const doc = await getUserSessionDoc(userId);
	return doc?.value ?? null;
}

/** Mirrors apps/webapp/lib/db.ts:updateUserSession1CData behaviour. */
export async function updateUserSession1CData(userId: string, user1CData: Record<string, unknown>, isVerified: boolean): Promise<boolean> {
	const col = await getUsersCollection();
	const result = await col.updateOne(
		{ key: userId },
		{
			$set: {
				"value.user1CData": user1CData,
				"value.isVerified": isVerified,
				"value.user1CDataUpdatedAt": new Date()
			}
		}
	);
	return result.matchedCount > 0;
}

/** Mirrors apps/webapp/lib/db.ts:updateUserChannelMember behaviour. */
export async function updateUserChannelMember(userId: string, isChannelMember: boolean): Promise<boolean> {
	const col = await getUsersCollection();
	const result = await col.updateOne({ key: userId }, { $set: { "value.isChannelMember": isChannelMember } });
	return result.matchedCount > 0;
}

export async function getProductsCollection(): Promise<Collection<ProductDoc>> {
	const db = await getDb();
	return db.collection<ProductDoc>(config.MONGO_DB_COLLECTION_PRODUCTS);
}

export async function getNewsCollection(): Promise<Collection<NewsItemDoc>> {
	const db = await getDb();
	return db.collection<NewsItemDoc>(config.MONGO_DB_COLLECTION_NEWS);
}

export async function getSuggestionsCollection(): Promise<Collection<SuggestionDoc>> {
	const db = await getDb();
	return db.collection<SuggestionDoc>(config.MONGO_DB_COLLECTION_SUGGESTIONS);
}

export async function getApiCallsCollection(): Promise<Collection<ApiCallDoc>> {
	const db = await getDb();
	const col = db.collection<ApiCallDoc>(config.MONGO_DB_COLLECTION_API_CALLS);
	if (!apiCallsIndexEnsured) {
		await col.createIndex({ apiKeyId: 1, createdAt: -1 });
		await col.createIndex({ phone: 1, createdAt: -1 });
		apiCallsIndexEnsured = true;
	}
	return col;
}

export async function getSync1CJobsCollection(): Promise<Collection<Sync1CJobDoc>> {
	const db = await getDb();
	return db.collection<Sync1CJobDoc>(config.MONGO_DB_COLLECTION_SYNC_1C_JOBS);
}

export async function closeDb(): Promise<void> {
	if (client) {
		await client.close();
		client = undefined;
		apiKeysIndexEnsured = false;
		apiCallsIndexEnsured = false;
	}
}
