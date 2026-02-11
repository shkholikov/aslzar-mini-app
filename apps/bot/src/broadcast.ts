/**
 * Broadcast job processor
 * - Picks up jobs with status "pending" from broadcast_jobs collection
 * - Filters users by audience (isVerified: verified = true, non_verified = not true), sends via Telegram API
 * - Updates job status and counts
 */
import cron from "node-cron";
import type { Filter } from "mongodb";
import type { Api } from "grammy";
import { users, broadcastJobs } from "./db";
import type { BroadcastJob } from "./types";

/**
 * Atomically claim a pending job (set to "processing"). Returns true only if we were the one who claimed it,
 * so only one worker can ever process a given job — no duplicate sends.
 */
async function claimJob(id: unknown): Promise<boolean> {
	const result = await broadcastJobs.updateOne(
		{ _id: id, status: "pending" } as Filter<BroadcastJob>,
		{ $set: { status: "processing" } }
	);
	return result.matchedCount === 1 && result.modifiedCount === 1;
}

async function processBroadcastJob(api: Api, job: BroadcastJob): Promise<void> {
	const id = (job as { _id?: unknown })._id;
	if (!id) return;

	const claimed = await claimJob(id);
	if (!claimed) {
		return;
	}

	const audience = job.audience ?? "all";
	// Filter by isVerified only; Telegram user ID (key) is enough to send, phone not required
	const userFilter: Record<string, unknown> =
		audience === "verified"
			? { "value.isVerified": true }
			: audience === "non_verified"
				? { "value.isVerified": { $ne: true } }
				: {};
	const cursor = users.find(userFilter as Parameters<typeof users.find>[0]);
	const docs = await cursor.toArray();
	const keys = docs.map((d) => (d as { key?: string }).key).filter((k): k is string => !!k);

	let sentCount = 0;
	let failedCount = 0;
	const CHECK_CANCEL_EVERY = 5;

	const freshBefore = await broadcastJobs.findOne({ _id: id } as Filter<BroadcastJob>);
	if (freshBefore?.status === "cancelled") {
		await broadcastJobs.updateOne(
			{ _id: id } as Filter<BroadcastJob>,
			{ $set: { totalUsers: keys.length, sentCount: 0, failedCount: 0, completedAt: new Date() } }
		);
		console.log(`[Broadcast] job ${id} was cancelled before sending`);
		return;
	}

	for (let i = 0; i < keys.length; i++) {
		const telegramUserId = keys[i];
		if (i > 0 && i % CHECK_CANCEL_EVERY === 0) {
			const updated = await broadcastJobs.findOne({ _id: id } as Filter<BroadcastJob>);
			if (updated?.status === "cancelled") {
				await broadcastJobs.updateOne(
					{ _id: id } as Filter<BroadcastJob>,
					{
						$set: {
							totalUsers: keys.length,
							sentCount,
							failedCount,
							completedAt: new Date()
						}
					}
				);
				console.log(`[Broadcast] job ${id} cancelled: ${sentCount} sent, ${failedCount} failed`);
				return;
			}
		}
		try {
			await api.sendMessage(telegramUserId, job.message);
			sentCount++;
		} catch (err) {
			failedCount++;
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error(`[Broadcast] send failed for user ${telegramUserId}:`, errorMessage);
		}
	}

	await broadcastJobs.updateOne(
		{ _id: id } as Filter<BroadcastJob>,
		{
			$set: {
				status: "completed",
				completedAt: new Date(),
				totalUsers: keys.length,
				sentCount,
				failedCount
			}
		}
	);
	console.log(`[Broadcast] job ${id} completed: ${sentCount} sent, ${failedCount} failed`);
}

async function runBroadcastCycle(api: Api): Promise<void> {
	const pending = await broadcastJobs.find({ status: "pending" }).toArray();
	for (const job of pending) {
		try {
			await processBroadcastJob(api, job as BroadcastJob);
		} catch (err) {
			const id = (job as { _id?: unknown })._id;
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error(`[Broadcast] job ${id} failed:`, err);
			await broadcastJobs.updateOne(
				{ _id: id } as Filter<BroadcastJob>,
				{ $set: { status: "failed", completedAt: new Date(), error: errorMessage } }
			);
		}
	}
}

/** Run every minute to process pending broadcast jobs */
export function startBroadcastScheduler(api: Api): void {
	cron.schedule("* * * * *", () => runBroadcastCycle(api));
	console.log("[Broadcast] scheduler started: checks for pending jobs every minute");
}
