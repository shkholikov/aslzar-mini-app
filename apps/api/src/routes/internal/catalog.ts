import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { config } from "../../config";
import { savePreparedInlineMessage } from "../../telegram";
import { AslzarIdError, AslzarIdNotConfiguredError, getProduct, listCategories, listProducts } from "../../integrations/aslzarid";
import { besalesConfigured, sendInbound, type BesalesContact } from "../../integrations/besales";
import { getUserSession } from "../../db";
import { z } from "zod";

/**
 * Catalogue proxy for the miniapp shop, mounted at /v1/catalog/*.
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

/**
 * One product through the same cache the detail page uses, so other routes (favourites) never
 * add upstream calls of their own. Resolves to the upstream `{ data }` envelope.
 */
export function getCatalogProduct(productId: string): Promise<unknown> {
	return cached(`product:${productId}`, () => getProduct(productId));
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

/** The button label exactly as the customer saw it. The Mini App is Uzbek-only. */
const ASK_BUTTON_LABEL = "Bu buyum haqida so'rash";

const AskBodySchema = z.object({ variantId: z.string().min(1).max(100) }).strict();

type ProductWithVariants = { productId: string; variants?: { id: string }[] };

/** Trimmed non-empty string, or undefined. 1C fields arrive as unknown. */
function text(v: unknown): string | undefined {
	return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * POST /v1/catalog/:productId/ask  { variantId }
 *
 * The customer taps "Bu buyum haqida so'rash" on one physical piece. We hand that to the Besales
 * agent as an ordinary inbound message with the product in `metadata`; the agent answers in the
 * customer's chat with the bot, not here.
 *
 * The Mini App sends only ids. The product is read from our own cache, so a customer cannot edit
 * the price or the piece the agent is told about.
 *
 * Besales' three conditions (agreed with them):
 *   - `text` is the button label in the customer's language, so the agent replies in it
 *   - `variant.id` is one of `product.variants[].id` — they drop it from "other sizes" by id
 *   - metadata rides only on this message, not every message
 */
export async function askAboutProductHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	if (!besalesConfigured()) {
		res.status(503).json({ error: "Besales is not configured" });
		return;
	}

	const parsed = AskBodySchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
		return;
	}
	const { variantId } = parsed.data;
	const productId = req.params.productId;
	const user = req.miniAppUser!;
	const userId = String(user.id);

	let product: ProductWithVariants;
	try {
		const payload = (await cached(`product:${productId}`, () => getProduct(productId))) as { data?: ProductWithVariants };
		if (!payload?.data) {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		product = payload.data;
	} catch (err) {
		if (err instanceof AslzarIdError && err.status === 404) {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		fail(res, `ask ${productId}`, err);
		return;
	}

	// variant.id is unique within a product (checked against live data); `article` is not —
	// every piece of one design shares it — so the id is the only way to name the exact piece.
	const variant = product.variants?.find((v) => v.id === variantId);
	if (!variant) {
		// Most likely sold between the page loading and the tap. The cache can be up to an hour old.
		res.status(409).json({ error: "variant_unavailable" });
		return;
	}

	// Same precedence as the bot's buildContact (apps/bot/src/besales.ts): verified 1C names first,
	// then the Telegram profile. Empty fields are omitted, never sent blank.
	const session = await getUserSession(userId).catch(() => null);
	const oneC = session?.user1CData;
	const phoneDigits = session?.phone_number?.replace(/\D/g, "");
	const contact: BesalesContact = Object.fromEntries(
		Object.entries({
			firstName: text(oneC?.imya) ?? text(user.first_name),
			lastName: text(oneC?.familiya) ?? text(user.last_name),
			username: text(user.username),
			phone: phoneDigits ? `+${phoneDigits}` : undefined,
			languageCode: text(user.language_code)
		}).filter(([, v]) => v !== undefined)
	);

	const result = await sendInbound({
		externalUserId: userId,
		externalChatId: userId,
		// Minute bucket: a double-tap lands as a Besales duplicate (200) instead of two questions.
		externalMessageId: `catalog-ask:${userId}:${variantId}:${Math.floor(Date.now() / 60_000)}`,
		sourceChannel: "telegram",
		text: ASK_BUTTON_LABEL,
		...(Object.keys(contact).length > 0 && { contact }),
		// Sent as is — Besales reads what it needs and skips images, warehouse and internal ids.
		metadata: { event: "product_ask", source: "miniapp_catalog", product, variant },
		timestamp: Math.floor(Date.now() / 1000)
	});

	if (!result.ok) {
		res.status(502).json({ error: "Failed to reach the assistant" });
		return;
	}
	res.status(200).json({ ok: true });
}
