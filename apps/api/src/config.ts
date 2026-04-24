import { config as loadDotenv } from "dotenv";
import { resolve } from "path";

/**
 * Loads environment variables based on NODE_ENV
 * Priority: .env.{NODE_ENV}.local > .env.{NODE_ENV} > .env.local > .env
 * Mirrors apps/bot/src/config.ts priority order.
 */
function loadEnv() {
	const env = process.env.NODE_ENV || "development";

	loadDotenv({ path: resolve(process.cwd(), ".env") });
	loadDotenv({ path: resolve(process.cwd(), `.env.${env}`) });
	loadDotenv({ path: resolve(process.cwd(), ".env.local") });
	loadDotenv({ path: resolve(process.cwd(), `.env.${env}.local`) });

	console.log(`📦 Loaded environment: ${env}`);
}

loadEnv();

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} environment variable is required`);
	}
	return value;
}

export const config = {
	MONGO_DB_CONNECTION_STRING: required("MONGO_DB_CONNECTION_STRING"),
	MONGO_DB_NAME: required("MONGO_DB_NAME"),
	MONGO_DB_COLLECTION_API_KEYS: process.env.MONGO_DB_COLLECTION_API_KEYS || "api_keys",
	MONGO_DB_COLLECTION_USERS: process.env.MONGO_DB_COLLECTION_USERS || "users",
	MONGO_DB_COLLECTION_API_CALLS: process.env.MONGO_DB_COLLECTION_API_CALLS || "api_calls",
	BOT_TOKEN: required("BOT_TOKEN"),
	PORT: parseInt(process.env.PORT || "3001", 10)
};
