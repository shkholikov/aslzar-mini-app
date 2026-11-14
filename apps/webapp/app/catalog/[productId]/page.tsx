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
import { CatalogImage, CatalogImagePlaceholder } from "@/components/common/catalog-image";
import { FavoriteButton } from "@/components/common/favorite-button";
import { SectionCard } from "@/components/common/section-card";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonLgClass } from "@/components/common/button-variants";
import { ListGroup } from "@/components/common/list-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
	askAboutProduct,
	displayName,
	formatSom,
	priceLabel,
	productSpecs,
	productShareUrl,
	storyCaption,
	variantLabel
} from "@/lib/catalog";
import { ApiError, apiRequest } from "@/lib/api-client";
import { setDockHidden } from "@/lib/dock";
import { toast } from "sonner";
import { Camera, Loader2, MessageCircle, Send, Share } from "lucide-react";

export default function ProductPage() {
	const params = useParams<{ productId: string }>();
	// useParams already returns decoded segments — decoding again would corrupt any id with a %.
	const productId = typeof params?.productId === "string" ? params.productId : undefined;
	const { product, loading, notFound, failure, retry } = useProduct(productId);
	const tg = useTelegram();
	useTelegramBackButton();

	// Index, not article: 1C gives every piece of a design the SAME article, so selecting
	// by article would select all of them at once.
	// Nothing is selected on arrival: the bottom bar (and the hidden dock) appear only once the
	// customer has picked a piece, so the dock stays usable while they are just looking.
	const [selected, setSelected] = React.useState<number | null>(null);
	// Real swipe rather than tap-only dots — embla is already used by the home carousel.
	const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
	const [photo, setPhoto] = React.useState(0);
	const [sharing, setSharing] = React.useState(false);
	const [shareSheetOpen, setShareSheetOpen] = React.useState(false);
	const [asking, setAsking] = React.useState(false);
	// initData is fixed at launch, so a permission granted in this session isn't reflected in it.
	const writeAllowed = React.useRef(false);

	React.useEffect(() => {
		if (!emblaApi) return;
		const onSelect = () => setPhoto(emblaApi.selectedScrollSnap());
		emblaApi.on("select", onSelect);
		return () => void emblaApi.off("select", onSelect);
	}, [emblaApi]);

	React.useEffect(() => {
		setSelected(null);
	}, [productId]);

	// The bottom bar replaces the dock while a piece is selected; the dock comes back when the
	// selection is cleared and when the customer leaves the page.
	const hasSelection = selected !== null && Boolean(product?.variants[selected]);
	React.useEffect(() => {
		setDockHidden(hasSelection);
	}, [hasSelection]);
	React.useEffect(() => () => setDockHidden(false), []);

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
	const specs = productSpecs(product);

	// Both share paths are version-gated, and each is hidden rather than disabled when the client
	// is too old — a greyed-out button the customer can never enable explains nothing.
	const tgAny = tg as {
		shareToStory?: (url: string, p?: unknown) => void;
		shareMessage?: (id: string, cb?: (sent: boolean) => void) => void;
		isVersionAtLeast?: (v: string) => boolean;
		requestWriteAccess?: (cb?: (granted: boolean) => void) => void;
		initDataUnsafe?: { user?: { allows_write_to_pm?: boolean } };
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

	// The answer goes to the bot chat, and Telegram won't let the bot write to someone who opened
	// the Mini App by a link and never pressed Start ("bot can't initiate conversation"). So ask for
	// permission first (Bot API 6.9+). Older clients, or a failing call, send as before.
	const botCanWrite = async (): Promise<boolean> => {
		if (writeAllowed.current || tgAny?.initDataUnsafe?.user?.allows_write_to_pm === true) return true;
		if (!tgAny?.requestWriteAccess || !tgAny.isVersionAtLeast?.("6.9")) return true;
		const webApp = tgAny;
		try {
			const granted = await new Promise<boolean>((resolve) => webApp.requestWriteAccess!((ok) => resolve(Boolean(ok))));
			writeAllowed.current = granted;
			return granted;
		} catch {
			return true;
		}
	};

	// The agent's answer arrives in the chat with the bot, not in the Mini App — so on success we
	// say where to look and close the app, rather than leaving a tap that seems to do nothing.
	const askAboutThisPiece = async () => {
		const variant = selected !== null ? product.variants[selected] : undefined;
		if (!variant || asking) return;
		tg?.HapticFeedback?.impactOccurred("medium");
		setAsking(true);
		// Refused: the question would reach the agent but its answer never reach the customer.
		if (!(await botCanWrite())) {
			tg?.HapticFeedback?.notificationOccurred("warning");
			toast.error("Javob olish uchun botga yozishga ruxsat bering yoki botda «Start» tugmasini bosing");
			setAsking(false);
			return;
		}
		try {
			await askAboutProduct(product.productId, variant.id);
			tg?.HapticFeedback?.notificationOccurred("success");
			toast.success("Javob bot chatida keladi");
			setTimeout(() => tg?.close?.(), 1200);
			// Leave `asking` on: the button stays disabled until the app closes.
		} catch (error) {
			tg?.HapticFeedback?.notificationOccurred("error");
			if (error instanceof ApiError && error.status === 409) {
				// Sold since the page loaded. Refresh so the list stops offering it.
				toast.error("Bu buyum hozirgina sotildi");
				setSelected(null);
				retry();
			} else {
				toast.error("Hozircha yuborib bo'lmadi, keyinroq urinib ko'ring");
			}
			setAsking(false);
		}
	};

	// One share icon: a sheet when both routes exist, the route itself when only one does, and no
	// icon at all on a client that supports neither.
	const openShare = () => {
		if (canShareChat && canShareStory) {
			tg?.HapticFeedback?.impactOccurred("light");
			setShareSheetOpen(true);
		} else if (canShareChat) {
			void shareToChat();
		} else if (canShareStory) {
			shareToStory();
		}
	};

	const selectedVariant = selected !== null ? product.variants[selected] : undefined;

	return (
		<div className={selectedVariant ? "pb-28" : "pb-2"}>
			<div className="relative w-full bg-muted/30">
				{product.images.length > 0 ? (
					<div className="overflow-hidden" ref={emblaRef}>
						<div className="flex">
							{product.images.map((img, i) => (
								<div key={img.medium} className="relative flex-[0_0_100%] aspect-square">
									<CatalogImage src={img.medium} alt={title} fill className="object-cover" priority={i === 0} />
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="relative aspect-square">
						<CatalogImagePlaceholder size={96} />
					</div>
				)}

				{product.images.length > 1 && (
					<span
						aria-live="polite"
						className="absolute bottom-3 right-4 rounded-full bg-[#373736]/75 px-2 py-0.5 text-xs font-medium text-white"
					>
						{photo + 1} / {product.images.length}
					</span>
				)}
			</div>

			<div className="px-4 pt-4 flex flex-col gap-1.5">
				<div className="flex items-start gap-2">
					<div className="min-w-0 flex-1">
						{specs && <p className="text-[13px] text-muted-foreground">{specs}</p>}
						<h1 className="mt-0.5 text-2xl font-bold leading-tight tracking-tight">{title}</h1>
					</div>
					{(canShareChat || canShareStory) && (
						<button
							type="button"
							aria-label="Ulashish"
							disabled={sharing}
							onClick={openShare}
							className="size-11 shrink-0 rounded-full border-2 border-[#be9941] bg-background/90 text-[#7a5f1f] flex items-center justify-center disabled:opacity-60"
						>
							{sharing ? <Loader2 className="size-5 animate-spin" /> : <Share className="size-5" />}
						</button>
					)}
					<FavoriteButton productId={product.productId} variant="inline" />
				</div>
				{price && <div className="text-xl font-bold text-[#7a5f1f]">{price}</div>}
			</div>

			{/* The point of the page. Each row is one physical piece with its own weight and
			    therefore its own price — there is no quantity field upstream, so the number of
			    rows IS the stock. Tapping the selected row clears it. */}
			<div className="mt-2">
				<SectionCard
					iconImage="/icons/box.webp"
					title={product.inStock ? `Buyumni tanlang (${product.variantCount})` : "Hozirda mavjud emas"}
				>
					<div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Buyumni tanlang">
						{product.variants.map((v, i) => {
							const active = selected === i;
							const label = variantLabel(v);
							return (
								<button
									type="button"
									role="radio"
									aria-checked={active}
									key={`${v.article}-${i}`}
									onClick={() => {
										tg?.HapticFeedback?.impactOccurred("light");
										setSelected(active ? null : i);
									}}
									className={`flex min-h-14 items-center gap-3 rounded-[1.25rem] border-2 px-4 py-3 text-left transition-colors ${
										active ? "border-[#be9941] bg-[#be9941]/10" : "border-border bg-muted/40"
									}`}
								>
									<span
										aria-hidden
										className={`size-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
											active ? "border-[#be9941]" : "border-muted-foreground/70"
										}`}
									>
										{active && <span className="size-2.5 rounded-full bg-[#be9941]" />}
									</span>
									<span className="flex-1 text-[15px] font-semibold">{label || v.article}</span>
									<span className="text-[15px] font-bold">{formatSom(v.price)} so&apos;m</span>
								</button>
							);
						})}

						{product.inStock ? (
							<p className="mx-1 mt-0.5 text-xs text-muted-foreground">
								Har bir buyum og&apos;irligiga qarab narxlanadi. Javob bot chatida keladi.
							</p>
						) : (
							<p className="text-sm text-muted-foreground">
								Bu dizayn bo&apos;yicha hozircha buyum yo&apos;q. Yangi kelganda shu sahifada ko&apos;rinadi.
							</p>
						)}
					</div>
				</SectionCard>
			</div>

			{/* Replaces the dock while a piece is selected (setDockHidden above): a floating button in
			    the dock's place, no bar behind it. */}
			{selectedVariant && (
				<div className="fixed inset-x-0 bottom-6 z-40 px-4 pointer-events-none">
					<RippleButton
						variant="outline"
						className={`pointer-events-auto w-full h-[52px] text-[15px] shadow-[0_10px_30px_-6px_rgba(0,0,0,0.25)] ${goldButtonLgClass}`}
						disabled={asking}
						onClick={askAboutThisPiece}
					>
						{asking ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
						Bu buyum haqida so&apos;rash
					</RippleButton>
				</div>
			)}

			<Sheet open={shareSheetOpen} onOpenChange={setShareSheetOpen}>
				<SheetContent
					side="bottom"
					aria-describedby={undefined}
					className="rounded-t-[2rem] px-3 pb-8 bg-background/95 backdrop-blur-[20px] border-t-2"
				>
					<SheetHeader className="px-2 pb-0">
						<SheetTitle className="text-lg">Ulashish</SheetTitle>
					</SheetHeader>
					<ListGroup
						className="m-0"
						rows={[
							{
								id: "chat",
								icon: Send,
								title: "Chatga yuborish",
								onClick: () => {
									setShareSheetOpen(false);
									void shareToChat();
								}
							},
							{
								id: "story",
								icon: Camera,
								title: "Storyga joylash",
								onClick: () => {
									setShareSheetOpen(false);
									shareToStory();
								}
							}
						]}
					/>
				</SheetContent>
			</Sheet>
		</div>
	);
}

function ProductSkeleton() {
	return (
		<div className="pb-28">
			<Skeleton className="w-full aspect-square rounded-none" />
			<div className="px-4 pt-4 flex flex-col gap-2.5">
				<Skeleton className="h-3.5 w-2/5" />
				<Skeleton className="h-7 w-1/2" />
				<Skeleton className="h-6 w-2/5" />
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
