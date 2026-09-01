import { config } from "../config";

/**
 * ASLZAR ID catalogue API client (https://api.aslzarid.uz).
 *
 * Read-only product catalogue, synced from 1C nightly at 02:00 Asia/Tashkent. Proxied to the
 * miniapp as /v1/catalog/* — the key must never reach the browser, and the upstream rate limit
 * (60 req/min) is per key and therefore shared by every user at once, which is why the route
 * layer caches. Spec: https://api.aslzarid.uz/openapi.json
 *
 * Mirrors integrations/aslzar1c.ts, with two deliberate differences:
 *   - paths carry a LEADING slash, because ASLZAR_ID_BASE_URL has no trailing one (1C's does)
 *   - requests time out; aslzar1c.ts has no AbortController, so a hung upstream hangs the request
 */

const TIMEOUT_MS = 8000;

export class AslzarIdError extends Error {
	constructor(
		public readonly status: number,
		public readonly bodyText: string
	) {
		super(`ASLZAR ID API error (${status}): ${bodyText.slice(0, 200)}`);
		this.name = "AslzarIdError";
	}
}

/** Thrown when the key is missing, so the route can answer 503 rather than a confusing 502. */
export class AslzarIdNotConfiguredError extends Error {
	constructor() {
		super("ASLZAR ID API not configured (ASLZAR_ID_API_KEY missing)");
		this.name = "AslzarIdNotConfiguredError";
	}
}

export function aslzarIdConfigured(): boolean {
	return Boolean(config.ASLZAR_ID_BASE_URL && config.ASLZAR_ID_API_KEY);
}

async function callCatalog<T>(path: string, query?: URLSearchParams): Promise<T> {
	if (!aslzarIdConfigured()) throw new AslzarIdNotConfiguredError();

	const qs = query && [...query.keys()].length > 0 ? `?${query.toString()}` : "";
	const url = `${config.ASLZAR_ID_BASE_URL}${path}${qs}`;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			headers: {
				"X-API-Key": config.ASLZAR_ID_API_KEY,
				Accept: "application/json"
			},
			signal: controller.signal
		});

		if (!res.ok) {
			// Upstream errors are RFC 9457 problem+json; keep the body for the log, not the client.
			const text = await res.text().catch(() => "");
			throw new AslzarIdError(res.status, text);
		}
		return (await res.json()) as T;
	} catch (err) {
		if (err instanceof Error && err.name === "AbortError") {
			throw new AslzarIdError(504, `Timed out after ${TIMEOUT_MS}ms`);
		}
		throw err;
	} finally {
		clearTimeout(timer);
	}
}

/** Product list. Callers pass an already-allowlisted query — see routes/internal/catalog.ts. */
export async function listProducts(query: URLSearchParams): Promise<unknown> {
	return callCatalog("/v1/products", query);
}

/** One product by its 1C id, e.g. `00-0000067`. */
export async function getProduct(productId: string): Promise<unknown> {
	return callCatalog(`/v1/products/${encodeURIComponent(productId)}`);
}

/** Curated categories. Never paged upstream. */
export async function listCategories(): Promise<unknown> {
	return callCatalog("/v1/categories");
}
