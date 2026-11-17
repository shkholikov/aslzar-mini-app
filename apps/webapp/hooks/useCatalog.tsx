"use client";

import * as React from "react";
import useSWR from "swr";
import useSWRInfinite, { type SWRInfiniteResponse } from "swr/infinite";
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

/**
 * The catalogue for one query, paged with «Ko'proq yuklash». useSWRInfinite keeps the loaded pages
 * and their count in SWR's cache per query, so leaving the page and coming back shows the same
 * list straight from cache, and a changed query starts at page 1.
 */
export function useCatalogList(query: Omit<CatalogQuery, "page" | "perPage">, enabled = true) {
	const tg = useTelegram();
	const ready = Boolean(tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData);
	const active = ready && enabled;
	const pageKey = (page: number) => keyFor(toParams({ ...query, page }));

	const res = useSWRInfinite<CatalogListResponse>(
		(index, previous: CatalogListResponse | null) => (!active || (previous && !previous.meta?.hasMore) ? null : pageKey(index + 1)),
		(path: string) => apiRequest<CatalogListResponse>(path),
		PAGED_OPTIONS
	);
	return usePagedList(res, active, pageKey(1));
}

/**
 * «Ko'proq yuklash» fetches only the new page: page 1 is not refetched each time
 * (revalidateFirstPage), so the order does not shift under the reader while paging. Pages are
 * requested in parallel, so refreshing several cached pages on return is one round-trip, not one
 * per page; the page count comes from SWR's cache and `hasMore` caps it.
 */
export const PAGED_OPTIONS = { revalidateOnFocus: false, revalidateFirstPage: false, parallel: true };

/**
 * Flattens useSWRInfinite pages into what the catalogue page renders. Shared with the likes list.
 *
 * When a list becomes active with pages already in cache (coming back to the page, or back to a
 * chip used before), every cached page is refreshed once in the background. Otherwise a like or a
 * price change on page 1 would shift items across the stale later pages, and one could vanish or
 * show twice until a reload.
 */
export function usePagedList(res: SWRInfiniteResponse<CatalogListResponse>, active: boolean, listKey: string) {
	const { data, error, isLoading, isValidating, size, setSize, mutate } = res;

	const refreshedFor = React.useRef<string | null>(null);
	React.useEffect(() => {
		const key = active ? listKey : null;
		if (key === refreshedFor.current) return;
		refreshedFor.current = key;
		if (key && data) void mutate();
	}, [active, listKey, data, mutate]);

	// Pages can shift between requests; key on productId so a product never appears twice.
	const products = React.useMemo(() => {
		const seen = new Set<string>();
		return (data ?? []).flatMap((p) => p.data).filter((p) => !seen.has(p.productId) && Boolean(seen.add(p.productId)));
	}, [data]);

	// Asked for one more page than has arrived: loading, unless that request failed and is not
	// being retried right now.
	const pending = data !== undefined && data.length < size;

	return {
		products,
		meta: data?.[data.length - 1]?.meta,
		loading: active && isLoading && data === undefined,
		loadingMore: pending && (isValidating || !error),
		// After a failed page, the button asks for that missing page again, not every loaded page.
		loadMore: () => void (pending ? mutate(data, { revalidate: (page: unknown) => page === undefined }) : setSize(size + 1)),
		failure: failureKind(error),
		retry: () => void mutate()
	};
}

/**
 * 502 and 503 both mean the catalogue itself is unreachable — 503 when apps/api has no upstream
 * key, 502 when the upstream answered badly or not at all. Either way it is not the customer's
 * filters, so the UI must not tell them nothing was found.
 */
export function failureKind(error: unknown): "unavailable" | "error" | null {
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
