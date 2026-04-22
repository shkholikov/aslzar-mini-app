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

let client: MongoClient | undefined;
let indexEnsured = false;

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
	if (!indexEnsured) {
		await col.createIndex({ keyHash: 1 }, { unique: true });
		indexEnsured = true;
	}
	return col;
}

export async function closeDb(): Promise<void> {
	if (client) {
		await client.close();
		client = undefined;
		indexEnsured = false;
	}
}
