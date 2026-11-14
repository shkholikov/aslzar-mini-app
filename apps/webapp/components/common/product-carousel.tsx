"use client";

import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useCallback, type ReactNode } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegram } from "@/hooks/useTelegram";
import { useProducts } from "@/hooks/useProducts";
import { ChevronRight } from "lucide-react";
import { displayName } from "@/lib/catalog";
import { CatalogImage } from "@/components/common/catalog-image";
import { GLASS_CARD } from "@/lib/styles";

const CARD = `flex-none w-[42%] overflow-hidden ${GLASS_CARD}`;

/**
 * Auto-scrolling strip of the newest products with photos. With a `title` it gets a section
 * heading and an arrow link to the catalogue (Home); without one it is a bare strip at the
 * end of a page (Finance, Boshqa).
 */
export function ProductCarousel({ title }: { title?: string }) {
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
			<Section title={title}>
				<div className="flex gap-3 px-2 py-2 overflow-hidden w-full">
					{[0, 1, 2].map((i) => (
						<div key={i} className={CARD}>
							<div className="relative aspect-[4/5]">
								<Skeleton className="w-full h-full rounded-none" />
							</div>
						</div>
					))}
				</div>
			</Section>
		);
	}

	if (products.length < 2) return null;

	// The loop needs more cards than fit on screen; repeat only a short list.
	const items = products.length < 4 ? [...products, ...products] : products;

	return (
		<Section title={title}>
			<div className="overflow-hidden w-full">
				<div ref={emblaRef}>
					<div className="flex gap-3 px-2 py-2">
						{items.map((product, index) => (
							<div
								key={`${product.productId}-${index}`}
								className={`${CARD} cursor-pointer`}
								onClick={() => handleCardClick(product.productId)}
							>
								<div className="relative aspect-[4/5]">
									<CatalogImage src={product.images[0].medium} alt={displayName(product)} fill className="object-cover" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</Section>
	);
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
	const tg = useTelegram();
	if (!title) return <>{children}</>;
	return (
		<div className="mt-4">
			<h2 className="mx-2 flex items-center gap-2 font-bold text-xl px-1">
				<Image src="/icons/ring.webp" alt="" width={35} height={35} className="object-contain" sizes="35px" />
				{title}
				<NextLink
					href="/catalog"
					onClick={() => tg?.HapticFeedback?.impactOccurred("heavy")}
					aria-label="Barcha mahsulotlar"
					className="ml-auto size-11 shrink-0 -mr-2 text-[#7a5f1f] flex items-center justify-center active:opacity-60 transition-opacity"
				>
					<ChevronRight className="size-6" strokeWidth={2.5} />
				</NextLink>
			</h2>
			{children}
		</div>
	);
}
