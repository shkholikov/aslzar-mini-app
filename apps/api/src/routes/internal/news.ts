import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { getNewsCollection } from "../../db";

/**
 * GET /v1/news
 *
 * Active news_items (admin-managed). Mirrors the previous webapp /api/news shape:
 *   { items: [{ id, title, link, pubDate, description, imageUrl, videoUrl, buttonText }] }
 */
export async function listNewsHandler(_req: MiniAppAuthedRequest, res: Response): Promise<void> {
	try {
		const col = await getNewsCollection();
		const posts = await col
			.find({ isActive: { $ne: false } })
			.sort({ createdAt: -1 })
			.limit(5)
			.toArray();
		const items = posts.map((p) => ({
			id: String(p._id),
			title: p.title,
			link: p.buttonUrl || "",
			pubDate: p.createdAt ? p.createdAt.toISOString() : "",
			description: p.description,
			imageUrl: p.mediaType === "photo" ? (p.mediaUrl ?? null) : null,
			videoUrl: p.mediaType === "video" ? (p.mediaUrl ?? null) : null,
			buttonText: p.buttonText ?? null
		}));
		res.status(200).json({ items });
	} catch (err) {
		console.error("[news] fetch failed", err);
		// Match previous behaviour: never break the home page on news failure.
		res.status(200).json({ error: "Failed to fetch news", items: [] });
	}
}
