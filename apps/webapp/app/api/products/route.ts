import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/db";

/**
 * GET /api/products
 * Returns catalog products for the webapp (no auth).
 */
export async function GET() {
	try {
		const products = await getCatalogProducts();
		return NextResponse.json({ products }, { status: 200 });
	} catch (error) {
		console.error("Error fetching products:", error);
		return NextResponse.json(
			{ error: "Failed to load products" },
			{ status: 500 }
		);
	}
}
