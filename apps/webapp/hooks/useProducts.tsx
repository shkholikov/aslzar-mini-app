"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import type { CatalogProduct } from "@/lib/db";

interface ProductsContextType {
	products: CatalogProduct[];
	loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
	const [products, setProducts] = useState<CatalogProduct[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/products")
			.then((res) => res.json())
			.then((data) => setProducts(Array.isArray(data.products) ? data.products : []))
			.catch(() => setProducts([]))
			.finally(() => setLoading(false));
	}, []);

	return <ProductsContext.Provider value={{ products, loading }}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
	const context = useContext(ProductsContext);
	if (!context) {
		throw new Error("useProducts must be used within a ProductsProvider");
	}
	return context;
}
