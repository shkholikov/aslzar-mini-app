import { MongoClient, Document, ObjectId } from "mongodb";

// MongoDB configuration
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";
const broadcastJobsCollection = process.env.MONGO_DB_COLLECTION_BROADCAST_JOBS || "broadcast_jobs";
const suggestionsCollection = process.env.MONGO_DB_COLLECTION_SUGGESTIONS || "suggestions";
const productsCollection = process.env.MONGO_DB_COLLECTION_PRODUCTS || "products";
const employeesCollection = process.env.MONGO_DB_COLLECTION_EMPLOYEES || "employees";
const countersCollection = process.env.MONGO_DB_COLLECTION_COUNTERS || "counters";
const newsItemsCollection = process.env.MONGO_DB_COLLECTION_NEWS || "news_items";

/** Employee (xodim) – used for referral links and QR codes in admin */
export interface EmployeeDoc extends Document {
	_id?: string | ObjectId;
	name: string;
	surname: string;
	filial: string;
	/** Unique, never-reused referral code like "emp1", "emp2" */
	referralCode: string;
	createdAt: Date;
	/** Username of the admin who created this employee */
	createdBy?: string;
}

/** Simple counter document for sequences (e.g. employee_referral) */
interface CounterDoc extends Document {
	_id: string;
	seq: number;
}

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
	price?: number;
	url: string;
	badgeLabel?: string;
	createdAt: Date;
	updatedAt: Date;
}

/** Broadcast audience: legacy single-select (kept for old jobs display) */
export type BroadcastAudience = "all" | "verified" | "non_verified";

/** Broadcast filters: when none set, send to all users; when any set, AND them (e.g. verified + aktiv). Level filters (Silver/Gold/Diamond) are ORed. */
export interface BroadcastAudienceFilters {
	verified?: boolean; // Tasdiqlangan — isVerified === true
	nonVerified?: boolean; // Tasdiqlanmagan — isVerified !== true
	aktiv?: boolean; // Aktiv — user1CData.status === true
	aktivEmas?: boolean; // Aktiv emas — user1CData.status === false
	silver?: boolean; // bonusInfo.uroven === "Silver"
	gold?: boolean; // bonusInfo.uroven === "Gold"
	diamond?: boolean; // bonusInfo.uroven === "Diamond"
	lastVisit?: boolean; // user1CData.lastVisit === true
	lastVisitNo?: boolean; // user1CData.lastVisit === false
	contractFirst?: boolean; // user1CData.contractFirst === true
	contractFirstNo?: boolean; // user1CData.contractFirst === false
}

/** Broadcast job (same shape as bot's BroadcastJob) */
export interface BroadcastJobDoc {
	_id?: string | ObjectId;
	message: string;
	mediaUrl?: string;
	mediaType?: "photo" | "video";
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
			lastVisit?: boolean;
			referalCount?: number;
			referalLimit?: number;
		} | null;
		/** Set when user joined via employee referral link (?start=emp123) */
		referredByEmployeeCode?: string | null;
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

export interface AdminStats {
	totalUsers: number;
	verified: number;
	nonVerified: number;
	/** Users created in the current calendar month */
	currentMonthUsers: number;
	/** Count of users where lastVisit === true */
	lastVisitTrue: number;
	/** Count of users where contractFirst === false (never purchased) */
	contractFirstFalse: number;
}

/**
 * Gets user counts for admin dashboard (total, verified, non-verified, current month).
 */
export async function getAdminStats(): Promise<AdminStats> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName || !usersCollection) {
			throw new Error("MongoDB configuration is missing");
		}
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const users = db.collection<UserDocument>(usersCollection);

		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

		const [totalUsers, verified, currentMonthUsers, lastVisitTrue, contractFirstFalse] = await Promise.all([
			users.countDocuments({}),
			users.countDocuments({ "value.isVerified": true }),
			users.countDocuments({
				"value.createdAt": { $gte: startOfMonth, $lte: endOfMonth }
			}),
			users.countDocuments({ "value.user1CData.lastVisit": true }),
			users.countDocuments({ "value.user1CData.contractFirst": false })
		]);
		return {
			totalUsers,
			verified,
			nonVerified: totalUsers - verified,
			currentMonthUsers,
			lastVisitTrue,
			contractFirstFalse
		};
	} catch (error) {
		console.error("Error fetching admin stats:", error);
		throw error;
	} finally {
		if (client) await client.close();
	}
}

/**
 * Creates a new broadcast job (status: pending). Bot sends by audienceFilters: when none set, all users; when set, AND conditions.
 */
export async function createBroadcastJob(
	message: string,
	audienceFilters?: BroadcastAudienceFilters,
	media?: { mediaUrl: string; mediaType: "photo" | "video" },
	button?: { buttonText: string; buttonUrl: string }
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
			...(media && { mediaUrl: media.mediaUrl, mediaType: media.mediaType }),
			...(button && {
				buttonText: button.buttonText,
				buttonUrl: button.buttonUrl
			}),
			audienceFilters: audienceFilters ?? undefined,
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
	price?: number;
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
			url: input.url,
			badgeLabel: input.badgeLabel,
			createdAt: now,
			updatedAt: now
		};
		if (typeof input.price === "number" && isFinite(input.price) && input.price > 0) {
			doc.price = input.price;
		}
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

/**
 * Returns the next unique referral code (emp1, emp2, ...) for a new employee.
 * Uses a separate counters collection so codes are never reused even if employees are deleted.
 */
async function getNextEmployeeReferralCode(): Promise<string> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const counters = db.collection<CounterDoc>(countersCollection);
		const result = await counters.findOneAndUpdate({ _id: "employee_referral" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
		const seq = result?.seq ?? 1;
		return `emp${seq}`;
	} finally {
		if (client) await client.close();
	}
}

/**
 * Creates a new employee with auto-generated unique referralCode (emp1, emp2, ...).
 */
export async function createEmployee(input: { name: string; surname: string; filial: string; createdBy?: string }): Promise<EmployeeDoc> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<EmployeeDoc>(employeesCollection);
		const referralCode = await getNextEmployeeReferralCode();
		const now = new Date();
		const doc: EmployeeDoc = {
			name: input.name.trim(),
			surname: input.surname.trim(),
			filial: input.filial.trim(),
			referralCode,
			createdAt: now,
			...(input.createdBy ? { createdBy: input.createdBy } : {})
		};
		const result = await coll.insertOne(doc);
		return { ...doc, _id: result.insertedId };
	} finally {
		if (client) await client.close();
	}
}

/**
 * Gets all employees, sorted by createdAt desc.
 */
export async function getEmployees(): Promise<EmployeeDoc[]> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<EmployeeDoc>(employeesCollection);
		const list = await coll.find({}).sort({ createdAt: -1 }).toArray();
		return list as EmployeeDoc[];
	} finally {
		if (client) await client.close();
	}
}

/**
 * Counts users who were referred by the given employee code.
 * Optionally filtered to users who started the bot within a date range.
 */
export async function countUsersByEmployeeCode(referralCode: string, dateRange?: { from: Date; to: Date }): Promise<number> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName || !usersCollection) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<UserDocument>(usersCollection);
		const count = await coll.countDocuments({
			"value.referredByEmployeeCode": referralCode,
			...(dateRange ? { "value.createdAt": { $gte: dateRange.from, $lte: dateRange.to } } : {})
		});
		return count;
	} finally {
		if (client) await client.close();
	}
}

/** Admin-managed news item displayed in webapp "Yangiliklar" section */
export interface NewsItemDoc extends Document {
	_id?: string | ObjectId;
	title: string;
	description: string;
	mediaUrl?: string;
	mediaType?: "photo" | "video";
	buttonText?: string;
	buttonUrl?: string;
	isActive: boolean;
	createdAt: Date;
}

export async function createNewsItem(input: {
	title: string;
	description: string;
	media?: { mediaUrl: string; mediaType: "photo" | "video" };
	button?: { buttonText: string; buttonUrl: string };
}): Promise<NewsItemDoc> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<NewsItemDoc>(newsItemsCollection);
		const doc: NewsItemDoc = {
			title: input.title,
			description: input.description,
			...(input.media && {
				mediaUrl: input.media.mediaUrl,
				mediaType: input.media.mediaType
			}),
			...(input.button && {
				buttonText: input.button.buttonText,
				buttonUrl: input.button.buttonUrl
			}),
			isActive: true,
			createdAt: new Date()
		};
		const result = await coll.insertOne(doc);
		return { ...doc, _id: result.insertedId };
	} finally {
		if (client) await client.close();
	}
}

export async function getNewsItems(limit = 50): Promise<NewsItemDoc[]> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<NewsItemDoc>(newsItemsCollection);
		const list = await coll.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
		return list as NewsItemDoc[];
	} finally {
		if (client) await client.close();
	}
}

export async function deleteNewsItem(id: string): Promise<boolean> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		if (!ObjectId.isValid(id)) return false;
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<NewsItemDoc>(newsItemsCollection);
		const result = await coll.deleteOne({ _id: new ObjectId(id) });
		return result.deletedCount === 1;
	} finally {
		if (client) await client.close();
	}
}

export async function toggleNewsItem(id: string, isActive: boolean): Promise<boolean> {
	let client: MongoClient | null = null;
	try {
		if (!dbUri || !dbName) throw new Error("MongoDB configuration is missing");
		if (!ObjectId.isValid(id)) return false;
		client = new MongoClient(dbUri);
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<NewsItemDoc>(newsItemsCollection);
		const result = await coll.updateOne({ _id: new ObjectId(id) }, { $set: { isActive } });
		return result.matchedCount === 1;
	} finally {
		if (client) await client.close();
	}
}
