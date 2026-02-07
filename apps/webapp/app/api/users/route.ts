import { NextRequest, NextResponse } from "next/server";
import { getUserDataByUserId, updateUserSession1CData } from "@/lib/db";

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

		return NextResponse.json(userData, { status: 200 });
	} catch (error) {
		console.error("Error searching user:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}

/**
 * POST /api/users
 * Creates a new user in 1C API and updates MongoDB session with 1C data so the bot treats them as verified.
 *
 * Request body:
 * - firstName: string (required) - User's first name
 * - lastName: string (required) - User's last name
 * - phone: string (required) - User's phone number in format +998XXXXXXXXX
 * - userId: string (optional) - Telegram user ID; if provided, session in MongoDB is updated with 1C data
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { firstName, lastName, phone, userId } = body;

		// Validate required fields
		if (!firstName || !lastName || !phone) {
			return NextResponse.json({ error: "firstName, lastName, and phone are required" }, { status: 400 });
		}

		// Validate environment variables
		if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
			return NextResponse.json({ error: "1C API configuration is missing" }, { status: 500 });
		}

		const endpointCreate = `${API_BASE_URL}CreateUser`;
		const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			"Authorization": `Basic ${auth}`
		};

		// Call 1C API to create user
		const response = await fetch(endpointCreate, {
			method: "POST",
			headers,
			body: JSON.stringify({
				phone: phone,
				familiya: lastName,
				imya: firstName
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("1C API error:", errorText);
			return NextResponse.json({ error: "Failed to create user in 1C API", details: errorText }, { status: response.status });
		}

		const data = await response.json();

		// If Telegram userId was sent, fetch full 1C data and update session so bot (reminders, referrals) sees user as verified
		if (userId && typeof userId === "string") {
			const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
			const searchResponse = await fetch(`${API_BASE_URL}search`, {
				method: "POST",
				headers,
				body: JSON.stringify({ phone: formattedPhone })
			});
			if (searchResponse.ok) {
				const searchData = (await searchResponse.json()) as { code?: number };
				if (searchData.code === 0) {
					await updateUserSession1CData(userId, searchData as Record<string, unknown>, true);
				}
			}
		}

		return NextResponse.json(data, { status: 200 });
	} catch (error) {
		console.error("Error creating user:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}
