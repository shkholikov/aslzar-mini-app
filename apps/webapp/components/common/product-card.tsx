"use client";

import Image from "next/image";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { Badge } from "@/components/ui/badge";
import { useTelegram } from "@/hooks/useTelegram";

export interface ProductCardProps {
	id: string;
	title: string;
	description: string;
	price: number;
	imageUrl: string;
	badgeLabel?: string;
}

export function ProductCard({ title, description, price, imageUrl, badgeLabel }: ProductCardProps) {
	const tg = useTelegram();

	const formattedPrice = new Intl.NumberFormat("uz-UZ").format(price);

	const handleBuy = () => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		// Hook real purchase flow here later
	};

	return (
		<div className="border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden flex flex-col">
			<div className="relative w-full aspect-video overflow-hidden">
				<Image src={imageUrl} alt={title} fill className="object-cover" />
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
					<RippleButton
						type="button"
						variant="outline"
						className="px-4 py-1 rounded-full bg-[#be9941] text-white border-[#be9941] hover:bg-[#a88538] hover:text-white"
						onClick={handleBuy}
					>
						Sotib olish
					</RippleButton>
				</div>
			</div>
		</div>
	);
}
