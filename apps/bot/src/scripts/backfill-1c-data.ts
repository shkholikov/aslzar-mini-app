import "../config";
import { MongoClient } from "mongodb";
import { searchUserByPhone } from "../api";

const DRY_RUN = process.argv.includes("--dry-run");

const MONGO_URI = process.env.MONGO_DB_CONNECTION_STRING || "";
const MONGO_DB = process.env.MONGO_DB_NAME || "";
const USERS_COLLECTION = process.env.MONGO_DB_COLLECTION_USERS || "users";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

interface UserSession {
	key: string;
	value: {
		phone_number?: string;
		[key: string]: unknown;
	};
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
	if (!MONGO_URI || !MONGO_DB) {
		console.error("MONGO_DB_CONNECTION_STRING or MONGO_DB_NAME is not set");
		process.exit(1);
	}

	if (DRY_RUN) {
		console.log("[DRY RUN] No writes will be made.");
	}

	const client = new MongoClient(MONGO_URI);
	await client.connect();
	const db = client.db(MONGO_DB);
	const col = db.collection<UserSession>(USERS_COLLECTION);

	const query = col.find({ "value.phone_number": { $exists: true, $type: "string", $ne: "" } });
	if (DRY_RUN) query.limit(10);
	const users = await query.toArray();

	const total = users.length;
	console.log(`Found ${total} users with phone numbers.`);

	let updated = 0;
	let skipped = 0;
	let failed = 0;

	for (let i = 0; i < users.length; i += BATCH_SIZE) {
		const batch = users.slice(i, i + BATCH_SIZE);

		await Promise.all(
			batch.map(async (user) => {
				const phone = user.value.phone_number!;
				try {
					const data = await searchUserByPhone(phone);
					if (!data) {
						console.warn(`[SKIP] key=${user.key} phone=${phone} — not found in 1C`);
						skipped++;
						return;
					}

					if (DRY_RUN) {
						console.log(`[DRY] Would update key=${user.key} phone=${phone} lastVisit=${data.lastVisit}`);
						updated++;
						return;
					}

					await col.updateOne({ key: user.key }, { $set: { "value.user1CData": data } });
					console.log(`[OK] key=${user.key} phone=${phone} lastVisit=${data.lastVisit}`);
					updated++;
				} catch (err) {
					console.error(`[ERROR] key=${user.key} phone=${phone}`, err);
					failed++;
				}
			})
		);

		if (i + BATCH_SIZE < users.length) {
			await sleep(BATCH_DELAY_MS);
		}
	}

	await client.close();

	console.log("\n--- Summary ---");
	console.log(`Total:   ${total}`);
	console.log(`Updated: ${updated}`);
	console.log(`Skipped: ${skipped}`);
	console.log(`Failed:  ${failed}`);
}

run().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
