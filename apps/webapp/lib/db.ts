import { MongoClient, Document } from "mongodb";

// MongoDB configuration
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";

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
 * Gets user's phone number from MongoDB by Telegram user ID
 * @param userId - Telegram user ID (used as session key/_id in MongoDB)
 * @returns Phone number string or null if not found
 */
export async function getPhoneByUserId(userId: string): Promise<string | null> {
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

		if (!user || !user.value?.phone_number) {
			return null;
		}

		return user.value.phone_number;
	} catch (error) {
		console.error("Error fetching phone number from database:", error);
		throw error;
	} finally {
		if (client) {
			await client.close();
		}
	}
}
