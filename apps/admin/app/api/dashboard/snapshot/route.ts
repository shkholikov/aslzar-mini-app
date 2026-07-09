import { NextResponse, type NextRequest } from "next/server";
import { storeDailySnapshot } from "@/lib/dashboard";

/**
 * GET /api/dashboard/snapshot
 * Records today's dashboard totals into `dashboard_snapshots` (idempotent per day).
 * Meant to be called once daily by Vercel Cron. Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` when the CRON_SECRET env var is set.
 */
export async function GET(request: NextRequest) {
	const secret = process.env.CRON_SECRET;
	if (secret) {
		const auth = request.headers.get("authorization");
		if (auth !== `Bearer ${secret}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
	}

	try {
		const result = await storeDailySnapshot();
		return NextResponse.json({ ok: true, ...result }, { status: 200 });
	} catch (error) {
		console.error("Error storing dashboard snapshot:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
