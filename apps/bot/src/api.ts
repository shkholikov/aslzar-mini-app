import { config } from "dotenv";
import { I1CUserData } from "./types";

config();

// 1C API configuration from environment variables
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_USERNAME = process.env.API_USERNAME || "";
const API_PASSWORD = process.env.API_PASSWORD || "";

/**
 * Searches for a user in 1C API by phone number
 * @param phone - Phone number (with or without + prefix)
 * @returns User data if found (status code === 0), null otherwise
 */
export async function searchUserByPhone(phone: string): Promise<Partial<I1CUserData> | null> {
	try {
		// Validate environment variables
		if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
			console.error("1C API configuration is missing");
			return null;
		}

		// Format phone number with + prefix
		const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

		// Build the endpoint URL
		const endpoint = `${API_BASE_URL}search`;

		// Prepare Basic Auth header
		const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			"Authorization": `Basic ${auth}`
		};

		// Call 1C API
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
			return null;
		}

		const data = (await response.json()) as Partial<I1CUserData>;

		// Check if status code === 0 (user exists)
		if (data.code === 0) {
			return data;
		}

		// User not found or other status code
		return null;
	} catch (error) {
		console.error("Error searching user in 1C API:", error);
		return null;
	}
}
