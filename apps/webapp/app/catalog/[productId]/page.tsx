"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useProduct } from "@/hooks/useProduct";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { useTelegram } from "@/hooks/useTelegram";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogState } from "@/components/common/catalog-state";
import { SectionCard } from "@/components/common/section-card";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import {
	displayName,
	formatSom,
	latinColor,
	latinStone,
	onAskAboutProduct,
	priceLabel,
	productShareUrl,
	storyCaption,
	variantLabel
} from "@/lib/catalog";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Loader2, MessageCircle, Send } from "lucide-react";

export default function ProductPage() {
	const params = useParams<{ productId: string }>();
	// useParams already returns decoded segments — decoding again would corrupt any id with a %.
	const productId = typeof params?.productId === "string" ? params.productId : undefined;
	const { product, loading, notFound, failure, retry } = useProduct(productId);
	const tg = useTelegram();
	useTelegramBackButton();

	// Index, not article: 1C gives every piece of a design the SAME article, so selecting
	// by article would select all of them at once.
	const [selected, setSelected] = React.useState(0);
	// Real swipe rather than tap-only dots — embla is already used by the home carousel.
	const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
	const [photo, setPhoto] = React.useState(0);
	const [sharing, setSharing] = React.useState(false);

	React.useEffect(() => {
		if (!emblaApi) return;
		const onSelect = () => setPhoto(emblaApi.selectedScrollSnap());
		emblaApi.on("select", onSelect);
		return () => void emblaApi.off("select", onSelect);
	}, [emblaApi]);

	// Cheapest piece is first upstream, so index 0 is a sensible default and the action bar is
	// never ambiguous about which piece it would ask about.
	React.useEffect(() => {
		setSelected(0);
	}, [productId]);

	if (loading) return <ProductSkeleton />;

	// An unreachable catalogue is not a deleted product — saying "not found" during an outage
	// would tell a customer their saved link is dead when it is fine.
	if (failure) {
		return (
			<div className="pt-16 px-4">
				<CatalogState kind={failure} onAction={retry} />
			</div>
		);
	}

	if (notFound || !product) {
		return <Empty title="Mahsulot topilmadi" description="Bu mahsulot katalogdan olib tashlangan bo'lishi mumkin" />;
	}

	const title = displayName(product);
	const price = priceLabel(product.variants);
	const specs = [product.fineness && `${product.fineness} proba`, latinColor(product.color), latinStone(product.stone)].filter(
		Boolean
	) as string[];

	// Both share paths are version-gated, and each is hidden rather than disabled when the client
	// is too old — a greyed-out button the customer can never enable explains nothing.
	const tgAny = tg as {
		shareToStory?: (url: string, p?: unknown) => void;
		shareMessage?: (id: string, cb?: (sent: boolean) => void) => void;
		isVersionAtLeast?: (v: string) => boolean;
	} | null;
	const hasPhoto = product.images.length > 0;
	// shareToStory needs a public media URL, and throws on clients older than Bot API 7.8.
	const canShareStory = Boolean(hasPhoto && tgAny?.shareToStory && tgAny.isVersionAtLeast?.("7.8"));
	// shareMessage (Bot API 8.0) can only send a message the BOT prepared — hence the round trip.
	const canShareChat = Boolean(hasPhoto && tgAny?.shareMessage && tgAny.isVersionAtLeast?.("8.0"));

	const shareToChat = async () => {
		tg?.HapticFeedback?.impactOccurred("medium");
		setSharing(true);
		try {
			// Prepared ids are short-lived, so one is minted per tap rather than cached.
			const { id } = await apiRequest<{ id: string }>(`/v1/catalog/${encodeURIComponent(product.productId)}/share`, {
				method: "POST"
			});
			tgAny?.shareMessage?.(id);
		} catch {
			toast.error("Ulashib bo'lmadi, birozdan so'ng urinib ko'ring");
		} finally {
			setSharing(false);
		}
	};

	const shareToStory = () => {
		tg?.HapticFeedback?.impactOccurred("medium");
		tgAny?.shareToStory?.(product.images[0].large, {
			text: storyCaption(title, price),
			widget_link: { url: productShareUrl(product.productId), name: "ASLZAR" }
		});
	};

	return (
		<div className="pb-2">
			<div className="relative w-full bg-muted/30">
				{product.images.length > 0 ? (
					<div className="overflow-hidden" ref={emblaRef}>
						<div className="flex">
							{product.images.map((img, i) => (
								<div key={img.medium} className="relative flex-[0_0_100%] aspect-square">
									<Image src={img.medium} alt={title} fill className="object-cover" sizes="100vw" priority={i === 0} />
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="aspect-square flex items-center justify-center">
						<Image src="/icons/ring.webp" alt="" width={96} height={96} className="object-contain opacity-30" />
					</div>
				)}

				{product.images.length > 1 && (
					<div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
						{product.images.map((img, i) => (
							<button
								key={img.small}
								aria-label={`${i + 1}-rasm`}
								onClick={() => {
									tg?.HapticFeedback?.impactOccurred("light");
									emblaApi?.scrollTo(i);
								}}
								className={`h-1.5 rounded-full transition-all ${i === photo ? "w-4.5 bg-[#be9941]" : "w-1.5 bg-foreground/25"}`}
							/>
						))}
					</div>
				)}
			</div>

			<div className="px-4 pt-4 flex flex-col gap-2">
				<h1 className="text-2xl font-bold tracking-tight">{title}</h1>
				{price && <div className="text-lg font-bold text-[#be9941]">{price}</div>}
				{specs.length > 0 && (
					<div className="flex flex-wrap gap-1.5 pt-1">
						{/* The app's own gold badge, not a bespoke grey pill — grey on the marble
						    background is effectively invisible. */}
						{specs.map((s) => (
							<Badge key={s} variant="default" className="bg-[#be9941] text-white px-3 py-1">
								{s}
							</Badge>
						))}
					</div>
				)}
			</div>

			{/* The point of the page. Each row is one physical piece with its own weight and
			    therefore its own price — there is no quantity field upstream, so the number of
			    rows IS the stock. */}
			<SectionCard
				iconImage="/icons/box.webp"
				title={product.inStock ? `Mavjud buyumlar (${product.variantCount})` : "Hozirda mavjud emas"}
			>
				<div className="flex flex-col gap-2.5">
					{product.variants.map((v, i) => {
						const active = selected === i;
						const label = variantLabel(v);
						return (
							<button
								key={`${v.article}-${i}`}
								onClick={() => {
									tg?.HapticFeedback?.impactOccurred("light");
									setSelected(i);
								}}
								className={`flex items-center justify-between rounded-[1.25rem] border-2 px-4 py-3 text-left transition-colors ${
									active ? "border-[#be9941] bg-[#be9941]/10" : "border-border bg-muted/40"
								}`}
							>
								<span className="text-sm font-semibold">{label || v.article}</span>
								<span className={`text-sm font-bold ${active ? "text-[#be9941]" : ""}`}>{formatSom(v.price)} so&apos;m</span>
							</button>
						);
					})}

					{!product.inStock && (
						<p className="text-sm text-muted-foreground">
							Bu dizayn bo&apos;yicha hozircha buyum yo&apos;q. Yangi kelganda shu sahifada ko&apos;rinadi.
						</p>
					)}
				</div>
			</SectionCard>

			{/* Sharing sits above the CTA rather than in a corner icon: it is a deliberate act, and
			    an icon over the photo is easy to miss. Same gold pill as every other primary button
			    in the app, just shorter — the app has one button style, not three. Both routes lead
			    back into the bot, so a share is also an invite. `mx-2` aligns with SectionCard. */}
			{(canShareChat || canShareStory) && (
				<div className="mx-2 mt-1 flex gap-2">
					{canShareChat && (
						<RippleButton
							variant="outline"
							className={`flex-1 h-12 text-[14px] ${goldButtonClass}`}
							disabled={sharing}
							onClick={shareToChat}
						>
							{sharing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
							Ulashish
						</RippleButton>
					)}
					{canShareStory && (
						<RippleButton variant="outline" className={`flex-1 h-12 text-[14px] ${goldButtonClass}`} onClick={shareToStory}>
							<Camera className="size-4" />
							Storyga
						</RippleButton>
					)}
				</div>
			)}

			{/* Flows after the list rather than floating. A product has a handful of pieces, so the
			    page fits one screen — pinning the button just left a void under short lists and
			    needed a hardcoded offset to clear the dock. `mx-2` aligns it with SectionCard. */}
			{product.inStock && (
				<div className="mx-2 mt-2">
					<RippleButton
						variant="outline"
						className={`w-full h-14 text-[15px] ${goldButtonClass}`}
						onClick={() => {
							tg?.HapticFeedback?.impactOccurred("medium");
							onAskAboutProduct(product, product.variants[selected]);
						}}
					>
						<MessageCircle className="size-4" />
						Bu buyum haqida so&apos;rash
					</RippleButton>
				</div>
			)}
		</div>
	);
}

function ProductSkeleton() {
	return (
		<div className="pb-28">
			<Skeleton className="w-full aspect-square rounded-none" />
			<div className="px-4 pt-4 flex flex-col gap-2.5">
				<Skeleton className="h-7 w-1/2" />
				<Skeleton className="h-5 w-2/5" />
				<div className="flex gap-2 pt-1">
					<Skeleton className="h-7 w-20 rounded-full" />
					<Skeleton className="h-7 w-16 rounded-full" />
				</div>
			</div>
			<div className="px-4 pt-6 flex flex-col gap-2.5">
				<Skeleton className="h-4 w-40" />
				{[0, 1, 2].map((i) => (
					<Skeleton key={i} className="h-14 w-full rounded-[1.25rem]" />
				))}
			</div>
		</div>
	);
}

function Empty({ title, description }: { title: string; description: string }) {
	return (
		<div className="pt-16 px-4">
			<Item variant="outline" className="flex-col gap-3 py-10 rounded-4xl border-dashed text-center">
				<ItemMedia className="size-20 opacity-40 relative">
					<Image src="/icons/ring.webp" alt="" fill className="object-contain" />
				</ItemMedia>
				<ItemContent className="items-center gap-1">
					<ItemTitle>{title}</ItemTitle>
					<ItemDescription>{description}</ItemDescription>
				</ItemContent>
			</Item>
		</div>
	);
}
