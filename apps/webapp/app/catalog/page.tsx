"use client";

import * as React from "react";
import { Header } from "@/components/common/header";
import { ProductCard } from "@/components/common/product-card";
import { CatalogState } from "@/components/common/catalog-state";
import { CatalogFilters, activeFilterCount } from "./components/catalog-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useCatalogCategories, useCatalogList } from "@/hooks/useCatalog";
import { useFavoriteIds, useFavoriteProducts } from "@/hooks/useFavorites";
import { useTelegram } from "@/hooks/useTelegram";
import { DEFAULT_FILTERS, formatSom, type Filters } from "@/lib/catalog";
import { readCatalogView, saveCatalogView } from "@/lib/catalog-view";
import { Chip } from "@/components/common/chip";
import { Heart, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

const SEARCH_DEBOUNCE_MS = 350;

export default function CatalogPage() {
	const tg = useTelegram();
	const [rawSearch, setRawSearch] = React.useState("");
	const [search, setSearch] = React.useState("");
	const [category, setCategory] = React.useState<string | undefined>();
	// «Sevimlilar»: the liked designs instead of the catalogue query.
	const [favoritesOnly, setFavoritesOnly] = React.useState(false);
	const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
	const [sheetOpen, setSheetOpen] = React.useState(false);
	// Where to scroll once the restored list has rendered; null when there is nothing to restore.
	const scrollTarget = React.useRef<number | null>(null);

	// Coming back to the catalogue (back button or the dock) restores the customer's choices and
	// scroll position (lib/catalog-view.ts); the loaded pages come back from SWR's cache.
	// /catalog?favorites=1 (the Boshqa link) opens on «Sevimlilar», like tapping that chip, and the
	// query is then dropped from the URL, so going back to this entry later restores the view
	// instead of opening «Sevimlilar» again. Read once from window after mount: useSearchParams
	// would need a Suspense boundary around the whole page, and a lazy initial state would differ
	// between server and client render. Until it is read, neither list is requested, so the full
	// catalogue never flashes first.
	const [urlRead, setUrlRead] = React.useState(false);
	React.useEffect(() => {
		const url = new URL(window.location.href);
		const favoritesLink = url.searchParams.get("favorites") === "1";
		const saved = readCatalogView();
		if (saved) {
			setRawSearch(saved.search);
			setSearch(saved.search);
			setCategory(saved.category);
			setFavoritesOnly(saved.favoritesOnly);
			setFilters(saved.filters);
		}
		if (favoritesLink) {
			// A clean «Sevimlilar»: an old search or filter would not apply to the likes list, and
			// would come back unexpectedly on «Hammasi».
			setRawSearch("");
			setSearch("");
			setCategory(undefined);
			setFavoritesOnly(true);
			setFilters(DEFAULT_FILTERS);
			// Save the choice before the query goes, so a second run of this effect (React's dev
			// double mount) restores «Sevimlilar» from the snapshot instead of the older view.
			saveCatalogView({ search: "", category: undefined, favoritesOnly: true, filters: DEFAULT_FILTERS, scrollY: 0 });
			url.searchParams.delete("favorites");
			// null state: Next's patched replaceState then updates its own router URL as well.
			window.history.replaceState(null, "", url.pathname + url.search + url.hash);
		} else if (saved && saved.scrollY > 0) {
			scrollTarget.current = saved.scrollY;
		}
		// Nothing to scroll back to: forget an older position, so leaving without scrolling does
		// not bring it back next time.
		if (saved && scrollTarget.current === null) saveCatalogView({ scrollY: 0 });
		setUrlRead(true);
	}, []);

	const { categories } = useCatalogCategories();

	// Debounce typing so a five-letter word is one request, not five.
	React.useEffect(() => {
		const t = setTimeout(() => setSearch(rawSearch), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(t);
	}, [rawSearch]);

	// Keep the snapshot current, so leaving the page by any route finds it up to date. The search
	// is saved after the debounce, not on every keystroke.
	React.useEffect(() => {
		if (urlRead) saveCatalogView({ search, category, favoritesOnly, filters });
	}, [urlRead, search, category, favoritesOnly, filters]);

	// Track the scroll position from scroll events and save it when the page unmounts. A layout
	// effect, so the listener is gone before the next page scrolls the window to the top. Nothing
	// is saved until a scroll event has fired, so an unmount before any scroll (React's dev double
	// mount) does not overwrite the position still waiting to be restored.
	React.useLayoutEffect(() => {
		let y: number | null = null;
		const onScroll = () => {
			y = window.scrollY;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			if (y !== null) saveCatalogView({ scrollY: y });
		};
	}, []);

	// Each list keeps its pages in SWR's cache per query: «Ko'proq yuklash» appends a page, a
	// changed query starts at page 1, and coming back shows the same pages from cache.
	const catalog = useCatalogList({ ...filters, search, category }, urlRead && !favoritesOnly);
	const liked = useFavoriteProducts(urlRead && favoritesOnly);
	const { products, meta, loading: firstLoad, loadingMore, loadMore, failure, retry } = favoritesOnly ? liked : catalog;
	const { isLiked, count: likedCount } = useFavoriteIds();

	const filterCount = activeFilterCount(filters);
	const ignored = meta?.search?.ignored ?? [];
	const matched = meta?.search?.matched ?? [];
	const visible = favoritesOnly ? products.filter((p) => isLiked(p.productId)) : products;

	// Scroll back once, after the restored list is on screen. Cards have square images, so the
	// page is already its full height before the photos load. A restored list that comes back
	// empty drops the target, so it never fires later on an unrelated list; in «Sevimlilar» it
	// waits for the like ids rather than reading their absence as an empty list.
	React.useEffect(() => {
		if (!urlRead || scrollTarget.current === null || firstLoad) return;
		if (products.length === 0) {
			scrollTarget.current = null;
			return;
		}
		if (visible.length === 0) return;
		const y = scrollTarget.current;
		const id = requestAnimationFrame(() => {
			window.scrollTo(0, y);
			scrollTarget.current = null;
		});
		return () => cancelAnimationFrame(id);
	}, [urlRead, firstLoad, products.length, visible.length]);

	// The error card only shows over an empty list. With products already on screen, a failed
	// «Ko'proq yuklash» or background refresh gets a toast instead of passing silently.
	const failureShown = React.useRef(false);
	React.useEffect(() => {
		if (failure && visible.length > 0 && !failureShown.current) toast.error("Yuklab bo'lmadi, qayta urinib ko'ring");
		failureShown.current = Boolean(failure);
	}, [failure, visible.length]);

	const pick = (fn: () => void) => () => {
		tg?.HapticFeedback?.impactOccurred("light");
		fn();
	};

	return (
		<div className="pt-3">
			<Header
				title="Katalog"
				description="Mahsulotlar katalogi"
				iconImage="/icons/ring.webp"
				compact
				actions={
					meta && !firstLoad ? (
						<span className="text-[13px] text-muted-foreground whitespace-nowrap">
							{formatSom(favoritesOnly ? likedCount : meta.total)} ta mahsulot
						</span>
					) : null
				}
			/>

			{/* Search and categories stay reachable while scrolling — with thousands of products
			    the customer needs to refine far more often than with a two-dozen list. */}
			<div className="pb-2">
				<div className="flex gap-2 px-4 pt-2">
					<div className="grow flex items-center gap-2 h-11 px-4 rounded-full border-2 bg-muted/50 backdrop-blur-[10px] shadow-md">
						<Search className="size-4 text-muted-foreground shrink-0" />
						<input
							value={rawSearch}
							onChange={(e) => {
								setRawSearch(e.target.value);
								setFavoritesOnly(false);
							}}
							placeholder="Uzuk, sirg'a, sapfir…"
							className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						/>
					</div>
					<button
						onClick={pick(() => setSheetOpen(true))}
						aria-label="Filtrlar"
						className="relative size-11 shrink-0 rounded-full bg-[#be9941] text-white flex items-center justify-center"
					>
						<SlidersHorizontal className="size-4" />
						{filterCount > 0 && (
							<span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center border-2 border-background">
								{filterCount}
							</span>
						)}
					</button>
				</div>

				{/* Horizontal scroll row of category chips (components/common/chip.tsx). */}
				{categories.length > 0 && (
					<div className="flex gap-2 px-4 pt-2.5 pb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<Chip
							active={!category && !favoritesOnly}
							onClick={pick(() => {
								setCategory(undefined);
								setFavoritesOnly(false);
							})}
						>
							Hammasi
						</Chip>
						<Chip
							active={favoritesOnly}
							onClick={pick(() => {
								setCategory(undefined);
								setFavoritesOnly(true);
							})}
						>
							<span className="inline-flex items-center gap-1">
								<Heart className="size-3.5" fill={favoritesOnly ? "currentColor" : "none"} />
								Sevimlilar · {likedCount}
							</span>
						</Chip>
						{categories.map((c) => (
							<Chip
								key={c.id}
								active={category === c.slug && !favoritesOnly}
								onClick={pick(() => {
									setCategory(c.slug);
									setFavoritesOnly(false);
								})}
							>
								{c.name.uz}
							</Chip>
						))}
					</div>
				)}
			</div>

			<div className="px-4">
				{/* The API drops a search word that matches nothing rather than returning nothing.
				    Saying so is the difference between "no such thing" and "we showed you less". */}
				{ignored.length > 0 && matched.length > 0 && (
					<div className="flex gap-2.5 items-start rounded-2xl bg-[#f0e6d2] text-[#6b5620] px-4 py-3 mb-3 text-xs leading-relaxed">
						<span>
							«{ignored.join("», «")}» bo&apos;yicha topilmadi — «{matched.join("», «")}» bo&apos;yicha ko&apos;rsatildi
						</span>
					</div>
				)}

				{/* An outage must not read as "we have nothing" — the customer would simply leave. */}
				{failure && !firstLoad && visible.length === 0 && <CatalogState kind={failure} onAction={retry} />}

				<div className="grid grid-cols-2 gap-2.5">
					{firstLoad &&
						[0, 1, 2, 3, 4, 5].map((i) => (
							<div key={i} className="border-2 rounded-4xl overflow-hidden">
								<Skeleton className="w-full aspect-square" />
								<div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
									<Skeleton className="h-3.5 w-3/4" />
									<Skeleton className="h-3 w-2/3" />
									<Skeleton className="h-4 w-1/2" />
								</div>
							</div>
						))}

					{!firstLoad && visible.map((p) => <ProductCard key={p.productId} product={p} />)}
				</div>

				{!firstLoad && !failure && visible.length === 0 && favoritesOnly && (
					<CatalogState
						kind="empty"
						title="Hali sevimli buyumlar yo'q"
						description="Yoqqan buyumdagi ♡ tugmasini bosing"
						actionLabel="Barcha mahsulotlar"
						onAction={() => setFavoritesOnly(false)}
					/>
				)}

				{!firstLoad && !failure && visible.length === 0 && !favoritesOnly && (
					<CatalogState
						kind="empty"
						actionLabel="Filtrlarni tozalash"
						onAction={() => {
							setFilters(DEFAULT_FILTERS);
							setCategory(undefined);
							setRawSearch("");
						}}
					/>
				)}

				{meta?.hasMore && !firstLoad && (
					<div className="flex justify-center mt-4">
						<RippleButton variant="outline" className={goldButtonClass} disabled={loadingMore} onClick={pick(loadMore)}>
							{loadingMore ? "Yuklanmoqda…" : "Ko'proq yuklash"}
						</RippleButton>
					</div>
				)}
			</div>

			<CatalogFilters
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				value={filters}
				onChange={(next) => {
					setFilters(next);
					setFavoritesOnly(false);
				}}
				total={meta?.total}
			/>
		</div>
	);
}
