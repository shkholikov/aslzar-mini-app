import "../src/config";
import { createHash, randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { getApiKeysCollection, closeDb } from "../src/db";

async function main() {
	const name = process.argv[2];
	if (!name) {
		console.error("Usage: pnpm --filter api create-key <name>");
		console.error('Example: pnpm --filter api create-key "acme-corp-prod"');
		process.exit(1);
	}

	const key = `ak_${randomBytes(32).toString("hex")}`;
	const keyHash = createHash("sha256").update(key).digest("hex");

	const col = await getApiKeysCollection();
	await col.insertOne({
		_id: new ObjectId(),
		keyHash,
		name,
		createdAt: new Date()
	});

	console.log("");
	console.log("✅ API key created");
	console.log(`   name: ${name}`);
	console.log("");
	console.log("   Save this key now — it will not be shown again:");
	console.log("");
	console.log(`   ${key}`);
	console.log("");

	await closeDb();
}

main().catch(async (err) => {
	console.error("Failed to create API key:", err);
	await closeDb().catch(() => {});
	process.exit(1);
});
