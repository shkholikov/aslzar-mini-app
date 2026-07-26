/**
 * Admin → API proxy for one user's 1C referral list.
 *
 * Auth flow mirrors app/api/sync-1c/route.ts: the admin cookie session is validated here, then a
 * server-side fetch to apps/api with `Authorization: Bearer ${API_INTERNAL_KEY}`. The browser never
 * sees the API key, and the admin app never talks to 1C directly.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin, hasPermission } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL || "https://api.aslzarbot.uz";
const API_INTERNAL_KEY = process.env.API_INTERNAL_KEY || "";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const admin = await getAuthenticatedAdmin(request);
	if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	if (!hasPermission(admin, "users")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	if (!API_INTERNAL_KEY) {
		return NextResponse.json({ error: "API_INTERNAL_KEY env var not configured" }, { status: 500 });
	}

	const { id } = await params;

	try {
		const res = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(id)}/referrals`, {
			method: "GET",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_INTERNAL_KEY}` },
			cache: "no-store"
		});
		const body = await res.json().catch(() => ({}));
		return NextResponse.json(body, { status: res.status });
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "API request failed" }, { status: 502 });
	}
}
