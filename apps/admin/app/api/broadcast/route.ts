import { NextResponse, type NextRequest } from "next/server";
import { createBroadcastJob, getBroadcastJobs, type BroadcastAudienceFilters } from "@/lib/db";
import { getAuthenticatedAdmin, hasPermission } from "@/lib/auth";
import { parseMediaBody, parseButtonBody, checkAlbumButtonConflict } from "@/lib/broadcast-validation";

/**
 * GET /api/broadcast
 * Returns recent broadcast jobs
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "broadcast")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const jobs = await getBroadcastJobs();
		return NextResponse.json({ jobs }, { status: 200 });
	} catch (error) {
		console.error("Error fetching broadcast jobs:", error);
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
 * POST /api/broadcast
 * Creates a new broadcast job (pending). Bot processes it within ~1 minute.
 */
export async function POST(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "broadcast")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = (await request.json()) as unknown;
		const b = (body ?? {}) as Record<string, unknown>;
		const message = typeof b.message === "string" ? b.message.trim() : "";
		if (!message) {
			return NextResponse.json({ error: "message is required and must be a non-empty string" }, { status: 400 });
		}

		const raw = b.audienceFilters as Record<string, unknown> | undefined;
		const hasAny =
			raw &&
			typeof raw === "object" &&
			(raw.verified === true ||
				raw.nonVerified === true ||
				raw.aktiv === true ||
				raw.aktivEmas === true ||
				raw.silver === true ||
				raw.gold === true ||
				raw.diamond === true ||
				raw.lastVisit === true ||
				raw.lastVisitNo === true ||
				raw.contractFirst === true ||
				raw.contractFirstNo === true);
		const audienceFilters: BroadcastAudienceFilters | undefined =
			hasAny && raw
				? {
						...(raw.verified === true && { verified: true }),
						...(raw.nonVerified === true && { nonVerified: true }),
						...(raw.aktiv === true && { aktiv: true }),
						...(raw.aktivEmas === true && { aktivEmas: true }),
						...(raw.silver === true && { silver: true }),
						...(raw.gold === true && { gold: true }),
						...(raw.diamond === true && { diamond: true }),
						...(raw.lastVisit === true && { lastVisit: true }),
						...(raw.lastVisitNo === true && { lastVisitNo: true }),
						...(raw.contractFirst === true && { contractFirst: true }),
						...(raw.contractFirstNo === true && { contractFirstNo: true })
					}
				: undefined;

		const mediaResult = parseMediaBody(b);
		if (!mediaResult.ok) {
			return NextResponse.json({ error: mediaResult.error }, { status: 400 });
		}
		const media = mediaResult.value;

		const buttonResult = parseButtonBody(b);
		if (!buttonResult.ok) {
			return NextResponse.json({ error: buttonResult.error }, { status: 400 });
		}
		const button = buttonResult.value;

		const conflict = checkAlbumButtonConflict(media, button);
		if (conflict) {
			return NextResponse.json({ error: conflict }, { status: 400 });
		}

		const job = await createBroadcastJob(message, audienceFilters, media, button);
		return NextResponse.json({ job }, { status: 201 });
	} catch (error) {
		console.error("Error creating broadcast job:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
