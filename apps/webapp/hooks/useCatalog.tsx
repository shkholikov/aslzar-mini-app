"use client";

import useSWR from "swr";
import { apiRequest, ApiError } from "@/lib/api-client";
import { useTelegram } from "./useTelegram";
import type { CatalogCategoriesResponse, CatalogListResponse, CatalogQuery } from "@/lib/catalog";

/**
 * Shop-page data.
 *
 * Unlike useProducts (which loads a whole small collection into context once), this is a query:
 * every filter change is a request, and the server pages the results. The catalogue runs to
 * thousands of products with their variants and image URLs, so loading it up front would cost
 * megabytes on each launch before the customer has opened anything.
 */

const PER_PAGE = 24;

/** apiRequest's query type takes strings and numbers, and upstream wants booleans as strings. */
function toParams(q: CatalogQuery): Record<string, string | number | undefined> {
	const bool = (v: boolean | undefined) => (v === undefined ? undefined : v ? "true" : "false");
	return {
		page: q.page,
		perPage: q.perPage ?? PER_PAGE,
		search: q.search?.trim() || undefined,
		category: q.category || undefined,
		fineness: q.fineness,
		color: q.color || undefined,
		stone: q.stone || undefined,
		hasStone: bool(q.hasStone),
		hasPhotos: bool(q.hasPhotos),
		inStock: bool(q.inStock)
	};
}

/** Stable SWR key — sorted so the same filters in a different order share one cache entry. */
function keyFor(params: Record<string, string | number | undefined>): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== "") sp.set(k, String(v));
	}
	sp.sort();
	return `/v1/catalog?${sp.toString()}`;
}

export function useCatalogPage(query: CatalogQuery) {
	const tg = useTelegram();
	const ready = Boolean(tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData);
	const params = toParams(query);

	// No keepPreviousData: the page accumulates pages itself, so holding the previous query's
	// results here would append stale rows and show a stale `meta.total` after a filter change.
	const { data, error, isLoading, mutate } = useSWR<CatalogListResponse>(
		ready ? keyFor(params) : null,
		(path: string) => apiRequest<CatalogListResponse>(path),
		{ revalidateOnFocus: false }
	);

	return {
		products: data?.data ?? [],
		meta: data?.meta,
		loading: ready && isLoading && data === undefined,
		failure: failureKind(error),
		retry: () => void mutate()
	};
}

/**
 * 502 and 503 both mean the catalogue itself is unreachable — 503 when apps/api has no upstream
 * key, 502 when the upstream answered badly or not at all. Either way it is not the customer's
 * filters, so the UI must not tell them nothing was found.
 */
function failureKind(error: unknown): "unavailable" | "error" | null {
	if (!error) return null;
	if (error instanceof ApiError && (error.status === 502 || error.status === 503 || error.status === 504)) return "unavailable";
	return "error";
}

/** Category chips. Never paged upstream, and changes about once a night, so one fetch is enough. */
export function useCatalogCategories() {
	const tg = useTelegram();
	const ready = Boolean(tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData);

	const { data, isLoading } = useSWR<CatalogCategoriesResponse>(
		ready ? "/v1/catalog/categories" : null,
		(path: string) => apiRequest<CatalogCategoriesResponse>(path),
		{ revalidateOnFocus: false, dedupingInterval: 60 * 60_000 }
	);

	return { categories: data?.data ?? [], loading: ready && isLoading && data === undefined };
}
