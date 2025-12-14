import { MongoClient, Document } from "mongodb";

// MongoDB configuration
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";

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
