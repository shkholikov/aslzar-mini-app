"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";
import { latinColor, type CatalogQuery } from "@/lib/catalog";

/** The subset of the query the sheet owns. Search and category live in the page header. */
export type Filters = Pick<CatalogQuery, "fineness" | "color" | "stone" | "hasStone" | "hasPhotos" | "inStock">;

/**
 * `fineness` and `color` are strict enums upstream — an unlisted value is a 400, so these are
 * hardcoded from the spec rather than derived from whatever the current page happens to hold.
 * Colour values stay in 1C's Cyrillic on the wire; latinColor() is only for the label.
 */
const FINENESS: NonNullable<CatalogQuery["fineness"]>[] = ["585", "750", "925"];
const COLORS = ["Сарик", "Кизил", "Ок"];

/** Photos and stock default on, so they only count as "active" when the customer turns them off. */
const DEFAULTS: Filters = { hasPhotos: true, inStock: true };

export function activeFilterCount(f: Filters): number {
	let n = 0;
	if (f.fineness) n++;
	if (f.color) n++;
	if (f.stone) n++;
	if (f.hasStone !== undefined) n++;
	if (f.hasPhotos !== DEFAULTS.hasPhotos) n++;
	if (f.inStock !== DEFAULTS.inStock) n++;
	return n;
}

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	value: Filters;
	onChange: (next: Filters) => void;
	total?: number;
}

export function CatalogFilters({ open, onOpenChange, value, onChange, total }: Props) {
	const tg = useTelegram();
	// Edited locally so the grid does not re-query on every tap inside the sheet.
	const [draft, setDraft] = React.useState<Filters>(value);

	React.useEffect(() => {
		if (open) setDraft(value);
	}, [open, value]);

	const tap = (fn: () => void) => () => {
		tg?.HapticFeedback?.impactOccurred("light");
		fn();
	};

	/** Tapping the selected pill clears it — otherwise a single-select can never be undone. */
	const toggle = <K extends keyof Filters>(key: K, next: Filters[K]) =>
		tap(() => setDraft((d) => ({ ...d, [key]: d[key] === next ? undefined : next })));

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="rounded-t-[2rem] px-5 pb-6 max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-[20px] border-t-2"
			>
				<SheetHeader className="px-0">
					<SheetTitle className="text-lg">Filtrlar</SheetTitle>
				</SheetHeader>

				<Section title="Proba">
					{FINENESS.map((f) => (
						<Pill key={f} active={draft.fineness === f} onClick={toggle("fineness", f)}>
							{f}
						</Pill>
					))}
				</Section>

				<Section title="Rang">
					{COLORS.map((c) => (
						<Pill key={c} active={draft.color === c} onClick={toggle("color", c)}>
							{latinColor(c)}
						</Pill>
					))}
				</Section>

				<Section title="Tosh">
					<Pill active={draft.hasStone === true} onClick={toggle("hasStone", true)}>
						Toshli
					</Pill>
					<Pill active={draft.hasStone === false} onClick={toggle("hasStone", false)}>
						Toshsiz
					</Pill>
				</Section>

				<Section title="Boshqa">
					<Pill
						active={draft.hasPhotos !== false}
						onClick={tap(() => setDraft((d) => ({ ...d, hasPhotos: d.hasPhotos === false ? true : false })))}
					>
						Faqat rasmli
					</Pill>
					<Pill
						active={draft.inStock !== false}
						onClick={tap(() => setDraft((d) => ({ ...d, inStock: d.inStock === false ? true : false })))}
					>
						Faqat mavjud
					</Pill>
				</Section>

				<div className="flex gap-2.5 pt-6">
					<RippleButton
						variant="outline"
						className="grow rounded-full"
						onClick={tap(() => {
							setDraft(DEFAULTS);
							onChange(DEFAULTS);
							onOpenChange(false);
						})}
					>
						Tozalash
					</RippleButton>
					<RippleButton
						variant="outline"
						className={`grow-[1.4] ${goldButtonClass}`}
						onClick={tap(() => {
							onChange(draft);
							onOpenChange(false);
						})}
					>
						{typeof total === "number" ? `Ko'rsatish (${total})` : "Ko'rsatish"}
					</RippleButton>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2.5 pt-5">
			<div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
			<div className="flex flex-wrap gap-2">{children}</div>
		</div>
	);
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			onClick={onClick}
			className={`rounded-full px-4 py-2 text-sm font-semibold border-2 transition-colors ${
				active ? "bg-[#be9941] border-[#be9941] text-white" : "bg-muted/50 border-border text-muted-foreground"
			}`}
		>
			{children}
		</button>
	);
}
