import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { getFavoritesCollection } from "../../db";
import { AslzarIdError } from "../../integrations/aslzarid";
import { getCatalogProduct } from "./catalog";

/**
 * Catalogue likes ("Sevimlilar"), per Telegram user. Internal — not in the partner OpenAPI spec.
 *
 * What's liked is the design (1C productId), not a piece: pieces sell and vanish, while a design
 * keeps its page when sold out.
 *
 * ASLZAR ID can't filter by a list of ids, so the liked view loads each product by id through the
 * catalogue's own 1-hour cache. Its 60 req/min limit is per key and shared by every user, hence the
 * cap per user, paging, and limited concurrency below.
 */

/** Same shape the deep-link handler accepts, e.g. 00-0007766. */
const PRODUCT_ID = /^\d{2}-\d{4,12}$/;
const MAX_FAVORITES = 100;
const PAGE_SIZE = 24;
const FETCH_CONCURRENCY = 4;

function userIdOf(req: MiniAppAuthedRequest): string {
	return String(req.miniAppUser!.id);
}

function isNotFound(err: unknown): boolean {
	return err instanceof AslzarIdError && err.status === 404;
}

/** GET /v1/favorites — liked product ids, newest first. Drives every heart in the app. */
export async function listFavoriteIdsHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	try {
		const col = await getFavoritesCollection();
		const rows = await col
			.find({ userId: userIdOf(req) }, { projection: { productId: 1 } })
			.sort({ createdAt: -1 })
			.limit(MAX_FAVORITES)
			.toArray();
		res.status(200).json({ productIds: rows.map((r) => r.productId) });
	} catch (err) {
		console.error("[favorites] list ids failed", err);
		res.status(500).json({ error: "Internal server error" });
	}
}

/** PUT /v1/favorites/:productId — like. Idempotent. */
export async function addFavoriteHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const productId = req.params.productId;
	if (!PRODUCT_ID.test(productId)) {
		res.status(400).json({ error: "invalid_product_id" });
		return;
	}
	const userId = userIdOf(req);

	try {
		const col = await getFavoritesCollection();

		// Already liked: nothing to check, nothing to change.
		if (await col.findOne({ userId, productId }, { projection: { _id: 1 } })) {
			res.status(204).end();
			return;
		}

		if ((await col.countDocuments({ userId })) >= MAX_FAVORITES) {
			res.status(409).json({ error: "favorites_limit", limit: MAX_FAVORITES });
			return;
		}

		// Only real catalogue designs can be liked — keeps junk ids out of the collection.
		try {
			await getCatalogProduct(productId);
		} catch (err) {
			if (isNotFound(err)) {
				res.status(404).json({ error: "product_not_found" });
				return;
			}
			throw err;
		}

		await col.updateOne({ userId, productId }, { $setOnInsert: { userId, productId, createdAt: new Date() } }, { upsert: true });
		res.status(204).end();
	} catch (err) {
		console.error(`[favorites] add ${productId} failed`, err);
		res.status(500).json({ error: "Internal server error" });
	}
}

/** DELETE /v1/favorites/:productId — unlike. Idempotent: 204 even if it wasn't liked. */
export async function removeFavoriteHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const productId = req.params.productId;
	if (!PRODUCT_ID.test(productId)) {
		res.status(400).json({ error: "invalid_product_id" });
		return;
	}
	try {
		const col = await getFavoritesCollection();
		await col.deleteOne({ userId: userIdOf(req), productId });
		res.status(204).end();
	} catch (err) {
		console.error(`[favorites] remove ${productId} failed`, err);
		res.status(500).json({ error: "Internal server error" });
	}
}

/**
 * GET /v1/favorites/products?page=N — the liked designs themselves, newest first, 24 per page,
 * in the same `{ data, meta }` shape as /v1/catalog so the Mini App reuses its grid.
 *
 * A product removed from the catalogue (404) is skipped and its like cleaned up. A product that
 * fails for any other reason is skipped for this response only — the like stays.
 */
export async function listFavoriteProductsHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
	const userId = userIdOf(req);

	try {
		const col = await getFavoritesCollection();
		const total = await col.countDocuments({ userId });
		const rows = await col
			.find({ userId }, { projection: { productId: 1 } })
			.sort({ createdAt: -1 })
			.skip((page - 1) * PAGE_SIZE)
			.limit(PAGE_SIZE)
			.toArray();
		const ids = rows.map((r) => r.productId);

		// Fetch in small batches: cold ids go upstream, and that limit is shared by all users.
		const products: unknown[] = new Array(ids.length);
		const gone: string[] = [];
		for (let i = 0; i < ids.length; i += FETCH_CONCURRENCY) {
			const batch = ids.slice(i, i + FETCH_CONCURRENCY);
			const results = await Promise.allSettled(batch.map((id) => getCatalogProduct(id)));
			results.forEach((r, j) => {
				if (r.status === "fulfilled") {
					products[i + j] = (r.value as { data?: unknown })?.data;
				} else if (isNotFound(r.reason)) {
					gone.push(batch[j]);
				} else {
					console.warn(`[favorites] product ${batch[j]} unavailable for this response:`, r.reason);
				}
			});
		}

		if (gone.length > 0) {
			await col.deleteMany({ userId, productId: { $in: gone } }).catch((e) => console.error("[favorites] cleanup failed", e));
		}

		res.status(200).json({
			data: products.filter(Boolean),
			meta: { total: total - gone.length, page, perPage: PAGE_SIZE, hasMore: page * PAGE_SIZE < total }
		});
	} catch (err) {
		console.error("[favorites] list products failed", err);
		res.status(500).json({ error: "Internal server error" });
	}
}
