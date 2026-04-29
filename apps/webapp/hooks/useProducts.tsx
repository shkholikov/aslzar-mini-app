"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import useSWR from "swr";
import { apiRequest } from "@/lib/api-client";
import { useTelegram } from "./useTelegram";

/** Product record for catalog (same shape as admin ProductDoc; field is `url`). */
export interface CatalogProduct {
	id: string;
	title: string;
	description: string;
	price?: number;
	url: string;
	badgeLabel?: string;
}

interface ProductsContextType {
	products: CatalogProduct[];
	loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

const productsFetcher = async (path: string): Promise<CatalogProduct[]> => {
	const res = await apiRequest<{ products?: CatalogProduct[] }>(path);
	return Array.isArray(res?.products) ? res.products : [];
};

export function ProductsProvider({ children }: { children: ReactNode }) {
	const tg = useTelegram();
	const swrKey = tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData ? "/v1/products" : null;

	const { data, isLoading } = useSWR(swrKey, productsFetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60_000,
		keepPreviousData: true
	});

	const value = useMemo<ProductsContextType>(
		() => ({
			products: data ?? [],
			loading: swrKey !== null && isLoading && data === undefined
		}),
		[swrKey, data, isLoading]
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
