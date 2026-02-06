import { NextResponse } from "next/server";
import { getSuggestions } from "@/lib/db";

/**
 * GET /api/suggestions
 * Returns recent suggestions/complaints from users (same collection as webapp)
 */
export async function GET() {
	try {
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
