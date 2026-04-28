"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import useSWR from "swr";
import type { CatalogProduct } from "@/lib/db";

interface ProductsContextType {
	products: CatalogProduct[];
	loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

const productsFetcher = async (url: string): Promise<CatalogProduct[]> => {
	const res = await fetch(url);
	if (!res.ok) return [];
	const data = await res.json();
	return Array.isArray(data.products) ? data.products : [];
};

export function ProductsProvider({ children }: { children: ReactNode }) {
	const { data, isLoading } = useSWR("/api/products", productsFetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60_000,
		keepPreviousData: true
	});

	const value = useMemo<ProductsContextType>(
		() => ({
			products: data ?? [],
			loading: isLoading && data === undefined
		}),
		[data, isLoading]
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
