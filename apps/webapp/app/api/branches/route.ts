import { NextResponse } from "next/server";

// 1C API configuration from environment variables
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_USERNAME = process.env.API_USERNAME || "";
const API_PASSWORD = process.env.API_PASSWORD || "";

export async function GET() {
	try {
		// Validate environment variables
		if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
			return NextResponse.json({ error: "1C API configuration is missing" }, { status: 500 });
		}

		// Step 2: Build the full endpoint URL
		const endpoint = `${API_BASE_URL}subofficeList`;

		// Prepare Basic Auth header
		const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			"Authorization": `Basic ${auth}`
		};

		// Step 3: call 1C API to fetch branches list
		const response = await fetch(endpoint, {
			method: "GET",
			headers
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("1C API error:", errorText);
			return NextResponse.json({ error: "Failed to fetch branches from 1C API", details: errorText }, { status: response.status });
		}

		const data = await response.json();
		return NextResponse.json(data, { status: 200 });
	} catch (error) {
		console.error("Error fetching branches:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}
