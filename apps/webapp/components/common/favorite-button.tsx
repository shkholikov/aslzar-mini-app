"use client";

import { Heart } from "lucide-react";
import { useFavoriteIds } from "@/hooks/useFavorites";

/**
 * Like / unlike a catalogue design. The two states must read differently at a glance, so they
 * reuse the product page's size-row pattern (gold border when idle, gold fill when chosen):
 *   not liked — light circle, gold outline heart (inline also gets the rows' gold border-2)
 *   liked     — solid gold circle, white filled heart (the catalogue's gold round filter button)
 * inline sits next to the product title; overlay sits on a card photo (the «Sotilgan» pill background).
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

	const size = variant === "inline" ? "size-11 shrink-0 border-2 border-[#be9941]" : "size-8";
	const state = liked ? "bg-[#be9941] text-white" : "bg-background/90 text-[#be9941]";

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
			className={`${size} ${state} rounded-full flex items-center justify-center transition-colors ${className}`}
		>
			<Heart className={variant === "inline" ? "size-5" : "size-4"} fill={liked ? "currentColor" : "none"} />
		</button>
	);
}
