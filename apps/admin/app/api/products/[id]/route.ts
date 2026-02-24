import { NextResponse, type NextRequest } from "next/server";
import { deleteProduct } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

interface RouteParams {
	params: Promise<{ id: string }>;
}

/**
 * DELETE /api/products/:id
 * Deletes a product.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		const removed = await deleteProduct(id);
		if (!removed) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error deleting product:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

