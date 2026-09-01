"use client";

import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegram } from "@/hooks/useTelegram";
import { useProducts } from "@/hooks/useProducts";
import { displayName } from "@/lib/catalog";
import Image from "next/image";

export function ProductCarousel() {
	const router = useRouter();
	const tg = useTelegram();
	const { products, loading } = useProducts();
	const [emblaRef] = useEmblaCarousel({ loop: true, dragFree: true }, [
		AutoScroll({ speed: 1, stopOnInteraction: false, stopOnMouseEnter: false })
	]);

	const handleCardClick = useCallback(
		(productId: string) => {
			tg?.HapticFeedback?.impactOccurred("light");
			router.push(`/catalog/${encodeURIComponent(productId)}`);
		},
		[tg, router]
	);

	if (loading) {
		return (
			<div className="flex gap-3 px-2 py-2 overflow-hidden w-full">
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className="flex-none w-[42%] border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden"
					>
						<div className="relative aspect-[4/5]">
							<Skeleton className="w-full h-full rounded-none" />
						</div>
					</div>
				))}
			</div>
		);
	}

	const withPhotos = products.filter((p) => p.images.length > 0);
	const latest = withPhotos.slice(0, 3);

	if (latest.length < 2) return null;

	const items = [...latest, ...latest];

	return (
		<div className="overflow-hidden w-full">
			<div ref={emblaRef}>
				<div className="flex gap-3 px-2 py-2">
					{items.map((product, index) => (
						<div
							key={`${product.productId}-${index}`}
							className="flex-none w-[42%] border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden cursor-pointer"
							onClick={() => handleCardClick(product.productId)}
						>
							<div className="relative aspect-[4/5]">
								<Image src={product.images[0].medium} alt={displayName(product)} fill className="object-cover" sizes="42vw" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
