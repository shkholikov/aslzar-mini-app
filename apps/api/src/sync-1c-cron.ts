/**
 * Daily 1C sync cron — runs at 02:00 Asia/Tashkent every day.
 * Skips if a sync is already in progress (e.g. an admin clicked the button just before).
 */
import cron from "node-cron";
import { createSync1CJob, isSync1CRunning, processSync1CJob } from "./sync-1c";

const TZ = "Asia/Tashkent";
const CRON_EXPR = "0 2 * * *";

export function startSync1CCron(): void {
	cron.schedule(
		CRON_EXPR,
		async () => {
			try {
				if (await isSync1CRunning()) {
					console.log("[Sync1C cron] another sync is already running, skipping today");
					return;
				}
				const jobId = await createSync1CJob("cron");
				console.log(`[Sync1C cron] starting daily sync, job: ${jobId}`);
				await processSync1CJob(jobId);
			} catch (err) {
				console.error("[Sync1C cron] failed to start daily sync:", err);
			}
		},
		{ timezone: TZ }
	);
	console.log(`[Sync1C cron] scheduled: every day at 02:00 ${TZ}`);
}
