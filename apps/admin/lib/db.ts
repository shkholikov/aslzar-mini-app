import { MongoClient, Document } from "mongodb";

// MongoDB configuration
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";
const broadcastJobsCollection = process.env.MONGO_DB_COLLECTION_BROADCAST_JOBS || "broadcast_jobs";
const suggestionsCollection = process.env.MONGO_DB_COLLECTION_SUGGESTIONS || "suggestions";

/** Suggestion/complaint from webapp (same collection as webapp) */
export interface SuggestionDoc {
	_id?: unknown;
	text: string;
	userId?: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	createdAt: Date;
}

/** Broadcast job (same shape as bot's BroadcastJob) */
export interface BroadcastJobDoc {
	_id?: unknown;
	message: string;
	status: "pending" | "processing" | "completed" | "failed";
	createdAt: Date;
	completedAt?: Date;
	totalUsers?: number;
	sentCount?: number;
	failedCount?: number;
	error?: string;
}

/**
 * User document structure from MongoDB
 */
export interface UserDocument extends Document {
	_id: {
		$oid: string;
	};
	key: string; // Telegram user ID as string
	value: {
		id: number;
		username?: string | null;
		first_name?: string | null;
		last_name?: string | null;
		phone_number?: string;
		isChannelMember?: boolean;
		lastMessageId?: number | null;
		preparedMessageId?: number | null;
		createdAt?:
			| {
					$date: string;
			  }
			| Date;
		isVerified?: boolean;
		user1CData?: {
			code: number;
			message: string;
			contract?: {
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
					}>;
					pays: Array<{
						id: number;
						sum: number;
						comment: string;
						date: string;
					}>;
					goods: Array<{
						id: string;
						category: string;
						name: string;
						weight: number;
						koltso: number;
						sergi: number;
					}>;
				}>;
			};
			debt?: number;
			remain?: number;
			latePayment?: number;
			suboffice?: string | null;
			familiya?: string;
			imya?: string;
			otchestvo?: string;
			inn?: string | null;
			phone?: string;
			passport?: string | null;
			bonusOstatok?: number;
			bonusInfo?: {
				nachislenie: number;
				spisanie: number;
				nachislenieVSrok: number;
				uroven: string;
				oborot: number;
			};
			clientId?: string;
			contractFirst?: boolean;
			referalCount?: number;
			referalLimit?: number;
		} | null;
	};
}

/**
 * Gets all users from MongoDB
 * @returns Array of user documents
 */
export async function getAllUsers(): Promise<UserDocument[]> {
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
		const users = db.collection<UserDocument>(usersCollection);

		// Find all users
		const allUsers = await users.find({}).toArray();

		return allUsers;
	} catch (error) {
		console.error("Error fetching users from database:", error);
		throw error;
	} finally {
		if (client) {
			await client.close();
		}
	}
}

/**
 * Creates a new broadcast job (status: pending). Bot will pick it up and send to all users with phone.
 */
export async function createBroadcastJob(message: string): Promise<BroadcastJobDoc> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<BroadcastJobDoc>(broadcastJobsCollection);
		const doc: BroadcastJobDoc = {
			message,
			status: "pending",
			createdAt: new Date()
		};
		const result = await coll.insertOne(doc as Document);
		return { ...doc, _id: result.insertedId };
	} finally {
		if (client) await client.close();
	}
}

/**
 * Gets recent broadcast jobs for admin UI
 */
export async function getBroadcastJobs(limit = 50): Promise<BroadcastJobDoc[]> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<BroadcastJobDoc>(broadcastJobsCollection);
		const list = await coll.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
		return list as BroadcastJobDoc[];
	} finally {
		if (client) await client.close();
	}
}

/**
 * Gets recent suggestions/complaints from the webapp's collection (for admin view)
 */
export async function getSuggestions(limit = 200): Promise<SuggestionDoc[]> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<SuggestionDoc>(suggestionsCollection);
		const list = await coll.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
		return list as SuggestionDoc[];
	} finally {
		if (client) await client.close();
	}
}
