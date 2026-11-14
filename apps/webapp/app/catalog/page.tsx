"use client";

import * as React from "react";
import { Header } from "@/components/common/header";
import { ProductCard } from "@/components/common/product-card";
import { CatalogState } from "@/components/common/catalog-state";
import { CatalogFilters, type Filters, activeFilterCount } from "./components/catalog-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useCatalogCategories, useCatalogPage } from "@/hooks/useCatalog";
import { useFavoriteIds, useFavoriteProducts } from "@/hooks/useFavorites";
import { useTelegram } from "@/hooks/useTelegram";
import { formatSom, type CatalogProduct } from "@/lib/catalog";
import { Chip } from "@/components/common/chip";
import { Heart, Search, SlidersHorizontal } from "lucide-react";

const PER_PAGE = 24;
const SEARCH_DEBOUNCE_MS = 350;

const EMPTY_FILTERS: Filters = { hasPhotos: true, inStock: true };

export default function CatalogPage() {
	const tg = useTelegram();
	const [rawSearch, setRawSearch] = React.useState("");
	const [search, setSearch] = React.useState("");
	const [category, setCategory] = React.useState<string | undefined>();
	// «Sevimlilar»: the liked designs instead of the catalogue query.
	const [favoritesOnly, setFavoritesOnly] = React.useState(false);
	// /catalog?favorites=1 (the profile page link) opens straight on «Sevimlilar». Read once from
	// window after mount: useSearchParams would need a Suspense boundary around the whole page, and a
	// lazy initial state would differ between server and client render. Until it is read, neither
	// list is requested, so the full catalogue never flashes first.
	const [urlRead, setUrlRead] = React.useState(false);
	React.useEffect(() => {
		if (new URLSearchParams(window.location.search).get("favorites") === "1") setFavoritesOnly(true);
		setUrlRead(true);
	}, []);
	const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
	const [sheetOpen, setSheetOpen] = React.useState(false);
	const [page, setPage] = React.useState(1);
	// Pages accumulate: "load more" appends rather than replacing, so scrolling back up works.
	const [loaded, setLoaded] = React.useState<CatalogProduct[]>([]);

	const { categories } = useCatalogCategories();

	// Debounce typing so a five-letter word is one request, not five.
	React.useEffect(() => {
		const t = setTimeout(() => setSearch(rawSearch), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(t);
	}, [rawSearch]);

	// Any change to the query starts a fresh result set.
	React.useEffect(() => {
		setPage(1);
		setLoaded([]);
	}, [search, category, filters, favoritesOnly]);

	const catalog = useCatalogPage({ ...filters, search, category, page, perPage: PER_PAGE }, urlRead && !favoritesOnly);
	const liked = useFavoriteProducts(page, urlRead && favoritesOnly);
	const { products, meta, loading, failure, retry } = favoritesOnly ? liked : catalog;
	const { isLiked, count: likedCount } = useFavoriteIds();

	React.useEffect(() => {
		if (!products.length) return;
		setLoaded((prev) => {
			if (page === 1) return products;
			// SWR can re-emit the same page; key on productId so a re-render never duplicates rows.
			const seen = new Set(prev.map((p) => p.productId));
			return [...prev, ...products.filter((p) => !seen.has(p.productId))];
		});
	}, [products, page]);

	const filterCount = activeFilterCount(filters);
	const ignored = meta?.search?.ignored ?? [];
	const matched = meta?.search?.matched ?? [];
	const firstLoad = loading && loaded.length === 0;
	const visible = favoritesOnly ? loaded.filter((p) => isLiked(p.productId)) : loaded;

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
							setFilters(EMPTY_FILTERS);
							setCategory(undefined);
							setRawSearch("");
						}}
					/>
				)}

				{meta?.hasMore && !firstLoad && (
					<div className="flex justify-center mt-4">
						<RippleButton variant="outline" className={goldButtonClass} disabled={loading} onClick={pick(() => setPage((p) => p + 1))}>
							{loading ? "Yuklanmoqda…" : "Ko'proq yuklash"}
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
