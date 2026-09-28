"use client";

import * as React from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiRequest, ApiError } from "@/lib/api-client";
import { useTelegram } from "./useTelegram";
import { failureKind } from "./useCatalog";
import type { CatalogListResponse } from "@/lib/catalog";

/**
 * Catalogue likes ("Sevimlilar"), stored per Telegram user on apps/api.
 *
 * Every heart in the app reads the same SWR key, so the list is fetched once and a like shows up
 * everywhere at the same time — no provider needed. What's liked is the design (productId).
 */

const IDS_KEY = "/v1/favorites";
type IdsResponse = { productIds: string[] };

function useReady(): boolean {
	const tg = useTelegram();
	return Boolean(tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData);
}

export function useFavoriteIds() {
	const tg = useTelegram();
	const ready = useReady();
	const { data, mutate } = useSWR<IdsResponse>(ready ? IDS_KEY : null, (path: string) => apiRequest<IdsResponse>(path), {
		revalidateOnFocus: false
	});

	const ids = React.useMemo(() => new Set(data?.productIds ?? []), [data]);

	/**
	 * Optimistic: the heart changes on tap, and SWR rolls it back if the request fails.
	 * 409 means the 100-like cap (see apps/api/src/routes/internal/favorites.ts).
	 */
	const toggle = async (productId: string) => {
		tg?.HapticFeedback?.impactOccurred("light");
		const current = data?.productIds ?? [];
		const liked = current.includes(productId);
		const next = liked ? current.filter((id) => id !== productId) : [productId, ...current];

		try {
			await mutate(
				async () => {
					await apiRequest(`/v1/favorites/${encodeURIComponent(productId)}`, { method: liked ? "DELETE" : "PUT" });
					return { productIds: next };
				},
				{ optimisticData: { productIds: next }, rollbackOnError: true, populateCache: true, revalidate: false }
			);
		} catch (error) {
			tg?.HapticFeedback?.notificationOccurred("error");
			toast.error(
				error instanceof ApiError && error.status === 409 ? "100 tadan ortiq saqlab bo'lmaydi" : "Saqlab bo'lmadi, qayta urinib ko'ring"
			);
		}
	};

	return { isLiked: (productId: string) => ids.has(productId), toggle, count: ids.size };
}

/** The liked designs themselves, 24 per page, in the catalogue's own `{ data, meta }` shape. */
export function useFavoriteProducts(page: number, enabled: boolean) {
	const ready = useReady();
	const { data, error, isLoading, mutate } = useSWR<CatalogListResponse>(
		ready && enabled ? `/v1/favorites/products?page=${page}` : null,
		(path: string) => apiRequest<CatalogListResponse>(path),
		{ revalidateOnFocus: false }
	);

	return {
		products: data?.data ?? [],
		meta: data?.meta,
		loading: ready && enabled && isLoading && data === undefined,
		failure: failureKind(error),
		retry: () => void mutate()
	};
}
