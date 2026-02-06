import { NextResponse } from "next/server";
import { createBroadcastJob, getBroadcastJobs } from "@/lib/db";

/**
 * GET /api/broadcast
 * Returns recent broadcast jobs
 */
export async function GET() {
	try {
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
 * Body: { message: string }
 * Creates a new broadcast job (pending). Bot processes it within ~1 minute.
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const message = typeof body?.message === "string" ? body.message.trim() : "";
		if (!message) {
			return NextResponse.json({ error: "message is required and must be a non-empty string" }, { status: 400 });
		}
		const job = await createBroadcastJob(message);
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
