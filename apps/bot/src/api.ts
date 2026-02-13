import "./config";
import { I1CUserData } from "./types";

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

/**
 * Adds a referral to a user's referral list in 1C API
 * @param clientId - The referrer's clientId from 1C
 * @param referredUserPhone - Phone number of the person who opened the referral link
 * @param referredUserFirstName - First name of the referred user
 * @param referredUserLastName - Last name of the referred user
 * @returns true if successful, false otherwise
 */
export async function addReferral(
	clientId: string,
	referredUserPhone: string,
	referredUserFirstName: string,
	referredUserLastName: string
): Promise<boolean> {
	try {
		// Validate environment variables
		if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
			console.error("1C API configuration is missing");
			return false;
		}

		// Format date as DD.MM.YYYY HH:mm:ss
		// TODO: should be fixed later - date format handling is manual here
		const now = new Date();
		const day = String(now.getDate()).padStart(2, "0");
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const year = now.getFullYear();
		const hours = String(now.getHours()).padStart(2, "0");
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");
		const chislo = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
		// ------------------------------------------------------------

		// Build the endpoint URL
		const endpoint = `${API_BASE_URL}addReferral`;

		// Prepare Basic Auth header
		const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			"Authorization": `Basic ${auth}`
		};

		// Remove + prefix from phone number if present (API expects phone without +)
		const formattedPhone = referredUserPhone.startsWith("+") ? referredUserPhone.slice(1) : referredUserPhone;

		// Prepare request body
		const requestBody = {
			clientId: clientId,
			chislo: chislo,
			familiya: referredUserLastName || "",
			imya: referredUserFirstName || "",
			otchestvo: "",
			phone: formattedPhone
		};

		// Call 1C API
		const response = await fetch(endpoint, {
			method: "POST",
			headers,
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("1C API error (addReferral):", errorText);
			return false;
		}

		const result = await response.json();

		// Check if response contains error code (non-zero code means error)
		if (result.code !== undefined && result.code !== 0) {
			console.error("1C API error (addReferral):", result.message || "Unknown error", "Code:", result.code);
			return false;
		}

		console.log("Referral added successfully:", result);
		return true;
	} catch (error) {
		console.error("Error adding referral to 1C API:", error);
		return false;
	}
}
