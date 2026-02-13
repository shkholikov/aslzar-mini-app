import { config } from "dotenv";
import { resolve } from "path";

/**
 * Loads environment variables based on NODE_ENV
 * Priority: .env.{NODE_ENV}.local > .env.{NODE_ENV} > .env.local > .env
 * Defaults to 'development' if NODE_ENV is not set
 */
function loadEnv() {
	const env = process.env.NODE_ENV || "development";
	
	// Load in priority order (later files override earlier ones)
	// 1. Base .env file (lowest priority)
	config({ path: resolve(process.cwd(), ".env") });
	
	// 2. Environment-specific .env.{env} file
	const envFile = `.env.${env}`;
	config({ path: resolve(process.cwd(), envFile) });
	
	// 3. Base .env.local file
	config({ path: resolve(process.cwd(), ".env.local") });
	
	// 4. Environment-specific .env.{env}.local file (highest priority)
	const envLocalFile = `.env.${env}.local`;
	config({ path: resolve(process.cwd(), envLocalFile) });
	
	console.log(`📦 Loaded environment: ${env}`);
}

// Load environment variables immediately when this module is imported
loadEnv();
