import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";

/**
 * GET /api/users
 * Fetches all users from the database
 */
export async function GET() {
	try {
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
