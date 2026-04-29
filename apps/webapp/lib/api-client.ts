/**
 * Typed fetch wrapper for the internal API at api.aslzarbot.uz.
 *
 * Auth model: every request carries `Authorization: tma <initDataRaw>`. The API
 * verifies the HMAC against BOT_TOKEN and rejects stale or forged payloads
 * (see apps/api/src/auth-miniapp.ts).
 *
 * `initData` is read lazily from `window.Telegram.WebApp.initData` on every
 * call so that if the WebApp re-issues a fresh signature mid-session, the
 * next request automatically uses it.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.aslzarbot.uz";

declare global {
	interface Window {
		Telegram?: {
			WebApp?: {
				initData?: string;
			};
		};
	}
}

function getInitData(): string {
	if (typeof window === "undefined") return "";
	return window.Telegram?.WebApp?.initData ?? "";
}

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly body: unknown,
		message: string
	) {
		super(message);
	}
}

export type ApiRequestOptions = {
	method?: "GET" | "POST";
	body?: unknown;
	query?: Record<string, string | number | undefined>;
	signal?: AbortSignal;
};

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
	const { method = "GET", body, query, signal } = options;

	const url = new URL(`${API_BASE_URL}${path}`);
	if (query) {
		for (const [k, v] of Object.entries(query)) {
			if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
		}
	}

	const initData = getInitData();
	const headers: Record<string, string> = {
		"Content-Type": "application/json"
	};
	if (initData) {
		headers["Authorization"] = `tma ${initData}`;
	}

	const res = await fetch(url.toString(), {
		method,
		headers,
		signal,
		...(body !== undefined && { body: JSON.stringify(body) })
	});

	const isJson = (res.headers.get("content-type") || "").includes("application/json");
	const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

	if (!res.ok) {
		const message = (isJson && payload && typeof payload === "object" && "error" in payload && (payload as { error: unknown }).error) || res.statusText;
		throw new ApiError(res.status, payload, String(message));
	}

	return payload as T;
}

/** Default SWR fetcher — pass the path string as the SWR key. */
export const apiFetcher = <T>(path: string): Promise<T> => apiRequest<T>(path);
