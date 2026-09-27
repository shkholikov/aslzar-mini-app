/**
 * ASLZAR ID catalogue — types and display helpers.
 *
 * Everything the UI needs to turn raw 1C data into something an Uzbek-speaking customer can
 * read lives here, so the mappings exist in exactly one place. Data reaches us through
 * apps/api at /v1/catalog/* (the upstream key is server-side; see docs/aslzarid-catalog.md).
 */

import { apiRequest } from "@/lib/api-client";

/** One physical piece. Not a size option — an actual ring in an actual display case. */
export interface CatalogVariant {
	/**
	 * Identifies this exact piece within its product. Use it — not `article` — to point at a piece:
	 * every piece of one design shares the same article. Fine as a key within one payload; not
	 * guaranteed stable across nightly syncs, so never persist it.
	 */
	id: string;
	/** 1C article number, e.g. `1.6.1.0.024.2`. Shared by every piece of the same design. */
	article: string;
	/** Null for chains, watches and pendants, where 1C sends "0". */
	size: number | null;
	weightGrams: number | null;
	/** Integer UZS for this exact piece — it follows the piece's own weight. */
	price: number;
	/** Shop holding the piece. `uz` is often the Russian name (`uzIsFallback: true`). */
	branch?: { name: { ru: string; uz: string; uzIsFallback?: boolean } };
}

export interface CatalogImage {
	small: string;
	medium: string;
	large: string;
}

export interface CatalogCategory {
	id: string;
	slug: string;
	name: { ru: string; uz: string; uzIsFallback: boolean };
}

export interface CatalogProduct {
	/** 1C product id, e.g. `00-0000067`. Stable across syncs — key on this, never `id`. */
	productId: string;
	/** 1C model code, e.g. `1.0.024.2`. Never contains a word or a space. */
	model: string;
	name: { ru: string | null; uz: string | null };
	fineness: string | null;
	/** Raw 1C value in Cyrillic: `Сарик` / `Кизил` / `Ок`. Use latinColor() to display. */
	color: string | null;
	/** Raw 1C value. `Тошсиз` means "no stone" — it is a value, not a blank. */
	stone: string | null;
	images: CatalogImage[];
	category: CatalogCategory | null;
	variants: CatalogVariant[];
	/** How many pieces are in stock. There is no quantity field — this IS the quantity. */
	variantCount: number;
	inStock: boolean;
}

export interface CatalogMeta {
	total: number;
	page: number;
	perPage: number;
	hasMore: boolean;
	/** Present when a search ran. `ignored` holds words that matched nothing. */
	search?: { matched: string[]; ignored: string[] };
}

export interface CatalogListResponse {
	data: CatalogProduct[];
	meta: CatalogMeta;
}

export interface CatalogCategoriesResponse {
	data: CatalogCategory[];
	meta: { total: number };
}

/** Query the shop page owns. Values map 1:1 onto the upstream query params. */
export interface CatalogQuery {
	search?: string;
	category?: string;
	fineness?: "585" | "750" | "925";
	/** Raw Cyrillic value — the upstream enum rejects anything else. */
	color?: string;
	stone?: string;
	hasStone?: boolean;
	hasPhotos?: boolean;
	inStock?: boolean;
	page?: number;
	perPage?: number;
}

// ——— Display helpers ———

/**
 * What to call a product on screen.
 *
 * Only about a fifth of the catalogue has an Uzbek name and roughly three quarters is
 * Russian-only, so the documented `uz ?? ru ?? model` fallback would fill an Uzbek-only app
 * with Russian names and bare model codes. Falling back to the category instead keeps the app
 * in one language: a nameless ring reads "Uzuk" rather than "Золотое кольцо с фианитами" or
 * "1.0.024.2". Less specific, but the photo and price carry the difference.
 */
export function displayName(p: Pick<CatalogProduct, "name" | "category" | "model">): string {
	return p.name.uz?.trim() || p.category?.name.uz?.trim() || p.name.ru?.trim() || p.model;
}

const COLOR_UZ: Record<string, string> = {
	сарик: "Sariq",
	кизил: "Qizil",
	ок: "Oq"
};

const STONE_UZ: Record<string, string> = {
	тошсиз: "Toshsiz"
};

/**
 * 1C records colour and stone in Cyrillic Uzbek. These map them to Latin for display ONLY —
 * filters must send the original value back, or the upstream enum rejects it with a 400.
 * An unmapped value falls through unchanged rather than disappearing.
 */
export function latinColor(color: string | null | undefined): string | null {
	if (!color) return null;
	return COLOR_UZ[color.trim().toLowerCase()] ?? color;
}

export function latinStone(stone: string | null | undefined): string | null {
	if (!stone) return null;
	return STONE_UZ[stone.trim().toLowerCase()] ?? stone;
}

/** `1 250 000` — the app formats money as uz-UZ everywhere else too. */
export function formatSom(amount: number): string {
	return new Intl.NumberFormat("uz-UZ").format(Math.round(amount));
}

/**
 * Cheapest and dearest piece. Two variants of one design differ in weight and therefore in
 * price, so a single "the price" would be wrong — the card shows the minimum with "dan".
 */
export function priceRange(variants: CatalogVariant[]): { min: number; max: number } | null {
	const prices = variants.map((v) => v.price).filter((p) => typeof p === "number" && isFinite(p));
	if (prices.length === 0) return null;
	return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** "1 250 000 so'm" for a single piece, "1 250 000 so'm dan" when there is a choice. */
export function priceLabel(variants: CatalogVariant[]): string | null {
	const range = priceRange(variants);
	if (!range) return null;
	return range.min === range.max ? `${formatSom(range.min)} so'm` : `${formatSom(range.min)} so'm dan`;
}

/** "18 razmer · 2,74 g" — size is omitted for chains and pendants, where 1C has none. */
export function variantLabel(v: CatalogVariant): string {
	const parts: string[] = [];
	if (v.size !== null) parts.push(`${new Intl.NumberFormat("uz-UZ").format(v.size)} razmer`);
	if (v.weightGrams !== null) parts.push(`${new Intl.NumberFormat("uz-UZ").format(v.weightGrams)} g`);
	return parts.join(" · ");
}

// ——— Sharing ———

/**
 * Link back into the Mini App at this product.
 *
 * `startapp` opens the bot's main Mini App and arrives as `initDataUnsafe.start_param` — see
 * DeepLinkHandler. Telegram allows only A-Za-z0-9_- in that value, and 1C product ids
 * (`00-0007766`) happen to fit, so no encoding scheme is needed.
 *
 * Requires the bot to have a Main Mini App configured in BotFather; without it the link opens
 * a chat with the bot instead, which is a soft failure rather than a broken link.
 */
export function productShareUrl(productId: string): string {
	return `${botLink()}?startapp=${encodeURIComponent(productId)}`;
}

function botLink(): string {
	return (process.env.NEXT_PUBLIC_BOT_TELEGRAM_LINK || "https://t.me/aslzaruzbot").replace(/\/$/, "");
}

/**
 * `@aslzaruzbot`, derived from the same env var as the link.
 *
 * A story is a picture with no clickable link on most clients, so the handle in the caption is
 * the only thing telling a viewer where the piece came from — and it is typed by hand often
 * enough that hardcoding it twice would eventually drift.
 */
export function botNickname(): string {
	const handle = botLink().split("/").pop() || "aslzaruzbot";
	return `@${handle}`;
}

/** Telegram truncates a story caption past 200 chars for non-Premium accounts. */
const STORY_TEXT_LIMIT = 200;

/**
 * Caption for a shared story.
 *
 * Three jobs in two lines: say it is ASLZAR, say what the piece is and what it costs, and give
 * the handle — a story image carries no tappable link on most clients, so the handle is the only
 * route back to us. "buyum" rather than "mahsulot" to match the wording used everywhere else in
 * the app ("Mavjud buyumlar", "Bu buyum haqida so'rash").
 *
 * The title is what shrinks when the limit bites: the handle and the price are the parts that do
 * the work, and a name is still recognisable clipped.
 */
export function storyCaption(title: string, price: string | null): string {
	const tail = `\n\nYana ko'plab zargarlik buyumlari ${botNickname()} da`;
	const priceSuffix = price ? ` — ${price}` : "";
	const room = STORY_TEXT_LIMIT - "ASLZAR 💎 ".length - priceSuffix.length - tail.length;

	const name = title.length > room ? `${title.slice(0, Math.max(room - 1, 0)).trimEnd()}…` : title;
	return `ASLZAR 💎 ${name}${priceSuffix}${tail}`;
}

// ——— Besales handoff ———

/**
 * "Bu buyum haqida so'rash": hands the selected piece to the Besales AI agent.
 *
 * Only ids leave the device. apps/api loads the product from its own cache and sends Besales the
 * product and piece as-is (`POST /v1/catalog/:productId/ask`), so the price the agent quotes can't
 * be edited on the client. The agent's answer arrives in the customer's chat with the bot, not in
 * the Mini App.
 *
 * Throws ApiError: 409 when the piece is gone (sold since the page loaded), 503 when the
 * integration is switched off, 502 when Besales couldn't be reached.
 */
export async function askAboutProduct(productId: string, variantId: string): Promise<void> {
	await apiRequest(`/v1/catalog/${encodeURIComponent(productId)}/ask`, { method: "POST", body: { variantId } });
}
