import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { getProductsCollection } from "../../db";

/**
 * GET /v1/products
 *
 * Catalog products. Same shape the webapp consumed before
 * (`{ products: CatalogProduct[] }` with `id, title, description, price?, url, badgeLabel?`).
 */
export async function listProductsHandler(_req: MiniAppAuthedRequest, res: Response): Promise<void> {
	try {
		const col = await getProductsCollection();
		const list = await col.find({}).sort({ createdAt: -1 }).limit(100).toArray();
		const products = list.map((p) => ({
			id: String(p._id),
			title: p.title,
			description: p.description,
			price: typeof p.price === "number" && isFinite(p.price) && p.price > 0 ? p.price : undefined,
			url: p.url ?? p.imageUrl ?? "",
			badgeLabel: p.badgeLabel
		}));
		res.status(200).json({ products });
	} catch (err) {
		console.error("[products] list failed", err);
		res.status(500).json({ error: "Failed to load products" });
	}
}
