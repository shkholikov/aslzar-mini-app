"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
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

const CAROUSEL_QUERY = `/v1/catalog?hasPhotos=true&inStock=true&perPage=6${CAROUSEL_CATEGORY ? `&category=${encodeURIComponent(CAROUSEL_CATEGORY)}` : ""}`;

interface ProductsContextType {
	products: CatalogProduct[];
	loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
	const tg = useTelegram();
	const ready = tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData;

	const { data, isLoading } = useSWR<CatalogListResponse>(
		ready ? CAROUSEL_QUERY : null,
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

	const value = useMemo<ProductsContextType>(
		() => ({
			products: data?.data ?? [],
			loading: Boolean(ready) && isLoading && data === undefined
		}),
		[ready, data, isLoading]
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
