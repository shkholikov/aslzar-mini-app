// db.ts
import { Collection, MongoClient } from "mongodb";
import { ISession } from "@grammyjs/storage-mongodb";
import { config } from "dotenv";

config();

const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";

if (!dbUri) throw new Error("The Mongodb connection string is empty!");

let client: MongoClient;
export let users: Collection<ISession>;

export const connectToDb = async () => {
	try {
		client = new MongoClient(dbUri);
		console.log("Connecting to MongoDB Atlas cluster...");
		await client.connect();
		console.log("Successfully connected to MongoDB Atlas!");

		const db = client.db(dbName);
		users = db.collection(usersCollection);

		return client;
	} catch (error) {
		console.error("Connection to MongoDB Atlas failed!", error);
		process.exit();
	}
};
