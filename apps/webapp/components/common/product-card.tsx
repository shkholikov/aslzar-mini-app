"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import { displayName, priceLabel, type CatalogProduct } from "@/lib/catalog";

export interface ProductCardProps {
	product: CatalogProduct;
	/** Compact: 2-column grid. Otherwise a single wide column. */
	compact?: boolean;
}

/**
 * A catalogue tile. The whole card navigates to the product page — the buying conversation
 * happens there, where the individual pieces and their prices are visible.
 *
 * Price is a range, never a single figure: two pieces of one design differ in weight and so
 * differ in price, so the card shows the cheapest with "dan" whenever there is a choice.
 */
export function ProductCard({ product, compact = false }: ProductCardProps) {
	const tg = useTelegram();

	const title = displayName(product);
	const price = priceLabel(product.variants);
	const cover = product.images[0];

	return (
		<NextLink
			href={`/catalog/${encodeURIComponent(product.productId)}`}
			onClick={() => tg?.HapticFeedback?.impactOccurred("light")}
			className="border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden flex flex-col"
		>
			<div className="relative w-full aspect-square overflow-hidden bg-muted/30">
				{cover ? (
					<Image
						src={cover.medium}
						alt={title}
						fill
						className="object-cover"
						sizes={compact ? "(max-width: 768px) 48vw, 300px" : "(max-width: 768px) 100vw, 560px"}
					/>
				) : (
					// A large part of the catalogue has no imagery in 1C at all. The grid filters
					// these out by default, but a direct link or a cleared filter can still reach one.
					<div className="absolute inset-0 flex items-center justify-center">
						<Image src="/icons/ring.webp" alt="" width={56} height={56} className="object-contain opacity-30" />
					</div>
				)}
				{!product.inStock && (
					<div className="absolute inset-0 bg-background/55 flex items-center justify-center">
						<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-background/90">Sotilgan</span>
					</div>
				)}
			</div>

			<div className={compact ? "p-2.5 flex flex-col gap-0.5" : "p-4 flex flex-col gap-1"}>
				<h3 className={`font-semibold leading-snug line-clamp-1 ${compact ? "text-sm" : "text-base"}`}>{title}</h3>
				{price && <div className={`font-bold text-[#be9941] ${compact ? "text-sm" : "text-base"}`}>{price}</div>}
				{product.variantCount > 1 && <div className="text-[11px] text-muted-foreground">{product.variantCount} dona</div>}
			</div>
		</NextLink>
	);
}
