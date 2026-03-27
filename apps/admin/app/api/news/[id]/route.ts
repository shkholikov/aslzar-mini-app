import { NextResponse, type NextRequest } from "next/server";
import { deleteNewsItem, toggleNewsItem } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const { id } = await params;
		const body = await request.json();
		if (typeof body?.isActive !== "boolean") {
			return NextResponse.json({ error: "isActive (boolean) is required" }, { status: 400 });
		}
		const updated = await toggleNewsItem(id, body.isActive);
		if (!updated) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error toggling news item:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const { id } = await params;
		const deleted = await deleteNewsItem(id);
		if (!deleted) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error deleting news item:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
