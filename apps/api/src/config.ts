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
	MONGO_DB_COLLECTION_SYNC_1C_JOBS: process.env.MONGO_DB_COLLECTION_SYNC_1C_JOBS || "sync_1c_jobs",
	MONGO_DB_COLLECTION_SETTINGS: process.env.MONGO_DB_COLLECTION_SETTINGS || "settings",
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
	// Shared secret for bonus card QR tokens (docs/1c-bonus-token.md) — held identically by us
	// and by 1C, which verifies tokens offline by recomputing the same HMAC. Deliberately
	// optional(): required() throws at boot, and a missing value must not take products, news,
	// referrals and the external sendMessage endpoint down to protect one card. The startup
	// warning below is what keeps that degradation from being silent.
	BONUS_TOKEN_SECRET: optional("BONUS_TOKEN_SECRET"),
	// CORS allowlist for the webapp + admin origins
	CORS_ALLOWED_ORIGINS: parseList("CORS_ALLOWED_ORIGINS", [
		"https://app.aslzarbot.uz",
		"https://admin.aslzarbot.uz",
		"http://localhost:3000",
		"http://localhost:3002"
	]),
	PORT: parseInt(process.env.PORT || "3001", 10)
};

// A missing or mistyped signing key is invisible until a customer is standing at a till, so
// say something at boot. Never log the value itself.
if (!config.BONUS_TOKEN_SECRET) {
	console.warn("⚠️  BONUS_TOKEN_SECRET is not set — the bonus card QR will be hidden for every user.");
} else if (process.env.NODE_ENV === "production" && !/^[0-9a-f]{64}$/i.test(config.BONUS_TOKEN_SECRET)) {
	// Production only: development deliberately uses the short human-readable key from
	// docs/1c-bonus-token.md so local tokens reproduce the vectors published to the 1C team.
	// Warning on that every boot would just train everyone to ignore this line.
	console.warn(
		`⚠️  BONUS_TOKEN_SECRET is not 64 hex characters (length ${config.BONUS_TOKEN_SECRET.length}) — check for a truncated paste.`
	);
}

/**
 * Referral cap applied when a user has no explicit `referralLimit` (admin-managed, top-level
 * field on the user document). Kept in sync with apps/bot and apps/admin by hand — `packages/shared`
 * is not wired up, and one number does not justify introducing it.
 */
export const DEFAULT_REFERRAL_LIMIT = 5;
