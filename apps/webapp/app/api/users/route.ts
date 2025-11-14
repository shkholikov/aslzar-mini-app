import { NextRequest, NextResponse } from "next/server";
import { getUserDataByUserId } from "@/lib/db";

// 1C API configuration from environment variables
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_USERNAME = process.env.API_USERNAME || "";
const API_PASSWORD = process.env.API_PASSWORD || "";

/**
 * GET /api/users
 * Verifies user in database and fetches fresh user data from 1C API
 *
 * Query parameters:
 * - userId: string (required) - Telegram user ID
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const userId = searchParams.get("userId");

		// Validate userId parameter
		if (!userId) {
			return NextResponse.json({ error: "User ID parameter is required" }, { status: 400 });
		}

		// Step 1: Get current user's session data from MongoDB
		const tgSessionData = await getUserDataByUserId(userId);

		if (!tgSessionData?.phone_number) {
			return NextResponse.json({ error: "User not found or phone number not available" }, { status: 404 });
		}

		// Validate environment variables
		if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
			return NextResponse.json({ error: "1C API configuration is missing" }, { status: 500 });
		}

		// Step 2: Build the full endpoint URL
		const endpoint = `${API_BASE_URL}search`;

		// Prepare Basic Auth header
		const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			"Authorization": `Basic ${auth}`
		};

		// Step 3: Format phone number with + prefix and call 1C API
		const phone = tgSessionData.phone_number;
		const formattedPhone = `+${phone}`;
		const response = await fetch(endpoint, {
			method: "POST",
			headers,
			body: JSON.stringify({
				phone: formattedPhone
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("1C API error:", errorText);
			return NextResponse.json({ error: "Failed to search user in 1C API", details: errorText }, { status: response.status });
		}

		const data = await response.json();
		const userData = { ...data, tgData: tgSessionData };

		console.log(userData);

		return NextResponse.json(userData, { status: 200 });
	} catch (error) {
		console.error("Error searching user:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}
