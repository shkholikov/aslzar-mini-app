import { NextRequest, NextResponse } from "next/server";

// 1C API configuration from environment variables
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_USERNAME = process.env.API_USERNAME || "";
const API_PASSWORD = process.env.API_PASSWORD || "";

/**
 * GET /api/referral
 * Fetches the list of referrals for a given user from 1C API.
 *
 * Query parameters:
 * - userId: string (required) - Telegram user ID
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const clientId = searchParams.get("clientId");

		// Validate userId parameter
		if (!clientId) {
			return NextResponse.json({ error: "clientId parameter is required" }, { status: 400 });
		}

		// Validate environment variables
		if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
			return NextResponse.json({ error: "1C API configuration is missing" }, { status: 500 });
		}

		// Build the endpoint URL for fetching referrals
		const endpoint = `${API_BASE_URL}listReferals`;

		// Prepare Basic Auth header
		const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			"Authorization": `Basic ${auth}`
		};

		// Call 1C API to fetch the user's referral list
		const response = await fetch(endpoint, {
			method: "POST",
			headers,
			body: JSON.stringify({
				clientId: clientId
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("1C API error (fetching referrals):", errorText);
			return NextResponse.json({ error: "Failed to fetch user referrals from 1C API", details: errorText }, { status: response.status });
		}

		const data = await response.json();
		return NextResponse.json(data, { status: 200 });
	} catch (error) {
		console.error("Error fetching user referrals:", error);
		return NextResponse.json(
			{ error: "Internal server error while fetching referrals", details: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
