import { MongoClient, ObjectId, type Db, type Collection } from "mongodb";
import { config } from "./config";

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

/**
 * AI sales chat — one active document per Telegram user.
 *
 * `recentMessages` keeps the last ~10 turns verbatim for re-feeding to the model.
 * Older turns are folded into `summary` + `extractedFacts` by an async summarizer.
 * The full history is what the user sees in the UI; the model only ever sees
 * `summary + extractedFacts + recentMessages` (so prompt size stays bounded).
 */
export type ChatRole = "user" | "assistant" | "tool";

export type ChatToolCall = {
	id: string;
	name: "recommend_products" | "create_lead";
	input: Record<string, unknown>;
	output?: Record<string, unknown>;
};

export type ChatMessage = {
	id: string;
	role: ChatRole;
	content: string;
	toolCalls?: ChatToolCall[];
	createdAt: Date;
};

export type ChatExtractedFacts = {
	interestedProducts: string[];
	budget?: string;
	objections: string[];
	readiness: "cold" | "warm" | "hot";
	preferredContactTime?: string;
};

export type ChatSessionDoc = {
	_id?: ObjectId;
	telegramId: string;
	status: "active" | "archived";
	language: "uz" | "ru";
	summary: string;
	recentMessages: ChatMessage[];
	allMessages: ChatMessage[];
	extractedFacts: ChatExtractedFacts;
	leadStatus: "none" | "created";
	amoLeadId?: number;
	dailyCount: number;
	dailyResetAt: Date;
	hourlyCount: number;
	hourlyResetAt: Date;
	createdAt: Date;
	updatedAt: Date;
	archivedAt?: Date;
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
let chatSessionsIndexEnsured = false;
let chatArchivesIndexEnsured = false;

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

/** Reads a user session by Telegram ID (session key). */
export async function getUserSession(userId: string): Promise<UserSessionDoc["value"] | null> {
	const col = await getUsersCollection();
	const doc = await col.findOne({ key: userId });
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

export async function getChatSessionsCollection(): Promise<Collection<ChatSessionDoc>> {
	const db = await getDb();
	const col = db.collection<ChatSessionDoc>(config.MONGO_DB_COLLECTION_CHAT_SESSIONS);
	if (!chatSessionsIndexEnsured) {
		// Only one active session per user; archived sessions are stored separately.
		await col.createIndex({ telegramId: 1, status: 1 });
		await col.createIndex({ updatedAt: -1 });
		chatSessionsIndexEnsured = true;
	}
	return col;
}

export async function getChatArchivesCollection(): Promise<Collection<ChatSessionDoc>> {
	const db = await getDb();
	const col = db.collection<ChatSessionDoc>(config.MONGO_DB_COLLECTION_CHAT_ARCHIVES);
	if (!chatArchivesIndexEnsured) {
		await col.createIndex({ telegramId: 1, archivedAt: -1 });
		chatArchivesIndexEnsured = true;
	}
	return col;
}

export async function closeDb(): Promise<void> {
	if (client) {
		await client.close();
		client = undefined;
		apiKeysIndexEnsured = false;
		apiCallsIndexEnsured = false;
		chatSessionsIndexEnsured = false;
		chatArchivesIndexEnsured = false;
	}
}
