import { NextResponse, type NextRequest } from "next/server";
import { getAdminStats } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

/**
 * GET /api/stats
 * Returns dashboard stats (total users, verified, non-verified).
 */
export async function GET(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const stats = await getAdminStats();
		return NextResponse.json(stats, { status: 200 });
	} catch (error) {
		console.error("Error fetching stats:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
