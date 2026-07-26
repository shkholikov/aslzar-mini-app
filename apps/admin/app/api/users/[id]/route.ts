import { NextResponse, type NextRequest } from "next/server";
import { getUserByKey, updateUserReferralLimit } from "@/lib/db";
import { getAuthenticatedAdmin, hasPermission } from "@/lib/auth";

interface RouteParams {
	params: Promise<{ id: string }>;
}

/** Guards against a typo turning into an effectively unlimited referral cap. */
const MAX_REFERRAL_LIMIT = 1000;

/**
 * GET /api/users/[id]
 * Fetches a single user document by session key (Telegram user ID).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "users")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { id } = await params;
		const user = await getUserByKey(id);
		if (!user) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		return NextResponse.json({ user }, { status: 200 });
	} catch (error) {
		console.error("Error fetching user:", error);
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
 * PATCH /api/users/[id]
 * Updates the user's referral limit. `referralLimit: null` restores the platform default.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "users")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { id } = await params;
		const body = await request.json();
		const raw = body?.referralLimit;

		if (raw !== null && (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > MAX_REFERRAL_LIMIT)) {
			return NextResponse.json({ error: `referralLimit 0 dan ${MAX_REFERRAL_LIMIT} gacha butun son yoki null bo'lishi kerak` }, { status: 400 });
		}

		const updated = await updateUserReferralLimit(id, raw, admin.username);
		if (!updated) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error updating user referral limit:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
