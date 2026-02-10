import { NextResponse, type NextRequest } from "next/server";
import { getAllUsers } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

/**
 * GET /api/users
 * Fetches all users from the database
 */
export async function GET(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Fetch all users from MongoDB
		const users = await getAllUsers();

		return NextResponse.json({ users, count: users.length }, { status: 200 });
	} catch (error) {
		console.error("Error fetching users:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
