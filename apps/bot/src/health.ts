import { readFileSync } from "fs";
import { resolve } from "path";
import { pingDb } from "./db";

/**
 * Health reporting following common practice:
 *   - liveness  (/health)       — is the process up? cheap, no dependencies, always 200.
 *                                 Safe as a platform health-check target: a transient DB blip
 *                                 must not restart the container.
 *   - readiness (/health/ready) — can it serve? pings MongoDB; 200 when ready, 503 when not.
 */

const startedAt = Date.now();

function readVersion(): string {
	try {
		// apps/bot/dist -> repo root is three levels up.
		const pkg = JSON.parse(readFileSync(resolve(__dirname, "../../../package.json"), "utf8")) as { version?: string };
		return pkg.version ?? "unknown";
	} catch {
		return "unknown";
	}
}

const VERSION = readVersion();

export interface HealthReport {
	status: "ok" | "error";
	version: string;
	uptime: number; // seconds since process start
	timestamp: string; // ISO-8601
	checks?: Record<string, "ok" | "error">;
}

function uptimeSeconds(): number {
	return Math.floor((Date.now() - startedAt) / 1000);
}

/** Liveness: the process is running. */
export function liveness(): HealthReport {
	return {
		status: "ok",
		version: VERSION,
		uptime: uptimeSeconds(),
		timestamp: new Date().toISOString()
	};
}

/** Readiness: dependencies are reachable. `healthy` drives the HTTP status (200 vs 503). */
export async function readiness(): Promise<{ report: HealthReport; healthy: boolean }> {
	const mongoOk = await pingDb();
	const healthy = mongoOk;
	return {
		healthy,
		report: {
			status: healthy ? "ok" : "error",
			version: VERSION,
			uptime: uptimeSeconds(),
			timestamp: new Date().toISOString(),
			checks: { mongodb: mongoOk ? "ok" : "error" }
		}
	};
}
