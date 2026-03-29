"use client";

import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegram } from "@/hooks/useTelegram";

interface ProductCarouselProps {
	products: CatalogProduct[];
	loading?: boolean;
}

export function ProductCarousel({ products, loading }: ProductCarouselProps) {
	const router = useRouter();
	const tg = useTelegram();
	const [emblaRef] = useEmblaCarousel({ loop: true, dragFree: true }, [AutoScroll({ speed: 1, stopOnInteraction: false, stopOnMouseEnter: false })]);

	const handleCardClick = () => {
		tg?.HapticFeedback?.impactOccurred("light");
		router.push("/catalog");
	};

	if (loading) {
		return (
			<div className="flex gap-3 px-2 py-2 overflow-hidden w-full">
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex-none w-[42%] border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden">
						<div className="relative aspect-[4/5]">
							<Skeleton className="w-full h-full rounded-none" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (products.length === 0) return null;

	const items = [...products, ...products];

	return (
		<div className="overflow-hidden w-full">
			<div ref={emblaRef}>
				<div className="flex gap-3 px-2 py-2">
					{items.map((product, index) => (
						<div
							key={`${product.id}-${index}`}
							className="flex-none w-[42%] border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md overflow-hidden cursor-pointer"
							onClick={handleCardClick}
						>
							<div className="aspect-[4/5]">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={product.url} alt={product.title} className="w-full h-full object-cover" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
