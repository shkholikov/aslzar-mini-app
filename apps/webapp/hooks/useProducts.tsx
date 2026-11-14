"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { apiRequest } from "@/lib/api-client";
import { useTelegram } from "./useTelegram";
import type { CatalogListResponse, CatalogProduct } from "@/lib/catalog";

/**
 * Home-carousel products only.
 *
 * This used to hold the entire catalogue in context for the shop page to slice client-side.
 * That worked for two dozen admin-managed products and does not survive thousands synced from
 * 1C — the shop page now queries the server (see hooks/useCatalog.tsx) and this is left with the
 * one job it still has: a handful of images for the home screen.
 *
 * Scoped to what is photographed and in stock, which is all we can honestly promise: the home
 * screen must never show a piece the shop cannot sell.
 *
 * No category filter. Narrowing to one category would read better than an arbitrary sample, but
 * the slugs are 1C-shaped (`1-0-uzuk-naborsiz`, not `uzuk`) and guessing one wrong returns an
 * empty carousel — worse than an unfiltered one. Set CAROUSEL_CATEGORY once the real slugs are
 * known from GET /v1/catalog/categories.
 */

const CAROUSEL_CATEGORY: string | null = null;

/**
 * A different set on every launch: one of the first CAROUSEL_PAGES pages of CAROUSEL_PER_PAGE is
 * picked at random and shuffled client-side. Capped so the API's 1-hour catalogue cache holds at
 * most CAROUSEL_PAGES keys for this query, i.e. at most that many ASLZAR ID calls an hour (its
 * limit is 60/min per key, shared by every user). ~3 900 products have photos and stock, so
 * 20 × 24 = 480 is well inside the catalogue.
 */
const CAROUSEL_PAGES = 20;
const CAROUSEL_PER_PAGE = 24;
/** Distinct products shown in the strip. */
export const CAROUSEL_SIZE = 6;
/** Stable empty list, so the context value does not change identity on every render. */
const NO_PRODUCTS: CatalogProduct[] = [];

function carouselQuery(page: number): string {
	const category = CAROUSEL_CATEGORY ? `&category=${encodeURIComponent(CAROUSEL_CATEGORY)}` : "";
	return `/v1/catalog?hasPhotos=true&inStock=true&perPage=${CAROUSEL_PER_PAGE}&page=${page}${category}`;
}

/** Fisher–Yates; returns a new array. */
function shuffle<T>(items: T[]): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

interface ProductsContextType {
	products: CatalogProduct[];
	loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
	const tg = useTelegram();
	const ready = tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData;

	// Picked once per launch: the provider mounts once, so the strip stays the same while the
	// customer moves between tabs and changes on the next open.
	const [page, setPage] = useState(() => 1 + Math.floor(Math.random() * CAROUSEL_PAGES));

	const { data, isLoading } = useSWR<CatalogListResponse>(
		ready ? carouselQuery(page) : null,
		(path: string) => apiRequest<CatalogListResponse>(path),
		{
			revalidateOnFocus: false,
			dedupingInterval: 60 * 60_000,
			keepPreviousData: true,
			// Decoration on the home screen: if the catalogue is unreachable the carousel hides
			// itself rather than taking the whole page down with it.
			shouldRetryOnError: false
		}
	);

	// The random page can fall past the end if the photographed in-stock catalogue shrinks below
	// CAROUSEL_PAGES × CAROUSEL_PER_PAGE. Fall back to the first page rather than hide the strip.
	useEffect(() => {
		if (page !== 1 && data && data.data.length < CAROUSEL_SIZE) setPage(1);
	}, [page, data]);

	// Shuffled once per page, not on every revalidation: a new `data` object for the same page
	// would otherwise reorder the strip while the customer moves between tabs.
	const picked = useRef<{ page: number; products: CatalogProduct[] } | null>(null);
	if (data?.data && data.data.length > 0 && picked.current?.page !== page) {
		picked.current = { page, products: shuffle(data.data).slice(0, CAROUSEL_SIZE) };
	}
	const products = picked.current?.page === page ? picked.current.products : NO_PRODUCTS;

	const value = useMemo<ProductsContextType>(
		() => ({
			products,
			loading: Boolean(ready) && isLoading && data === undefined
		}),
		[ready, data, isLoading, products]
	);

	return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
	const context = useContext(ProductsContext);
	if (!context) {
		throw new Error("useProducts must be used within a ProductsProvider");
	}
	return context;
}
