import { COLORS, DEFAULT_FILTERS, FINENESS, type Filters } from "@/lib/catalog";

/**
 * What the catalogue looked like when the customer left it, so coming back (Telegram back button
 * or the dock) shows the same search, category, «Sevimlilar», filters and scroll position. The
 * products themselves come back from SWR's cache (useCatalogList), not from here.
 *
 * The snapshot lives in module memory, which outlives the page because the layout and the JS
 * bundle stay loaded between routes. The choices also go to sessionStorage, so after a WebView
 * reload they come back while the list starts again at the top; the scroll position does not.
 */
export interface CatalogView {
	search: string;
	category?: string;
	favoritesOnly: boolean;
	filters: Filters;
	scrollY: number;
}

type Choices = Omit<CatalogView, "scrollY">;

const STORAGE_KEY = "aslzar.catalog-view.v1";
const MAX_TEXT = 100;
const EMPTY_VIEW: CatalogView = { search: "", favoritesOnly: false, filters: DEFAULT_FILTERS, scrollY: 0 };

let view: CatalogView | null = null;

export function readCatalogView(): CatalogView | null {
	if (view) return view;
	const choices = readStoredChoices();
	return choices ? { ...choices, scrollY: 0 } : null;
}

export function saveCatalogView(next: Partial<CatalogView>): void {
	view = { ...(readCatalogView() ?? EMPTY_VIEW), ...next };
	const { search, category, favoritesOnly, filters } = view;
	try {
		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ search, category, favoritesOnly, filters }));
	} catch {
		// Storage blocked or full: the in-memory copy still covers navigation inside the app.
	}
}

/** Reads the stored choices field by field; anything malformed counts as no snapshot. */
function readStoredChoices(): Choices | null {
	let raw: unknown;
	try {
		const text = window.sessionStorage.getItem(STORAGE_KEY);
		if (!text) return null;
		raw = JSON.parse(text);
	} catch {
		return null;
	}
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	const f = (r.filters && typeof r.filters === "object" ? r.filters : {}) as Record<string, unknown>;

	const filters: Filters = {
		hasPhotos: typeof f.hasPhotos === "boolean" ? f.hasPhotos : DEFAULT_FILTERS.hasPhotos,
		inStock: typeof f.inStock === "boolean" ? f.inStock : DEFAULT_FILTERS.inStock
	};
	const fineness = FINENESS.find((v) => v === f.fineness);
	if (fineness) filters.fineness = fineness;
	const color = COLORS.find((v) => v === f.color);
	if (color) filters.color = color;
	if (isShortText(f.stone)) filters.stone = f.stone;
	if (typeof f.hasStone === "boolean") filters.hasStone = f.hasStone;

	return {
		search: typeof r.search === "string" ? r.search.slice(0, MAX_TEXT) : "",
		category: isShortText(r.category) ? r.category : undefined,
		favoritesOnly: r.favoritesOnly === true,
		filters
	};
}

function isShortText(v: unknown): v is string {
	return typeof v === "string" && v.length > 0 && v.length <= MAX_TEXT;
}
