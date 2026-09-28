"use client";

import { Heart } from "lucide-react";
import { useFavoriteIds } from "@/hooks/useFavorites";

/**
 * Like / unlike a catalogue design. Styles are the app's existing ones, not new:
 *   inline  — the catalogue's gold round filter button (app/catalog/page.tsx), on the product page
 *   overlay — the product card's own «Sotilgan» pill background (product-card.tsx), on the photo
 *
 * On a card the button sits inside the card's link, so the tap must not open the product.
 */
export function FavoriteButton({
	productId,
	variant,
	className = ""
}: {
	productId: string;
	variant: "inline" | "overlay";
	className?: string;
}) {
	const { isLiked, toggle } = useFavoriteIds();
	const liked = isLiked(productId);

	const style =
		variant === "inline"
			? "size-11 shrink-0 rounded-full bg-[#be9941] text-white flex items-center justify-center"
			: "size-8 rounded-full bg-background/90 text-[#be9941] flex items-center justify-center";

	return (
		<button
			type="button"
			aria-label={liked ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
			aria-pressed={liked}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void toggle(productId);
			}}
			className={`${style} ${className}`}
		>
			<Heart className="size-4" fill={liked ? "currentColor" : "none"} />
		</button>
	);
}
