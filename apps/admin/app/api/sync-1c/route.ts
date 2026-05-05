/**
 * Admin → API proxy for the 1C sync endpoints.
 *
 * Auth flow: admin cookie session validated here, then a server-side fetch to
 * apps/api with `Authorization: Bearer ${API_INTERNAL_KEY}`. The browser never
 * sees the API key.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin, isSuperAdmin } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL || "https://api.aslzarbot.uz";
const API_INTERNAL_KEY = process.env.API_INTERNAL_KEY || "";

function authHeaders(): Record<string, string> {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${API_INTERNAL_KEY}`
	};
}

async function ensureAuthorized(request: NextRequest): Promise<NextResponse | null> {
	const admin = await getAuthenticatedAdmin(request);
	if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	if (!isSuperAdmin(admin)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	if (!API_INTERNAL_KEY) {
		return NextResponse.json({ error: "API_INTERNAL_KEY env var not configured" }, { status: 500 });
	}
	return null;
}

export async function GET(request: NextRequest) {
	const denied = await ensureAuthorized(request);
	if (denied) return denied;

	try {
		const res = await fetch(`${API_BASE_URL}/v1/users/syncs?limit=50`, {
			method: "GET",
			headers: authHeaders(),
			cache: "no-store"
		});
		const body = await res.json().catch(() => ({}));
		return NextResponse.json(body, { status: res.status });
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "API request failed" }, { status: 502 });
	}
}

export async function POST(request: NextRequest) {
	const denied = await ensureAuthorized(request);
	if (denied) return denied;

	try {
		const res = await fetch(`${API_BASE_URL}/v1/users/sync`, {
			method: "POST",
			headers: authHeaders(),
			cache: "no-store"
		});
		const body = await res.json().catch(() => ({}));
		return NextResponse.json(body, { status: res.status });
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "API request failed" }, { status: 502 });
	}
}
