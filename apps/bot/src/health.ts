import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Liveness health report for GET /health: is the process up?
 * Cheap, no dependencies, always 200 — safe as a platform health-check target
 * (a transient DB blip must not restart the container).
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
	status: "ok";
	version: string;
	uptime: number; // seconds since process start
	timestamp: string; // ISO-8601
}

/** Liveness: the process is running. */
export function liveness(): HealthReport {
	return {
		status: "ok",
		version: VERSION,
		uptime: Math.floor((Date.now() - startedAt) / 1000),
		timestamp: new Date().toISOString()
	};
}
