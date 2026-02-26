"use client";

import * as React from "react";
import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { ProductCard, type ProductCardProps } from "@/components/common/product-card";
import { Loading } from "@/components/common/loading";
import type { CatalogProduct } from "@/lib/db";

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function productToCardProps(p: CatalogProduct): ProductCardProps {
	const mediaType: ProductCardProps["mediaType"] = VIDEO_EXTENSIONS.test(p.url) ? "video" : "image";
	return {
		id: p.id,
		title: p.title,
		description: p.description,
		price: p.price,
		url: p.url,
		badgeLabel: p.badgeLabel,
		mediaType
	};
}

export default function CatalogPage() {
	const [products, setProducts] = React.useState<ProductCardProps[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/api/products");
				if (!res.ok) throw new Error("Yuklab bo‘lmadi");
				const data = await res.json();
				if (!cancelled && Array.isArray(data.products)) {
					setProducts(data.products.map(productToCardProps));
				}
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="pt-12">
			<Header title="Katalog" description="Mahsulotlar katalogi" iconImage="/icons/book.png" />
			<SectionCard iconImage="/icons/ring.png" title="Mahsulotlar">
				<div className="grid grid-cols-1 gap-3 mt-2">
					{loading && <Loading />}
					{!loading && error && <p className="text-sm text-red-600 py-4">{error}</p>}
					{!loading && !error && products.length === 0 && <p className="text-sm text-gray-500 py-4">Hozircha mahsulotlar yo‘q.</p>}
					{!loading && !error && products.length > 0 && products.map((product) => <ProductCard key={product.id} {...product} />)}
				</div>
			</SectionCard>
		</div>
	);
}
