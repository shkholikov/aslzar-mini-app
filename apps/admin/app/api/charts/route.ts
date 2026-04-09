import { NextResponse, type NextRequest } from "next/server";
import { getMonthlyUserGrowth } from "@/lib/db";
import { getAuthenticatedAdmin, hasPermission } from "@/lib/auth";

export async function GET(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "users")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const monthlyGrowth = await getMonthlyUserGrowth();
		return NextResponse.json({ monthlyGrowth });
	} catch (error) {
		console.error("Error fetching chart data:", error);
		return NextResponse.json(
			{ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
