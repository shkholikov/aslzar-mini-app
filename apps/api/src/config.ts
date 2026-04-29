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

function optional(name: string, fallback = ""): string {
	return process.env[name] ?? fallback;
}

function parseList(name: string, fallback: string[] = []): string[] {
	const v = process.env[name];
	if (!v) return fallback;
	return v
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

export const config = {
	MONGO_DB_CONNECTION_STRING: required("MONGO_DB_CONNECTION_STRING"),
	MONGO_DB_NAME: required("MONGO_DB_NAME"),
	MONGO_DB_COLLECTION_API_KEYS: process.env.MONGO_DB_COLLECTION_API_KEYS || "api_keys",
	MONGO_DB_COLLECTION_USERS: process.env.MONGO_DB_COLLECTION_USERS || "users",
	MONGO_DB_COLLECTION_API_CALLS: process.env.MONGO_DB_COLLECTION_API_CALLS || "api_calls",
	MONGO_DB_COLLECTION_PRODUCTS: process.env.MONGO_DB_COLLECTION_PRODUCTS || "products",
	MONGO_DB_COLLECTION_NEWS: process.env.MONGO_DB_COLLECTION_NEWS || "news_items",
	MONGO_DB_COLLECTION_SUGGESTIONS: process.env.MONGO_DB_COLLECTION_SUGGESTIONS || "suggestions",
	BOT_TOKEN: required("BOT_TOKEN"),
	CHANNEL_ID: process.env.CHANNEL_ID || "@ASLZAR_tilla",
	BOT_TELEGRAM_LINK: process.env.BOT_TELEGRAM_LINK || "https://t.me/aslzaruzbot",
	// 1C ERP integration (moved from webapp)
	ASLZAR_1C_BASE_URL: optional("ASLZAR_1C_BASE_URL"),
	ASLZAR_1C_USERNAME: optional("ASLZAR_1C_USERNAME"),
	ASLZAR_1C_PASSWORD: optional("ASLZAR_1C_PASSWORD"),
	// AmoCRM integration (moved from webapp)
	AMOCRM_BASE_URL: optional("AMOCRM_BASE_URL"),
	AMOCRM_API_TOKEN: optional("AMOCRM_API_TOKEN"),
	AMOCRM_PIPELINE_ID: optional("AMOCRM_PIPELINE_ID"),
	// CORS allowlist for the webapp + admin origins
	CORS_ALLOWED_ORIGINS: parseList("CORS_ALLOWED_ORIGINS", [
		"https://app.aslzarbot.uz",
		"https://admin.aslzarbot.uz",
		"http://localhost:3000",
		"http://localhost:3002"
	]),
	PORT: parseInt(process.env.PORT || "3001", 10)
};
