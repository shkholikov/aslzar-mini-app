"use client";

import { useState } from "react";
import Image from "next/image";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { Badge } from "@/components/ui/badge";
import { useTelegram } from "@/hooks/useTelegram";
import { goldButtonClass } from "@/components/common/button-variants";
import { ShoppingCart } from "lucide-react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogAction
} from "@/components/ui/alert-dialog";

export type ProductMediaType = "image" | "video";

export interface ProductCardProps {
	id: string;
	title: string;
	description: string;
	price?: number;
	/** URL for image or video (use mediaType to choose how to render) */
	url: string;
	badgeLabel?: string;
	/** "image" (default) or "video" */
	mediaType?: ProductMediaType;
	/** Compact mode: smaller card for 2-column grid */
	compact?: boolean;
}

const SUCCESS_MESSAGE = "Qiziqish bildirganingiz uchun rahmat, biz siz bilan tez orada bog'lanamiz.";

export function ProductCard({ id, title, description, price, url, badgeLabel, mediaType = "image", compact = false }: ProductCardProps) {
	const tg = useTelegram();
	const [interestDialogOpen, setInterestDialogOpen] = useState(false);
	const [sending, setSending] = useState(false);

	const hasPrice = typeof price === "number" && isFinite(price) && price > 0;
	const formattedPrice = hasPrice ? new Intl.NumberFormat("uz-UZ").format(price) : null;

	const handleBuy = async () => {
		setSending(true);
		try {
			const userId = tg?.initDataUnsafe?.user?.id?.toString();
			if (!userId) {
				tg?.HapticFeedback?.notificationOccurred("error");
				return;
			}
			tg?.HapticFeedback?.impactOccurred("medium");
			const res = await fetch("/api/product-interest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					productId: id,
					productTitle: title,
					productDescription: description,
					productPrice: hasPrice ? price : undefined,
					productUrl: url
				})
			});
			if (!res.ok) {
				await res.json().catch(() => ({}));
				tg?.HapticFeedback?.notificationOccurred("error");
				return;
			}
			setInterestDialogOpen(true);
			tg?.HapticFeedback?.notificationOccurred("success");
		} finally {
			setSending(false);
		}
	};

	const isVideo = mediaType === "video";

	return (
		<div className="border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden flex flex-col">
			<div className="relative w-full aspect-[4/5] overflow-hidden bg-muted/30">
				{isVideo ? (
					<video src={url} controls playsInline className="absolute inset-0 w-full h-full object-cover" />
				) : (
					<Image src={url} alt={title} fill className="object-cover" />
				)}
				{badgeLabel && (
					<div className="absolute top-2 left-2">
						<Badge variant="default" className="bg-[#be9941] text-white text-[10px] px-1.5 py-0.5">
							{badgeLabel}
						</Badge>
					</div>
				)}
			</div>
			<div className={compact ? "p-2 flex flex-col gap-1" : "p-4 flex flex-col gap-2"}>
				<div>
					<h3 className={compact ? "font-semibold text-xs leading-snug line-clamp-2" : "font-semibold text-base leading-snug line-clamp-2"}>
						{title}
					</h3>
					{!compact && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{description}</p>}
				</div>
				<div className={`${compact ? "mt-1" : "mt-2"} flex items-center gap-2 ${hasPrice ? "justify-between" : "justify-end"}`}>
					{hasPrice && (
						<div className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>
							<span>{formattedPrice}</span> <span className="text-xs text-muted-foreground">so&apos;m</span>
						</div>
					)}
					<RippleButton
						type="button"
						variant="outline"
						className={`${goldButtonClass} ${compact ? "h-7 w-7 p-0" : ""}`}
						onClick={handleBuy}
						disabled={sending}
					>
						<ShoppingCart className="size-4" />
						{!compact && (sending ? "..." : "Sotib olish")}
					</RippleButton>
				</div>
			</div>
			<AlertDialog open={interestDialogOpen} onOpenChange={setInterestDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Rahmat</AlertDialogTitle>
						<AlertDialogDescription>{SUCCESS_MESSAGE}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction>OK</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
