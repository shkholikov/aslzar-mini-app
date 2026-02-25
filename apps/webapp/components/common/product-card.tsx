"use client";

import Image from "next/image";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { Badge } from "@/components/ui/badge";
import { useTelegram } from "@/hooks/useTelegram";
import { goldButtonClass } from "@/components/common/button-variants";
import { ShoppingCart } from "lucide-react";

export type ProductMediaType = "image" | "video";

export interface ProductCardProps {
	id: string;
	title: string;
	description: string;
	price: number;
	/** URL for image or video (use mediaType to choose how to render) */
	url: string;
	badgeLabel?: string;
	/** "image" (default) or "video" */
	mediaType?: ProductMediaType;
}

export function ProductCard({ title, description, price, url, badgeLabel, mediaType = "image" }: ProductCardProps) {
	const tg = useTelegram();

	const formattedPrice = new Intl.NumberFormat("uz-UZ").format(price);

	const TELEGRAM_CHANNEL_LINK = "https://t.me/ASLZAR_tilla";

	const handleBuy = () => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		if (tg?.openTelegramLink) {
			tg.openTelegramLink(TELEGRAM_CHANNEL_LINK);
		} else {
			window.open(TELEGRAM_CHANNEL_LINK, "_blank");
		}
	};

	const isVideo = mediaType === "video";

	return (
		<div className="border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden flex flex-col">
			<div className="relative w-full aspect-[4/5] overflow-hidden bg-muted/30">
				{isVideo ? (
					<video src={url} poster={url} controls playsInline className="absolute inset-0 w-full h-full object-cover" preload="metadata" />
				) : (
					<Image src={url} alt={title} fill className="object-cover" />
				)}
				{badgeLabel && (
					<div className="absolute top-2 left-2">
						<Badge variant="default" className="bg-[#be9941] text-white">
							{badgeLabel}
						</Badge>
					</div>
				)}
			</div>
			<div className="p-4 flex flex-col gap-2">
				<div>
					<h3 className="font-semibold text-base leading-snug line-clamp-2">{title}</h3>
					<p className="mt-1 text-sm text-muted-foreground line-clamp-3">{description}</p>
				</div>
				<div className="mt-2 flex items-center justify-between gap-3">
					<div className="text-sm font-semibold">
						<span>{formattedPrice}</span> <span className="text-xs text-muted-foreground">so&apos;m</span>
					</div>
					<RippleButton type="button" variant="outline" className={goldButtonClass} onClick={handleBuy}>
						<ShoppingCart className="size-4" />
						Sotib olish
					</RippleButton>
				</div>
			</div>
		</div>
	);
}
