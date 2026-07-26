import { NextResponse, type NextRequest } from "next/server";
import { getReferralSettings, getReferralStats, updateReferralSettings } from "@/lib/db";
import { getAuthenticatedAdmin, hasPermission, isSuperAdmin } from "@/lib/auth";

/** Same ceiling as the per-user limit — guards against a typo becoming an effectively unlimited cap. */
const MAX_REFERRAL_LIMIT = 1000;

/**
 * GET /api/referral-settings
 * Returns the platform default referral limit plus an overview of referral usage.
 * Readable by anyone with the `users` permission — the users list needs the default to
 * render each row's effective limit. Writing stays superadmin-only (see PATCH).
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "users")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const settings = await getReferralSettings();
		const stats = await getReferralStats(settings.defaultReferralLimit);

		return NextResponse.json({ settings, stats }, { status: 200 });
	} catch (error) {
		console.error("Error fetching referral settings:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

/**
 * PATCH /api/referral-settings
 * Sets the platform-wide default. Superadmin only — this affects every user without an
 * individual limit at once.
 */
export async function PATCH(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!isSuperAdmin(admin)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await request.json();
		const value = body?.defaultReferralLimit;
		if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_REFERRAL_LIMIT) {
			return NextResponse.json({ error: `Limit 0 dan ${MAX_REFERRAL_LIMIT} gacha butun son bo'lishi kerak` }, { status: 400 });
		}

		await updateReferralSettings(value, admin.username);
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error updating referral settings:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
