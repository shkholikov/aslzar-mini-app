/**
 * 1C data sync — refreshes user1CData for every user with a phone_number.
 *
 * Two entry points: admin button (via /v1/admin/sync-1c) and daily cron (00:00 Tashkent).
 * Both call createSync1CJob → processSync1CJob. Only one job runs at a time;
 * additional triggers while one is "processing" are rejected at the caller layer.
 */
import { ObjectId } from "mongodb";
import { getSync1CJobsCollection, getUsersCollection, updateUserSession1CData, type Sync1CJobDoc } from "./db";
import { OneCError, searchUserByPhone } from "./integrations/aslzar1c";

const DELAY_BETWEEN_CALLS_MS = 200;
/** Skip users whose 1C data was refreshed more recently than this. */
const STALE_HOURS = 24;

/** Returns true if any sync job is currently in "processing" state. */
export async function isSync1CRunning(): Promise<boolean> {
	const col = await getSync1CJobsCollection();
	const doc = await col.findOne({ status: "processing" });
	return !!doc;
}

/** Returns the most recent sync job (any status) for status display. */
export async function getLatestSync1CJob(): Promise<Sync1CJobDoc | null> {
	const col = await getSync1CJobsCollection();
	return col.findOne({}, { sort: { createdAt: -1 } });
}

/** Returns recent sync jobs sorted newest first. Default 50, max 200. */
export async function listSync1CJobs(limit = 50): Promise<Sync1CJobDoc[]> {
	const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 200);
	const col = await getSync1CJobsCollection();
	return col.find({}).sort({ createdAt: -1 }).limit(safeLimit).toArray();
}

/**
 * Inserts a new sync job in "processing" state and returns its id.
 * Caller is responsible for invoking processSync1CJob(id) (without await for HTTP handler).
 */
export async function createSync1CJob(triggeredBy: "cron" | "admin"): Promise<ObjectId> {
	const col = await getSync1CJobsCollection();
	const now = new Date();
	const result = await col.insertOne({
		status: "processing",
		triggeredBy,
		createdAt: now,
		startedAt: now
	});
	return result.insertedId;
}

/**
 * Processes a sync job: iterates all users with phone_number, calls 1C for each,
 * writes user1CData via updateUserSession1CData(). Updates the job doc with progress.
 */
export async function processSync1CJob(jobId: ObjectId): Promise<void> {
	const jobs = await getSync1CJobsCollection();
	const users = await getUsersCollection();

	let syncedCount = 0;
	let errorCount = 0;
	let totalUsers = 0;

	try {
		// Sync targets:
		//   - phone_number is a non-empty string (excludes null/missing values)
		//   - either user1CDataUpdatedAt is missing entirely (never synced)
		//     OR it's older than STALE_HOURS (data went stale)
		// This way active miniapp users (whose data was refreshed by /v1/users/me) are skipped.
		const staleCutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
		const cursor = users.find({
			"value.phone_number": { $type: "string", $regex: /\S/ },
			$or: [{ "value.user1CDataUpdatedAt": { $exists: false } }, { "value.user1CDataUpdatedAt": { $lt: staleCutoff } }]
		});
		const docs = await cursor.toArray();
		totalUsers = docs.length;

		await jobs.updateOne({ _id: jobId }, { $set: { totalUsers } });

		for (const doc of docs) {
			const userId = doc.key;
			const phone = doc.value?.phone_number;
			if (!userId || !phone) continue;

			try {
				const data = await searchUserByPhone(phone);
				if (data?.code === 0) {
					await updateUserSession1CData(userId, data, true);
					syncedCount++;
				} else {
					// 1C responded but user not found there — count as error so admin sees it
					errorCount++;
				}
			} catch (err) {
				errorCount++;
				if (err instanceof OneCError) {
					console.error(`[Sync1C] 1C error for user ${userId}:`, err.message);
				} else {
					console.error(`[Sync1C] failed for user ${userId}:`, err);
				}
			}

			await new Promise<void>((r) => setTimeout(r, DELAY_BETWEEN_CALLS_MS));
		}

		const usersWith1CDataCount = await users.countDocuments({
			"value.user1CData": { $exists: true, $ne: null }
		});

		await jobs.updateOne(
			{ _id: jobId },
			{
				$set: {
					status: "completed",
					completedAt: new Date(),
					totalUsers,
					usersWith1CDataCount,
					syncedCount,
					errorCount
				}
			}
		);
		console.log(
			`[Sync1C] job ${jobId} done: ${syncedCount}/${totalUsers} synced, ${errorCount} errors, ${usersWith1CDataCount} users have 1C data`
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		// Best-effort: still try to record the post-failure 1C-data count.
		let usersWith1CDataCount: number | undefined;
		try {
			usersWith1CDataCount = await users.countDocuments({
				"value.user1CData": { $exists: true, $ne: null }
			});
		} catch {
			// ignore — failure metric, not worth blocking
		}
		await jobs.updateOne(
			{ _id: jobId },
			{
				$set: {
					status: "failed",
					completedAt: new Date(),
					error: errorMessage,
					totalUsers,
					usersWith1CDataCount,
					syncedCount,
					errorCount
				}
			}
		);
		console.error(`[Sync1C] job ${jobId} failed:`, err);
	}
}

/**
 * Marks any "processing" jobs older than 30 minutes as failed.
 * Run on API startup to recover from a crash mid-sync.
 */
export async function recoverStuckSyncJobs(): Promise<void> {
	const jobs = await getSync1CJobsCollection();
	const cutoff = new Date(Date.now() - 30 * 60 * 1000);
	const result = await jobs.updateMany(
		{ status: "processing", startedAt: { $lt: cutoff } },
		{
			$set: {
				status: "failed",
				completedAt: new Date(),
				error: "interrupted_by_restart"
			}
		}
	);
	if (result.modifiedCount > 0) {
		console.log(`[Sync1C] recovered ${result.modifiedCount} stuck job(s)`);
	}
}
