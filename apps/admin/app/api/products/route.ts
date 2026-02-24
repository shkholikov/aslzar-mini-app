import { NextResponse, type NextRequest } from "next/server";
import { createProduct, getProducts } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

/**
 * GET /api/products
 * Returns list of products for the webapp catalog.
 */
export async function GET(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const products = await getProducts();
		return NextResponse.json({ products }, { status: 200 });
	} catch (error) {
		console.error("Error fetching products:", error);
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
 * POST /api/products
 * Body: { title, description, price, imageUrl, badgeLabel? }
 * Creates a new product document.
 */
export async function POST(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const title = typeof body?.title === "string" ? body.title.trim() : "";
		const description = typeof body?.description === "string" ? body.description.trim() : "";
		const priceRaw = body?.price;
		const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
		const badgeLabel =
			typeof body?.badgeLabel === "string" && body.badgeLabel.trim() ? body.badgeLabel.trim() : undefined;

		if (!title || !description || !imageUrl || typeof priceRaw !== "number" || !isFinite(priceRaw) || priceRaw <= 0) {
			return NextResponse.json(
				{
					error:
						"title, description, imageUrl must be non-empty strings and price must be a positive number"
				},
				{ status: 400 }
			);
		}

		const product = await createProduct({
			title,
			description,
			price: priceRaw,
			imageUrl,
			badgeLabel
		});

		return NextResponse.json({ product }, { status: 201 });
	} catch (error) {
		console.error("Error creating product:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

