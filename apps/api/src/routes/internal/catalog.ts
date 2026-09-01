import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { config } from "../../config";
import { savePreparedInlineMessage } from "../../telegram";
import { AslzarIdError, AslzarIdNotConfiguredError, getProduct, listCategories, listProducts } from "../../integrations/aslzarid";

/**
 * Catalogue proxy for the miniapp shop.
 *
 * Mounted at /v1/catalog/* rather than /v1/products so the legacy admin-managed catalogue keeps
 * serving during the migration — rolling back is a config change, not a restore.
 *
 * Unlike the other internal routes (which return a bare domain payload) this passes the upstream
 * `{ data, meta }` envelope straight through. That is deliberate: the client needs meta.total,
 * meta.hasMore and meta.search, and any mapping layer here would be one more thing to drift out
 * of step with a catalogue we do not own.
 */

/** Only these reach upstream. Anything else is dropped rather than forwarded blindly. */
const ALLOWED_PARAMS = [
	"page",
	"perPage",
	"category",
	"search",
	"fineness",
	"color",
	"stone",
	"hasPhotos",
	"hasStone",
	"matchAll",
	"inStock"
] as const;

// Upstream changes once a night, so responses are held for ASLZAR_ID_CACHE_TTL_SECONDS. This is
// process-local: on Railway with one replica that is fine, and the same caveat applies as in
// rate-limit.ts — if we ever scale out horizontally, this wants Redis.
const cache = new Map<string, { value: unknown; fetchedAt: number }>();
// Hard bound on the cache. Keys embed the customer's search text, so the key space is
// user-controlled and unbounded — without this, a few thousand distinct searches would pin
// a few thousand product pages in memory on a 1GB container and never release them.
// Map preserves insertion order, so the oldest key is the first one iteration yields.
const MAX_CACHE_ENTRIES = 500;
// Dedupes concurrent misses for the same key, so a burst on a cold cache makes one upstream call
// rather than N. Mirrors the in-flight Set in routes/internal/users.ts.
const inFlight = new Map<string, Promise<unknown>>();

function ttlMs(): number {
	return config.ASLZAR_ID_CACHE_TTL_SECONDS * 1000;
}

async function cached(key: string, load: () => Promise<unknown>): Promise<unknown> {
	const hit = cache.get(key);
	if (hit) {
		if (Date.now() - hit.fetchedAt < ttlMs()) return hit.value;
		cache.delete(key);
	}

	const pending = inFlight.get(key);
	if (pending) return pending;

	const promise = load()
		.then((value) => {
			// Evict before inserting so the map never exceeds the bound. Oldest-first rather than
			// LRU: entries all share one TTL, so age is the only thing distinguishing them.
			while (cache.size >= MAX_CACHE_ENTRIES) {
				const oldest = cache.keys().next();
				if (oldest.done) break;
				cache.delete(oldest.value);
			}
			cache.set(key, { value, fetchedAt: Date.now() });
			return value;
		})
		.finally(() => {
			inFlight.delete(key);
		});

	inFlight.set(key, promise);
	return promise;
}

/** Shared error mapping — same three branches as the other internal routes (branches.ts). */
function fail(res: Response, tag: string, err: unknown): void {
	console.error(`[catalog] ${tag} failed`, err);
	if (err instanceof AslzarIdNotConfiguredError) {
		res.status(503).json({ error: "Catalogue is not configured" });
		return;
	}
	if (err instanceof AslzarIdError) {
		res.status(502).json({ error: "Failed to fetch the catalogue", details: err.bodyText });
		return;
	}
	res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
}

export async function listCatalogHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const query = new URLSearchParams();
	for (const name of ALLOWED_PARAMS) {
		const raw = req.query[name];
		const value = Array.isArray(raw) ? raw[0] : raw;
		if (typeof value === "string" && value !== "") query.set(name, value);
	}
	// Sorted so two requests with the same filters in a different order share one cache entry.
	query.sort();

	try {
		res.status(200).json(await cached(`products?${query.toString()}`, () => listProducts(query)));
	} catch (err) {
		fail(res, "list", err);
	}
}

export async function getCatalogProductHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const productId = req.params.productId;
	if (!productId) {
		res.status(400).json({ error: "productId is required" });
		return;
	}

	try {
		res.status(200).json(await cached(`product:${productId}`, () => getProduct(productId)));
	} catch (err) {
		// Upstream documents only 200/401/429 on this endpoint — no 404 — so an unknown id comes
		// back as an upstream error rather than an empty result. 404 is the honest answer here.
		if (err instanceof AslzarIdError && err.status === 404) {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		fail(res, `product ${productId}`, err);
	}
}

export async function listCatalogCategoriesHandler(_req: MiniAppAuthedRequest, res: Response): Promise<void> {
	try {
		res.status(200).json(await cached("categories", listCategories));
	} catch (err) {
		fail(res, "categories", err);
	}
}

/**
 * Prepares a shareable message for one product.
 *
 * The Mini App cannot compose a rich message itself — `WebApp.shareMessage(id)` can only send
 * something the bot has already stored. So this mints a photo card with the product details and
 * an inline button back to the bot, which is what makes a share double as an invite.
 *
 * Nothing is sent here: the customer still picks the recipient in Telegram's own dialog, and may
 * cancel. Ids are short-lived, so one is minted per tap rather than cached.
 */
export async function prepareProductShareHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const productId = req.params.productId;
	const userId = req.miniAppUser!.id;

	try {
		const payload = (await cached(`product:${productId}`, () => getProduct(productId))) as {
			data?: {
				productId: string;
				model: string;
				name?: { uz?: string | null; ru?: string | null };
				category?: { name?: { uz?: string } } | null;
				fineness?: string | null;
				images?: { medium: string; large: string }[];
				variants?: { price: number }[];
			};
		};
		const p = payload?.data;
		if (!p) {
			res.status(404).json({ error: "Product not found" });
			return;
		}

		const photo = p.images?.[0];
		if (!photo) {
			// Telegram needs media for a photo result, and a text-only card would undersell a ring.
			res.status(422).json({ error: "Product has no photo to share" });
			return;
		}

		// Same fallback chain as the Mini App's displayName(), so the shared card is titled with
		// what the sender was actually looking at.
		const title = p.name?.uz?.trim() || p.category?.name?.uz?.trim() || p.name?.ru?.trim() || p.model;
		const prices = (p.variants ?? []).map((v) => v.price).filter((n) => typeof n === "number");
		const from = prices.length ? Math.min(...prices) : null;

		const lines = [
			`💎 ${title}`,
			p.fineness ? `${p.fineness} proba` : null,
			from ? `${new Intl.NumberFormat("uz-UZ").format(from)} so'm${prices.length > 1 ? " dan" : ""}` : null
		].filter(Boolean);

		const botLink = config.BOT_TELEGRAM_LINK.replace(/\/$/, "");

		const prepared = await savePreparedInlineMessage({
			user_id: userId,
			result: {
				type: "photo",
				id: `catalog-${p.productId}`.slice(0, 64),
				photo_url: photo.large,
				thumbnail_url: photo.medium,
				title,
				caption: lines.join("\n"),
				reply_markup: {
					inline_keyboard: [[{ text: "ASLZAR💎 katalogini ochish", url: `${botLink}?startapp=${encodeURIComponent(p.productId)}` }]]
				}
			},
			allow_user_chats: true,
			allow_group_chats: true,
			allow_channel_chats: true
		});

		res.status(200).json({ id: prepared.id });
	} catch (err) {
		fail(res, `share ${productId}`, err);
	}
}
