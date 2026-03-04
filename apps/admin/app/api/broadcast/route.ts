import { NextResponse, type NextRequest } from "next/server";
import { createBroadcastJob, getBroadcastJobs, type BroadcastAudienceFilters } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

/**
 * GET /api/broadcast
 * Returns recent broadcast jobs
 */
export async function GET(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
 * Body: { message: string, audienceFilters?: { verified?, nonVerified?, aktiv?, aktivEmas? } }
 * When no filter is selected, sends to all bot users. When any filter is selected, ANDs them.
 * Creates a new broadcast job (pending). Bot processes it within ~1 minute.
 */
export async function POST(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const message = typeof body?.message === "string" ? body.message.trim() : "";
		if (!message) {
			return NextResponse.json({ error: "message is required and must be a non-empty string" }, { status: 400 });
		}
		const raw = body?.audienceFilters;
		const hasAny =
			raw &&
			typeof raw === "object" &&
			(raw.verified === true ||
				raw.nonVerified === true ||
				raw.aktiv === true ||
				raw.aktivEmas === true ||
				raw.silver === true ||
				raw.gold === true ||
				raw.diamond === true);
		const audienceFilters: BroadcastAudienceFilters | undefined =
			hasAny && raw && typeof raw === "object"
				? {
						...(raw.verified === true && { verified: true }),
						...(raw.nonVerified === true && { nonVerified: true }),
						...(raw.aktiv === true && { aktiv: true }),
						...(raw.aktivEmas === true && { aktivEmas: true }),
						...(raw.silver === true && { silver: true }),
						...(raw.gold === true && { gold: true }),
						...(raw.diamond === true && { diamond: true })
					}
				: undefined;
		const job = await createBroadcastJob(message, audienceFilters);
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
