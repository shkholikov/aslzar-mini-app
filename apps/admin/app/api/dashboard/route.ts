import { NextResponse, type NextRequest } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { getAuthenticatedAdmin } from "@/lib/auth";

/**
 * GET /api/dashboard
 * Returns the full business-analytics payload (KPI cards with trends, sales chart,
 * funnel, loyalty tiers, payments, referrals, system health).
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const force = request.nextUrl.searchParams.get("refresh") === "1";
		const data = await getDashboardData(force);
		return NextResponse.json(data, { status: 200 });
	} catch (error) {
		console.error("Error fetching dashboard data:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
