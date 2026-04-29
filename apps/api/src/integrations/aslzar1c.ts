import { config } from "../config";

/**
 * 1C ERP API client. Mirrors the endpoints the webapp used to call directly:
 *   - search        (POST)   — phone → user data
 *   - CreateUser    (POST)   — register a new user
 *   - subofficeList (GET)    — branches
 *   - bonusProgram  (GET)    — bonus programs
 *   - listReferals  (POST)   — user's referral list
 *
 * Convention: success = `response.code === 0`. Phones are always sent with `+` prefix.
 */

export class OneCError extends Error {
	constructor(
		public readonly status: number,
		public readonly bodyText: string
	) {
		super(`1C API error (${status}): ${bodyText.slice(0, 200)}`);
	}
}

function authHeaders(): Record<string, string> {
	const credentials = `${config.ASLZAR_1C_USERNAME}:${config.ASLZAR_1C_PASSWORD}`;
	const auth = Buffer.from(credentials).toString("base64");
	return {
		"Content-Type": "application/json",
		"Authorization": `Basic ${auth}`
	};
}

function ensureConfigured(): void {
	if (!config.ASLZAR_1C_BASE_URL || !config.ASLZAR_1C_USERNAME || !config.ASLZAR_1C_PASSWORD) {
		throw new Error("1C API not configured (ASLZAR_1C_BASE_URL / ASLZAR_1C_USERNAME / ASLZAR_1C_PASSWORD missing)");
	}
}

async function call1C<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
	ensureConfigured();
	const url = `${config.ASLZAR_1C_BASE_URL}${path}`;
	const init: RequestInit = {
		method,
		headers: authHeaders()
	};
	if (body !== undefined) init.body = JSON.stringify(body);

	const res = await fetch(url, init);
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new OneCError(res.status, text);
	}
	return (await res.json()) as T;
}

/** Always-prefixed phone (+998…) — 1C search expects the leading `+`. */
function withPlus(phone: string): string {
	return phone.startsWith("+") ? phone : `+${phone}`;
}

export async function searchUserByPhone(phone: string): Promise<Record<string, unknown> & { code?: number }> {
	return call1C("POST", "search", { phone: withPlus(phone) });
}

export async function createUser(input: { phone: string; familiya: string; imya: string }): Promise<Record<string, unknown>> {
	return call1C("POST", "CreateUser", {
		phone: input.phone,
		familiya: input.familiya,
		imya: input.imya
	});
}

export async function listBranches(): Promise<unknown> {
	return call1C("GET", "subofficeList");
}

export async function listBonusPrograms(): Promise<unknown> {
	return call1C("GET", "bonusProgram");
}

export async function listReferrals(clientId: string): Promise<unknown> {
	return call1C("POST", "listReferals", { clientId });
}
