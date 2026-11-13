"use client";

import { CatalogImage, CatalogImagePlaceholder } from "@/components/common/catalog-image";
import { FavoriteButton } from "@/components/common/favorite-button";
import NextLink from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import { displayName, priceLabel, productSpecs, type CatalogProduct } from "@/lib/catalog";

export interface ProductCardProps {
	product: CatalogProduct;
}

/**
 * A catalogue tile for the two-column grid. The whole card navigates to the product page — the
 * buying conversation happens there, where the individual pieces and their prices are visible.
 *
 * The photo is contained on a light tile rather than cropped, so a long chain or a pair of
 * earrings shows whole.
 *
 * Price is a range, never a single figure: two pieces of one design differ in weight and so
 * differ in price, so the card shows the cheapest with "dan" whenever there is a choice.
 */
export function ProductCard({ product }: ProductCardProps) {
	const tg = useTelegram();

	const title = displayName(product);
	const price = priceLabel(product.variants);
	const cover = product.images[0];
	const specs = productSpecs(product);

	return (
		<NextLink
			href={`/catalog/${encodeURIComponent(product.productId)}`}
			onClick={() => tg?.HapticFeedback?.impactOccurred("light")}
			className="border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden flex flex-col"
		>
			<div className="relative w-full aspect-square overflow-hidden bg-muted/30">
				{cover ? (
					<CatalogImage src={cover.medium} alt={title} fill className="object-cover" />
				) : (
					// A large part of the catalogue has no imagery in 1C at all. The grid filters
					// these out by default, but a direct link or a cleared filter can still reach one.
					<CatalogImagePlaceholder size={56} />
				)}
				{!product.inStock && (
					<div className="absolute inset-0 bg-background/55 flex items-center justify-center">
						<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-background/90">Sotilgan</span>
					</div>
				)}
				{/* Above the «Sotilgan» overlay: a sold-out design can still be unliked. */}
				<FavoriteButton productId={product.productId} variant="overlay" className="absolute top-1 right-1 z-10" />
			</div>

			<div className="px-3 pt-2.5 pb-3 flex flex-col gap-0.5">
				<h3 className="text-[15px] font-semibold leading-snug line-clamp-1">{title}</h3>
				{specs && <div className="text-xs text-muted-foreground line-clamp-1">{specs}</div>}
				{price && <div className="mt-1 text-[15px] font-bold text-[#7a5f1f]">{price}</div>}
				{product.inStock && product.variantCount > 0 && (
					<div className="text-xs text-muted-foreground">{product.variantCount} dona mavjud</div>
				)}
			</div>
		</NextLink>
	);
}
