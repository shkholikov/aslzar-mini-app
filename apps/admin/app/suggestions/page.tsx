"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState
} from "@tanstack/react-table";
import { ArrowUpDown, Download, MessageSquare } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SuggestionDoc } from "@/lib/db";
import { AdminGuard } from "@/components/common/admin-guard";
import { Loading } from "@/components/common/loading";

function formatDate(d: Date | string) {
	const date = typeof d === "string" ? new Date(d) : d;
	return new Intl.DateTimeFormat("uz-UZ", {
		dateStyle: "medium",
		timeStyle: "short"
	}).format(date);
}

const columns: ColumnDef<SuggestionDoc>[] = [
	{
		accessorKey: "createdAt",
		id: "createdAt",
		header: ({ column }) => (
			<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Sana
				<ArrowUpDown />
			</Button>
		),
		cell: ({ row }) => <div className="whitespace-nowrap">{formatDate(row.original.createdAt)}</div>
	},
	{
		accessorKey: "text",
		id: "text",
		header: "Matn",
		cell: ({ row }) => <div className="max-w-md whitespace-pre-wrap break-words text-left">{row.original.text}</div>,
		filterFn: (row, _columnId, filterValue) => {
			if (!filterValue || typeof filterValue !== "string") return true;
			const v = filterValue.trim().toLowerCase();
			if (!v) return true;
			const s = row.original;
			const text = (s.text ?? "").toLowerCase();
			const user = (s.username ?? "").toLowerCase();
			const first = (s.firstName ?? "").toLowerCase();
			const last = (s.lastName ?? "").toLowerCase();
			const uid = (s.userId ?? "").toLowerCase();
			return text.includes(v) || user.includes(v) || first.includes(v) || last.includes(v) || uid.includes(v);
		}
	},
	{
		accessorKey: "userId",
		id: "userId",
		header: "User ID",
		cell: ({ row }) => <div>{row.original.userId ?? "-"}</div>
	},
	{
		accessorKey: "firstName",
		id: "firstName",
		header: "Ism",
		cell: ({ row }) => <div>{row.original.firstName ?? "-"}</div>
	},
	{
		accessorKey: "lastName",
		id: "lastName",
		header: "Familiya",
		cell: ({ row }) => <div>{row.original.lastName ?? "-"}</div>
	},
	{
		accessorKey: "username",
		id: "username",
		header: ({ column }) => (
			<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Foydalanuvchi nomi
				<ArrowUpDown />
			</Button>
		),
		cell: ({ row }) => <div className="lowercase">{row.original.username ? `@${row.original.username}` : "-"}</div>
	}
];

export default function SuggestionsPage() {
	const router = useRouter();
	const [suggestions, setSuggestions] = React.useState<SuggestionDoc[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

	React.useEffect(() => {
		async function fetchSuggestions() {
			try {
				setError(null);
				const res = await fetch("/api/suggestions");
				if (res.status === 401) {
					router.replace("/login");
					return;
				}
				if (!res.ok) throw new Error("Failed to load suggestions");
				const data = await res.json();
				setSuggestions(data.suggestions || []);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		}
		fetchSuggestions();
	}, [router]);

	const table = useReactTable({
		data: suggestions,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters
		}
	});

	function exportToExcel() {
		const rows = table.getFilteredRowModel().rows.map((row) => {
			const s = row.original;
			return {
				Sana: formatDate(s.createdAt),
				Matn: s.text,
				"User ID": s.userId ?? "",
				Ism: s.firstName ?? "",
				Familiya: s.lastName ?? "",
				"Foydalanuvchi nomi": s.username ? `@${s.username}` : ""
			};
		});
		if (rows.length === 0) return;
		const ws = XLSX.utils.json_to_sheet(rows);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Takliflar");
		XLSX.writeFile(wb, `takliflar_${new Date().toISOString().slice(0, 10)}.xlsx`);
	}

	return (
		<AdminGuard>
			<main className="flex min-h-screen w-full container flex-col py-8 px-4">
				<div className="w-full max-w-6xl mx-auto">
					<div className="flex flex-wrap items-center justify-between gap-4 pb-4">
						<div className="flex items-center gap-2">
							<MessageSquare className="w-10 h-10 text-gray-800" />
							<div>
								<h1 className="text-2xl text-gray-800 font-semibold">Takliflar va shikoyatlar</h1>
								<p className="text-sm text-gray-600">Foydalanuvchilardan kelgan xabarlar</p>
							</div>
						</div>
						<Button type="button" variant="outline" size="sm" onClick={exportToExcel} disabled={suggestions.length === 0} className="shrink-0">
							<Download className="mr-2 h-4 w-4" />
							Excel
						</Button>
					</div>
					<Separator className="mb-6" />

					{error && <p className="text-sm text-destructive mb-4">{error}</p>}

					{loading ? (
						<Loading />
					) : suggestions.length === 0 ? (
						<p className="text-muted-foreground">Hali takliflar yo&apos;q.</p>
					) : (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Input
									placeholder="Matn yoki foydalanuvchi bo'yicha qidirish..."
									value={(table.getColumn("text")?.getFilterValue() as string) ?? ""}
									onChange={(e) => table.getColumn("text")?.setFilterValue(e.target.value)}
									className="max-w-sm"
								/>
							</div>
							<div className="overflow-hidden rounded-md border">
								<Table>
									<TableHeader>
										{table.getHeaderGroups().map((headerGroup) => (
											<TableRow key={headerGroup.id}>
												{headerGroup.headers.map((header) => (
													<TableHead key={header.id}>
														{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
													</TableHead>
												))}
											</TableRow>
										))}
									</TableHeader>
									<TableBody>
										{table.getRowModel().rows?.length ? (
											table.getRowModel().rows.map((row) => (
												<TableRow key={row.id}>
													{row.getVisibleCells().map((cell) => (
														<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
													))}
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell colSpan={columns.length} className="h-24 text-center">
													Natijalar topilmadi.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
							<div className="flex items-center justify-end space-x-2 py-2">
								<span className="text-muted-foreground text-sm">{table.getFilteredRowModel().rows.length} ta yozuv</span>
								<Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
									Oldingi
								</Button>
								<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
									Keyingi
								</Button>
							</div>
						</div>
					)}
				</div>
			</main>
		</AdminGuard>
	);
}
