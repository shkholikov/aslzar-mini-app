import { NextResponse, type NextRequest } from "next/server";
import { del } from "@vercel/blob";
import { getProduct, deleteProduct } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

interface RouteParams {
	params: Promise<{ id: string }>;
}

const VERCEL_BLOB_HOST = ".blob.vercel-storage.com";

function isVercelBlobUrl(url: string): boolean {
	try {
		return new URL(url).hostname.endsWith(VERCEL_BLOB_HOST);
	} catch {
		return false;
	}
}

/**
 * DELETE /api/products/:id
 * Deletes a product and its media from Vercel Blob if the product URL is a blob URL.
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

		const product = await getProduct(id);
		if (!product) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		if (product.url && isVercelBlobUrl(product.url)) {
			try {
				await del(product.url);
			} catch (blobError) {
				console.error("Vercel Blob delete failed (product still removed from DB):", blobError);
				// Continue to delete the product from DB even if blob delete fails (e.g. already removed)
			}
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

