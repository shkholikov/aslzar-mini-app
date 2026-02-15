import { MongoClient, Document } from "mongodb";

// MongoDB configuration
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";
const suggestionsCollection = process.env.MONGO_DB_COLLECTION_SUGGESTIONS || "suggestions";
const channelPostsCollection = process.env.MONGO_DB_COLLECTION_CHANNEL_POSTS || "channel_posts";

/**
 * Session data structure stored in MongoDB by MongoDBAdapter
 * MongoDBAdapter stores data in a nested structure:
 * - _id: ObjectId
 * - key: Session key (Telegram user ID as string)
 * - value: Actual session data object
 */
export interface MongoDBUserDocument extends Document {
	_id: {
		$oid: string;
	};
	key: string; // Session key (Telegram user ID as string)
	value: {
		id?: number;
		username?: string;
		first_name?: string;
		last_name?: string;
		phone_number?: string;
		createdAt?:
			| {
					$date: string;
			  }
			| Date;
	};
}

/**
 * Gets user's data from MongoDB by Telegram user ID
 * @param userId - Telegram user ID (used as session key/_id in MongoDB)
 * @returns User data object or null if not found
 */
export async function getUserDataByUserId(userId: string): Promise<MongoDBUserDocument["value"] | null> {
	let client: MongoClient | null = null;

	try {
		// Validate configuration
		if (!dbUri || !dbName || !usersCollection) {
			throw new Error("MongoDB configuration is missing");
		}

		// Connect to MongoDB
		client = new MongoClient(dbUri);
		await client.connect();

		const db = client.db(dbName);
		const users = db.collection<MongoDBUserDocument>(usersCollection);

		// Find user by Telegram ID (stored as session key)
		const user = await users.findOne({ key: userId });

		if (!user || !user.value) {
			return null;
		}

		return user.value;
	} catch (error) {
		console.error("Error fetching user data from database:", error);
		throw error;
	} finally {
		if (client) {
			await client.close();
		}
	}
}

/**
 * Updates the user's session in MongoDB with 1C data and verified flag.
 * Used after webapp registration so the bot (reminders, referrals) sees the user as verified.
 *
 * @param userId - Telegram user ID (session key)
 * @param user1CData - Full 1C API response (search result with code === 0)
 * @param isVerified - Whether the user is verified in 1C
 */
export async function updateUserSession1CData(userId: string, user1CData: Record<string, unknown>, isVerified: boolean): Promise<boolean> {
	let client: MongoClient | null = null;

	try {
		if (!dbUri || !dbName || !usersCollection) {
			throw new Error("MongoDB configuration is missing");
		}

		client = new MongoClient(dbUri);
		await client.connect();

		const db = client.db(dbName);
		const users = db.collection<MongoDBUserDocument>(usersCollection);

		const result = await users.updateOne({ key: userId }, { $set: { "value.user1CData": user1CData, "value.isVerified": isVerified } });

		return result.matchedCount > 0 && result.modifiedCount > 0;
	} catch (error) {
		console.error("Error updating user session 1C data:", error);
		throw error;
	} finally {
		if (client) {
			await client.close();
		}
	}
}

/** Suggestion/complaint document stored in MongoDB */
export interface SuggestionDocument extends Document {
	text: string;
	userId?: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	createdAt: Date;
}

/** Options for inserting a suggestion (Telegram user info when available) */
export interface InsertSuggestionOptions {
	userId?: string;
	firstName?: string;
	lastName?: string;
	username?: string;
}

/**
 * Inserts a suggestion or complaint into MongoDB
 * @param text - The suggestion or complaint text
 * @param options - Optional Telegram user info (userId, firstName, lastName, username)
 */
export async function insertSuggestion(text: string, options?: InsertSuggestionOptions): Promise<void> {
	let client: MongoClient | null = null;

	try {
		if (!dbUri || !dbName || !suggestionsCollection) {
			throw new Error("MongoDB configuration is missing");
		}

		client = new MongoClient(dbUri);
		await client.connect();

		const db = client.db(dbName);
		const suggestions = db.collection<SuggestionDocument>(suggestionsCollection);

		const doc: SuggestionDocument = {
			text,
			createdAt: new Date()
		};
		if (options?.userId) doc.userId = options.userId;
		if (options?.firstName) doc.firstName = options.firstName;
		if (options?.lastName) doc.lastName = options.lastName;
		if (options?.username) doc.username = options.username;

		await suggestions.insertOne(doc);
	} catch (error) {
		console.error("Error inserting suggestion:", error);
		throw error;
	} finally {
		if (client) {
			await client.close();
		}
	}
}

/** Stored channel post (from bot channel_post handler) */
export interface ChannelPostRecord {
	messageId: number;
	chatId: number;
	channelUsername: string;
	date: Date;
	text: string;
	photoFileId?: string;
	photoFilePath?: string;
	videoFileId?: string;
	videoFilePath?: string;
	createdAt: Date;
}

const MAX_CHANNEL_POSTS = 10;

/**
 * Fetches latest channel posts from MongoDB (stored by the bot when it receives channel_post updates).
 * Used by /api/news to display "Yangiliklar" from the Telegram channel.
 */
export async function getChannelPosts(limit: number = MAX_CHANNEL_POSTS): Promise<ChannelPostRecord[]> {
	let client: MongoClient | null = null;

	try {
		if (!dbUri || !dbName || !channelPostsCollection) {
			return [];
		}

		client = new MongoClient(dbUri);
		await client.connect();

		const db = client.db(dbName);
		const posts = db.collection<ChannelPostRecord>(channelPostsCollection);

		const cursor = posts.find({}).sort({ date: -1 }).limit(limit);
		const list = await cursor.toArray();
		return list;
	} catch (error) {
		console.error("Error fetching channel posts:", error);
		return [];
	} finally {
		if (client) {
			await client.close();
		}
	}
}
