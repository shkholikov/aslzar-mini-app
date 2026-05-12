"use client";

import * as React from "react";
import { ArrowUpDown, Filter, Search } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface FilterOption<V> {
	value: V;
	label: string;
}

interface ColumnFilterHeaderProps<TData, V> {
	column: Column<TData, unknown>;
	title: string;
	/** Static option list. Mutually exclusive with `useFacetedOptions`. */
	options?: FilterOption<V>[];
	/** When true, options are derived from the column's faceted unique values at render time. Use for dynamic data like employee names. */
	useFacetedOptions?: boolean;
	/** Renderer for faceted options. Defaults to `String(value)`. Ignored if `options` is provided. */
	formatFacetedLabel?: (value: V) => string;
	/** Show a search box inside the popover. Auto-enabled when option count > 10. */
	searchable?: boolean;
	sortable?: boolean;
}

/**
 * Excel-style column header with built-in sort toggle (optional) + filter funnel.
 * Click the funnel → popover opens with a list of checkbox options. Selections are stored
 * in TanStack's column filter state and matched via the `arrIncludesSome` built-in filterFn.
 */
export function ColumnFilterHeader<TData, V>({
	column,
	title,
	options,
	useFacetedOptions = false,
	formatFacetedLabel,
	searchable,
	sortable = false
}: ColumnFilterHeaderProps<TData, V>) {
	const [query, setQuery] = React.useState("");
	const selected = React.useMemo(() => (column.getFilterValue() as V[] | undefined) ?? [], [column.getFilterValue()]); // eslint-disable-line react-hooks/exhaustive-deps
	const isActive = selected.length > 0;

	const resolvedOptions: FilterOption<V>[] = React.useMemo(() => {
		if (options) return options;
		if (!useFacetedOptions) return [];
		const formatter = formatFacetedLabel ?? ((v: V) => String(v));
		const unique = Array.from(column.getFacetedUniqueValues().keys()) as V[];
		const labelled = unique.map((value) => ({ value, label: formatter(value) }));
		labelled.sort((a, b) => a.label.localeCompare(b.label));
		return labelled;
	}, [options, useFacetedOptions, column, formatFacetedLabel]);

	const showSearch = searchable ?? resolvedOptions.length > 10;

	const filteredOptions = React.useMemo(() => {
		if (!query.trim()) return resolvedOptions;
		const q = query.trim().toLowerCase();
		return resolvedOptions.filter((o) => o.label.toLowerCase().includes(q));
	}, [resolvedOptions, query]);

	const toggle = (v: V) => {
		const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
		column.setFilterValue(next.length ? next : undefined);
	};

	const clear = () => {
		column.setFilterValue(undefined);
	};

	return (
		<div className="flex items-center gap-0">
			{sortable ? (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-3 px-2">
					{title}
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			) : (
				<span className="px-2 text-sm font-medium">{title}</span>
			)}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={cn("h-7 w-7", isActive && "text-primary")}
						aria-label={`${title} bo'yicha filterlash`}
					>
						<Filter className={cn("h-3.5 w-3.5", isActive ? "fill-primary text-primary" : "text-muted-foreground")} />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-56 p-2">
					{showSearch && (
						<div className="relative mb-2">
							<Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Qidirish..."
								className="h-8 pl-7 text-xs"
							/>
						</div>
					)}
					<div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
						{filteredOptions.length === 0 ? (
							<p className="px-2 py-2 text-xs text-muted-foreground">Natija yo&apos;q</p>
						) : (
							filteredOptions.map((opt, i) => {
								const id = `f-${column.id}-${i}`;
								const checked = selected.includes(opt.value);
								return (
									<label
										key={id}
										htmlFor={id}
										className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
									>
										<Checkbox id={id} checked={checked} onCheckedChange={() => toggle(opt.value)} />
										<span className="truncate">{opt.label}</span>
									</label>
								);
							})
						)}
					</div>
					{isActive && (
						<>
							<Separator className="my-1" />
							<Button variant="ghost" size="sm" className="w-full justify-start" onClick={clear}>
								Tozalash
							</Button>
						</>
					)}
				</PopoverContent>
			</Popover>
		</div>
	);
}
