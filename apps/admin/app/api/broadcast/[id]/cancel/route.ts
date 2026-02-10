import { NextResponse, type NextRequest } from "next/server";
import { cancelBroadcastJob } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

/**
 * PATCH /api/broadcast/[id]/cancel
 * Cancels a broadcast job (pending or processing). No-op if already completed/failed/cancelled.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json({ error: "Job id is required" }, { status: 400 });
		}

		const cancelled = await cancelBroadcastJob(id);
		if (!cancelled) {
			return NextResponse.json(
				{ error: "Job not found or already completed/cancelled" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ cancelled: true }, { status: 200 });
	} catch (error) {
		console.error("Error cancelling broadcast job:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
