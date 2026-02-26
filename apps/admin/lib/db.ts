import { MongoClient, Document, ObjectId } from "mongodb";

// MongoDB configuration
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";
const broadcastJobsCollection = process.env.MONGO_DB_COLLECTION_BROADCAST_JOBS || "broadcast_jobs";
const suggestionsCollection = process.env.MONGO_DB_COLLECTION_SUGGESTIONS || "suggestions";
const productsCollection = process.env.MONGO_DB_COLLECTION_PRODUCTS || "products";

/** Suggestion/complaint from webapp (same collection as webapp) */
export interface SuggestionDoc {
	_id?: string;
	text: string;
	userId?: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	createdAt: Date;
}

/** Product stored in MongoDB (for webapp catalog). Same shape as webapp product model; field is `url`. */
export interface ProductDoc extends Document {
	_id?: string | ObjectId;
	title: string;
	description: string;
	price: number;
	url: string;
	badgeLabel?: string;
	createdAt: Date;
	updatedAt: Date;
}

/** Broadcast audience: all users, or filter by isVerified (verified = true, non_verified = not true) */
export type BroadcastAudience = "all" | "verified" | "non_verified";

/** Broadcast job (same shape as bot's BroadcastJob) */
export interface BroadcastJobDoc {
	_id?: string | ObjectId;
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
			status?: boolean;
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
 * Creates a new broadcast job (status: pending). Bot sends by audience (isVerified: verified = true, non_verified = not true).
 */
export async function createBroadcastJob(
	message: string,
	audience: BroadcastAudience = "all"
): Promise<BroadcastJobDoc> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<BroadcastJobDoc>(broadcastJobsCollection);
		const doc: BroadcastJobDoc = {
			message,
			audience,
			status: "pending",
			createdAt: new Date()
		};
		const result = await coll.insertOne(doc);
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
 * Cancel a broadcast job. Only cancels if status is "pending" or "processing".
 * Returns true if the job was found and cancelled.
 */
export async function cancelBroadcastJob(jobId: string): Promise<boolean> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		if (!ObjectId.isValid(jobId)) return false;
		const id = new ObjectId(jobId);
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<BroadcastJobDoc>(broadcastJobsCollection);
		const result = await coll.updateOne(
			{ _id: id, status: { $in: ["pending", "processing"] } },
			{ $set: { status: "cancelled", completedAt: new Date() } }
		);
		return result.matchedCount === 1 && result.modifiedCount === 1;
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

/**
 * Creates a new product document.
 */
export async function createProduct(input: {
	title: string;
	description: string;
	price: number;
	url: string;
	badgeLabel?: string;
}): Promise<ProductDoc> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<ProductDoc>(productsCollection);
		const now = new Date();
		const doc: ProductDoc = {
			title: input.title,
			description: input.description,
			price: input.price,
			url: input.url,
			badgeLabel: input.badgeLabel,
			createdAt: now,
			updatedAt: now
		};
		const result = await coll.insertOne(doc);
		return { ...doc, _id: result.insertedId };
	} finally {
		if (client) await client.close();
	}
}

/** Raw product from DB (may have url or legacy imageUrl) */
type ProductRow = ProductDoc & { imageUrl?: string };

/**
 * Returns products ordered by newest first.
 * Normalizes legacy `imageUrl` to `url` so the model is consistent.
 */
export async function getProducts(limit = 100): Promise<ProductDoc[]> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<ProductRow>(productsCollection);
		const list = await coll.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
		return list.map((p) => ({
			...p,
			url: (p as ProductRow).url ?? (p as ProductRow).imageUrl ?? ""
		})) as ProductDoc[];
	} finally {
		if (client) await client.close();
	}
}

/**
 * Returns a single product by id, or null if not found.
 */
export async function getProduct(id: string): Promise<ProductDoc | null> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<ProductRow>(productsCollection);
		const doc = await coll.findOne({ _id: new ObjectId(id) });
		if (!doc) return null;
		return {
			...doc,
			url: doc.url ?? doc.imageUrl ?? ""
		} as ProductDoc;
	} finally {
		if (client) await client.close();
	}
}

/**
 * Deletes a product by id.
 */
export async function deleteProduct(id: string): Promise<boolean> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<ProductDoc>(productsCollection);
		const result = await coll.deleteOne({ _id: new ObjectId(id) });
		return result.deletedCount === 1;
	} finally {
		if (client) await client.close();
	}
}
