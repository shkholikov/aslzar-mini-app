import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth";

/**
 * In-memory sliding-window rate limiter keyed by API key id.
 *
 * Trade-offs (accepted for v1):
 * - Per-instance, not global — each Railway replica counts independently.
 *   If we scale out horizontally, migrate to Redis.
 * - State lost on restart — tolerable for rate-limit purposes.
 * - Memory bounded by (active keys * MAX_REQUESTS * 8 bytes per timestamp).
 *   ~500 KB at 1000 active keys.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

const hits = new Map<string, number[]>();

export function rateLimitByApiKey(req: AuthedRequest, res: Response, next: NextFunction): void {
	const keyId = req.apiKey?.id;
	if (!keyId) {
		// Should never happen — requireApiKey runs first and short-circuits on failure.
		next();
		return;
	}

	const now = Date.now();
	const cutoff = now - WINDOW_MS;
	const recent = (hits.get(keyId) ?? []).filter((t) => t > cutoff);

	if (recent.length >= MAX_REQUESTS) {
		const oldest = recent[0];
		const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
		res.setHeader("Retry-After", String(retryAfter));
		res.status(429).json({
			ok: false,
			error: {
				code: "rate_limited",
				message: `Rate limit exceeded: ${MAX_REQUESTS} requests per minute per API key`,
				retry_after: retryAfter
			}
		});
		return;
	}

	recent.push(now);
	hits.set(keyId, recent);
	next();
}
