import "./config";
import { I1CUserData } from "./types";

// 1C API configuration from environment variables
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_USERNAME = process.env.API_USERNAME || "";
const API_PASSWORD = process.env.API_PASSWORD || "";

/**
 * Result of a 1C phone lookup. `not_found` means 1C answered that there is no such client;
 * `error` means we don't know (1C unreachable, timed out, or answered with an HTTP error).
 * Callers that report "is a client" to someone else must not turn `error` into "no".
 */
export type LookupResult = { status: "found"; data: Partial<I1CUserData> } | { status: "not_found" } | { status: "error" };

/**
 * Searches for a user in 1C API by phone number
 * @param phone - Phone number (with or without + prefix)
 * @param timeoutMs - Give up after this long (returns null). Unset = no limit, as before.
 * @returns User data if found (status code === 0), null otherwise — "not found" and "1C failed"
 * look the same here; use lookupUserByPhone when the difference matters.
 */
export async function searchUserByPhone(phone: string, timeoutMs?: number): Promise<Partial<I1CUserData> | null> {
	const result = await lookupUserByPhone(phone, timeoutMs);
	return result.status === "found" ? result.data : null;
}

/** Like searchUserByPhone, but tells "not a client" apart from "1C didn't answer". Never throws. */
export async function lookupUserByPhone(phone: string, timeoutMs?: number): Promise<LookupResult> {
	try {
		// Validate environment variables
		if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
			console.error("1C API configuration is missing");
			return { status: "error" };
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
			}),
			...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) })
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`1C API error (search) status=${response.status}:`, errorText);
			return { status: "error" };
		}

		const data = (await response.json()) as Partial<I1CUserData>;

		// Check if status code === 0 (user exists)
		if (data.code === 0) {
			return { status: "found", data };
		}

		// 1C answered: no client with this phone
		return { status: "not_found" };
	} catch (error) {
		// "fetch failed" hides the real reason (refused, reset, DNS, TLS) in `cause`.
		// The bot's tsconfig lib predates Error.cause (ES2022); Node sets it all the same.
		const cause = (error as { cause?: unknown } | null)?.cause;
		console.error("Error searching user in 1C API:", error, ...(cause ? ["cause:", cause] : []));
		return { status: "error" };
	}
}

/** 1C records referral dates in shop-local time. Same zone as the payment-reminder cron. */
const TZ = "Asia/Tashkent";

/**
 * Builds the `chislo` referral timestamp 1C expects: `DD.MM.YYYY HH:mm:ss`, Tashkent local time.
 *
 * Built from Intl parts rather than the Date getters, which resolve against the *process*
 * timezone — UTC on Railway, where no TZ is set. That stamped every referral attributed
 * between 00:00 and 05:00 Tashkent onto the previous calendar day.
 *
 * `hourCycle: "h23"` matters: the `hour12: false` shorthand can render midnight as "24".
 */
function tashkentChislo(now: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	}).formatToParts(now);
	const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? "";
	return `${part("day")}.${part("month")}.${part("year")} ${part("hour")}:${part("minute")}:${part("second")}`;
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

		const chislo = tashkentChislo();

		// Build the endpoint URL
		const endpoint = `${API_BASE_URL}addReferral`;

		// Prepare Basic Auth header
		const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			"Authorization": `Basic ${auth}`
		};

		// Ensure phone number always has + prefix for consistent format in 1C
		const formattedPhone = referredUserPhone.startsWith("+") ? referredUserPhone : `+${referredUserPhone}`;

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
