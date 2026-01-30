import { NextRequest, NextResponse } from "next/server";
import { insertSuggestion } from "@/lib/db";

/**
 * POST /api/suggestions
 * Stores a suggestion or complaint in MongoDB
 *
 * Request body:
 * - text: string (required) - The suggestion or complaint content
 * - userId?: string (optional) - Telegram user ID
 * - firstName?: string (optional) - Telegram user first name
 * - lastName?: string (optional) - Telegram user last name
 * - username?: string (optional) - Telegram username
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { text, userId, firstName, lastName, username } = body;

		if (!text || typeof text !== "string") {
			return NextResponse.json({ error: "text is required and must be a string" }, { status: 400 });
		}

		const trimmedText = text.trim();
		if (!trimmedText) {
			return NextResponse.json({ error: "text cannot be empty" }, { status: 400 });
		}

		const options =
			userId || firstName || lastName || username
				? {
						...(userId && typeof userId === "string" && { userId }),
						...(firstName && typeof firstName === "string" && { firstName }),
						...(lastName && typeof lastName === "string" && { lastName }),
						...(username && typeof username === "string" && { username })
					}
				: undefined;

		await insertSuggestion(trimmedText, options);

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error saving suggestion:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}
