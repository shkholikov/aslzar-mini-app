/**
 * Broadcast job processor
 * - Picks up jobs with status "pending" from broadcast_jobs collection
 * - Filters users by audienceFilters (verified, nonVerified, aktiv, aktivEmas); when none set, all users. Selected filters are ANDed.
 * - Sends via Telegram API and updates job status and counts
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
	const result = await broadcastJobs.updateOne({ _id: id, status: "pending" } as Filter<BroadcastJob>, { $set: { status: "processing" } });
	return result.matchedCount === 1 && result.modifiedCount === 1;
}

async function processBroadcastJob(api: Api, job: BroadcastJob): Promise<void> {
	const id = (job as { _id?: unknown })._id;
	if (!id) return;

	const claimed = await claimJob(id);
	if (!claimed) {
		return;
	}

	const filters = job.audienceFilters;
	const legacyAudience = job.audience ?? "all";
	const conditions: Record<string, unknown>[] = [];
	if (filters) {
		if (filters.verified === true) conditions.push({ "value.isVerified": true });
		if (filters.nonVerified === true) conditions.push({ "value.isVerified": { $ne: true } });
		if (filters.aktiv === true) conditions.push({ "value.user1CData.status": true });
		if (filters.aktivEmas === true) conditions.push({ "value.user1CData.status": false });
		// Level filters (Silver/Gold/Diamond): OR selected levels, then AND with rest
		const levelUroven: string[] = [];
		if (filters.silver === true) levelUroven.push("Silver");
		if (filters.gold === true) levelUroven.push("Gold");
		if (filters.diamond === true) levelUroven.push("Diamond");
		if (levelUroven.length > 0) {
			conditions.push({
				$or: levelUroven.map((uroven) => ({ "value.user1CData.bonusInfo.uroven": uroven }))
			});
		}
	} else if (legacyAudience === "verified") {
		conditions.push({ "value.isVerified": true });
	} else if (legacyAudience === "non_verified") {
		conditions.push({ "value.isVerified": { $ne: true } });
	}
	// When no filter selected, send to all; otherwise AND all selected conditions
	const userFilter: Record<string, unknown> = conditions.length === 0 ? {} : { $and: conditions };
	const cursor = users.find(userFilter as Parameters<typeof users.find>[0]);
	const docs = await cursor.toArray();
	const keys = docs.map((d) => (d as { key?: string }).key).filter((k): k is string => !!k);

	let sentCount = 0;
	let failedCount = 0;
	const CHECK_CANCEL_EVERY = 5;

	const freshBefore = await broadcastJobs.findOne({ _id: id } as Filter<BroadcastJob>);
	if (freshBefore?.status === "cancelled") {
		await broadcastJobs.updateOne({ _id: id } as Filter<BroadcastJob>, {
			$set: { totalUsers: keys.length, sentCount: 0, failedCount: 0, completedAt: new Date() }
		});
		console.log(`[Broadcast] job ${id} was cancelled before sending`);
		return;
	}

	for (let i = 0; i < keys.length; i++) {
		const telegramUserId = keys[i];
		if (i > 0 && i % CHECK_CANCEL_EVERY === 0) {
			const updated = await broadcastJobs.findOne({ _id: id } as Filter<BroadcastJob>);
			if (updated?.status === "cancelled") {
				await broadcastJobs.updateOne({ _id: id } as Filter<BroadcastJob>, {
					$set: {
						totalUsers: keys.length,
						sentCount,
						failedCount,
						completedAt: new Date()
					}
				});
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

	await broadcastJobs.updateOne({ _id: id } as Filter<BroadcastJob>, {
		$set: {
			status: "completed",
			completedAt: new Date(),
			totalUsers: keys.length,
			sentCount,
			failedCount
		}
	});
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
			await broadcastJobs.updateOne({ _id: id } as Filter<BroadcastJob>, {
				$set: { status: "failed", completedAt: new Date(), error: errorMessage }
			});
		}
	}
}

/** Run every minute to process pending broadcast jobs */
export function startBroadcastScheduler(api: Api): void {
	cron.schedule("* * * * *", () => runBroadcastCycle(api));
	console.log("[Broadcast] scheduler started: checks for pending jobs every minute");
}
