"use client";

import * as React from "react";
import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { ProductCard, type ProductCardProps } from "@/components/common/product-card";
import { Loading } from "@/components/common/loading";
import type { CatalogProduct } from "@/lib/db";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?|$)/i;
const PAGE_SIZE = 5;

function productToCardProps(p: CatalogProduct): ProductCardProps {
	const mediaType: ProductCardProps["mediaType"] = VIDEO_EXTENSIONS.test(p.url) ? "video" : "image";
	return {
		id: p.id,
		title: p.title,
		description: p.description,
		price: typeof p.price === "number" && isFinite(p.price) && p.price > 0 ? p.price : undefined,
		url: p.url,
		badgeLabel: p.badgeLabel,
		mediaType
	};
}

export default function CatalogPage() {
	const [products, setProducts] = React.useState<ProductCardProps[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [page, setPage] = React.useState(1);
	const tg = useTelegram();

	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/api/products");
				if (!res.ok) throw new Error("Yuklab bo'lmadi");
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

	const totalPages = Math.ceil(products.length / PAGE_SIZE);
	const paginated = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const goToPrev = () => {
		tg?.HapticFeedback?.impactOccurred("medium");
		setPage((p) => Math.max(1, p - 1));
	};

	const goToNext = () => {
		tg?.HapticFeedback?.impactOccurred("medium");
		setPage((p) => Math.min(totalPages, p + 1));
	};

	return (
		<div className="pt-12">
			<Header title="Katalog" description="Mahsulotlar katalogi" iconImage="/icons/ring.png" />
			<SectionCard iconImage="/icons/book.png" title="Mahsulotlar">
				<div className="grid grid-cols-1 gap-3 mt-2">
					{loading && <Loading />}
					{!loading && error && <p className="text-sm text-red-600 py-4">{error}</p>}
					{!loading && !error && products.length === 0 && <p className="text-sm text-gray-500 py-4">Hozircha mahsulotlar yo&apos;q.</p>}
					{!loading && !error && paginated.map((product) => <ProductCard key={product.id} {...product} />)}
				</div>
				{!loading && !error && totalPages > 1 && (
					<div className="flex items-center justify-between mt-4">
						<RippleButton variant="outline" className={goldButtonClass} onClick={goToPrev} disabled={page === 1}>
							← Oldingi
						</RippleButton>
						<span className="text-sm text-muted-foreground">
							{page} / {totalPages}
						</span>
						<RippleButton variant="outline" className={goldButtonClass} onClick={goToNext} disabled={page === totalPages}>
							Keyingi →
						</RippleButton>
					</div>
				)}
			</SectionCard>
		</div>
	);
}
