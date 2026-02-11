import { NextResponse, type NextRequest } from "next/server";
import { createBroadcastJob, getBroadcastJobs, type BroadcastAudience } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

const VALID_AUDIENCES: BroadcastAudience[] = ["all", "verified", "non_verified"];

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
 * Body: { message: string, audience?: "all" | "verified" | "non_verified" }
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
		const rawAudience = body?.audience;
		const audience: BroadcastAudience =
			typeof rawAudience === "string" && VALID_AUDIENCES.includes(rawAudience as BroadcastAudience)
				? (rawAudience as BroadcastAudience)
				: "all";
		const job = await createBroadcastJob(message, audience);
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
