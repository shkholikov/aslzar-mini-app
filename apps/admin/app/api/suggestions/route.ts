import { NextResponse, type NextRequest } from "next/server";
import { getSuggestions } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

/**
 * GET /api/suggestions
 * Returns recent suggestions/complaints from users (same collection as webapp)
 */
export async function GET(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const suggestions = await getSuggestions();
		return NextResponse.json({ suggestions }, { status: 200 });
	} catch (error) {
		console.error("Error fetching suggestions:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
