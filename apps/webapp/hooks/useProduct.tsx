"use client";

import useSWR from "swr";
import { apiRequest, ApiError } from "@/lib/api-client";
import { useTelegram } from "./useTelegram";
import type { CatalogProduct } from "@/lib/catalog";

interface ProductResponse {
	data: CatalogProduct;
}

/**
 * One product for the detail page.
 *
 * A sold-out product still resolves — upstream keeps the row and the URL so a saved link never
 * breaks, it just reports no pieces. `notFound` is therefore a genuinely missing id, not an
 * empty shelf, and the two want different screens.
 */
export function useProduct(productId: string | undefined) {
	const tg = useTelegram();
	const ready = Boolean(productId && tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData);

	const { data, error, isLoading, mutate } = useSWR<ProductResponse>(
		ready ? `/v1/catalog/${encodeURIComponent(productId as string)}` : null,
		(path: string) => apiRequest<ProductResponse>(path),
		{ revalidateOnFocus: false }
	);

	const notFound = error instanceof ApiError && error.status === 404;
	// Same split as useCatalog: an unreachable catalogue is not a missing product, and telling
	// a customer their saved link is dead when the service is merely down would be wrong.
	const unavailable = error instanceof ApiError && [502, 503, 504].includes(error.status);

	return {
		product: data?.data,
		loading: ready && isLoading && data === undefined,
		notFound,
		failure: notFound || !error ? null : unavailable ? ("unavailable" as const) : ("error" as const),
		retry: () => void mutate()
	};
}
