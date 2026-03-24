import { NextResponse, type NextRequest } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getProduct, deleteProduct } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

interface RouteParams {
	params: Promise<{ id: string }>;
}

const r2 = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
	}
});

function getR2Key(url: string): string | null {
	try {
		const { hostname, pathname } = new URL(url);
		if (hostname.endsWith(".r2.dev")) {
			return pathname.slice(1); // strip leading slash
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * DELETE /api/products/:id
 * Deletes a product from DB and removes its media from R2 if the URL is an R2 URL.
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

		if (product.url) {
			const key = getR2Key(product.url);
			if (key) {
				try {
					await r2.send(
						new DeleteObjectCommand({
							Bucket: process.env.R2_BUCKET_NAME!,
							Key: key
						})
					);
				} catch (r2Error) {
					console.error("R2 delete failed (product still removed from DB):", r2Error);
				}
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
