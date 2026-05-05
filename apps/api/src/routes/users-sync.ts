/**
 * Admin-triggered 1C sync endpoints.
 *
 * POST /v1/users/sync                 — kick off a sync (returns 202 + jobId; processes in background)
 * GET  /v1/users/syncs?limit=50       — return recent sync jobs (newest first); jobs[0] is the latest
 *
 * Both require an API key (Bearer token validated by requireApiKey).
 */
import type { Request, Response } from "express";
import { createSync1CJob, isSync1CRunning, listSync1CJobs, processSync1CJob } from "../sync-1c";

export async function syncUsersHandler(_req: Request, res: Response): Promise<void> {
	try {
		if (await isSync1CRunning()) {
			res.status(409).json({
				ok: false,
				error: { code: "sync_already_running", message: "A sync is already in progress" }
			});
			return;
		}
		const jobId = await createSync1CJob("admin");
		// Fire-and-forget: don't await the work, return immediately
		processSync1CJob(jobId).catch((err) => {
			console.error(`[Sync1C admin] background processing failed for ${jobId}:`, err);
		});
		res.status(202).json({ ok: true, jobId: jobId.toString() });
	} catch (err) {
		console.error("[users/sync] failed to start:", err);
		res.status(500).json({
			ok: false,
			error: { code: "internal_error", message: err instanceof Error ? err.message : "Unknown error" }
		});
	}
}

export async function listSyncsHandler(req: Request, res: Response): Promise<void> {
	try {
		const limitRaw = req.query.limit;
		const limit = typeof limitRaw === "string" ? parseInt(limitRaw, 10) || 50 : 50;
		const jobs = await listSync1CJobs(limit);
		res.status(200).json({ ok: true, jobs });
	} catch (err) {
		console.error("[users/syncs] failed to fetch:", err);
		res.status(500).json({
			ok: false,
			error: { code: "internal_error", message: err instanceof Error ? err.message : "Unknown error" }
		});
	}
}
