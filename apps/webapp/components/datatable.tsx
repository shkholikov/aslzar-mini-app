"use client";

import * as React from "react";
import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
	VisibilityState
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Payment = {
	id: number;
	sum: number;
	skidka: number;
	vznos: number;
	consultant: string;
	date: string;
	schedule: number;
	pays: number;
	goods: number;
};

const data: Payment[] = [
	{
		id: 1,
		sum: 1200000,
		skidka: 50000,
		vznos: 200000,
		consultant: "Botir Aslonov",
		date: "2024-06-10",
		schedule: 12,
		pays: 2,
		goods: 12345
	},
	{
		id: 2,
		sum: 850000,
		skidka: 10000,
		vznos: 85000,
		consultant: "Dilnoza Xamidova",
		date: "2024-02-14",
		schedule: 6,
		pays: 6,
		goods: 23456
	},
	{
		id: 3,
		sum: 430000,
		skidka: 0,
		vznos: 43000,
		consultant: "Habib Musaev",
		date: "2023-12-28",
		schedule: 10,
		pays: 3,
		goods: 34567
	},
	{
		id: 4,
		sum: 1290000,
		skidka: 269000,
		vznos: 250000,
		consultant: "Nigora Beqova",
		date: "2024-03-03",
		schedule: 8,
		pays: 8,
		goods: 45678
	},
	{
		id: 5,
		sum: 560000,
		skidka: 60000,
		vznos: 112000,
		consultant: "Azamat Nurmatov",
		date: "2024-04-20",
		schedule: 5,
		pays: 1,
		goods: 56789
	},
	{
		id: 6,
		sum: 980000,
		skidka: 20000,
		vznos: 150000,
		consultant: "Dilshod Rakhimov",
		date: "2024-05-15",
		schedule: 7,
		pays: 4,
		goods: 67890
	},
	{
		id: 7,
		sum: 1150000,
		skidka: 75000,
		vznos: 230000,
		consultant: "Malika Abduqodirova",
		date: "2024-01-28",
		schedule: 9,
		pays: 7,
		goods: 78901
	},
	{
		id: 8,
		sum: 670000,
		skidka: 30000,
		vznos: 67000,
		consultant: "Otabek Mamatov",
		date: "2023-11-07",
		schedule: 6,
		pays: 2,
		goods: 89012
	}
];

// Compatible columns for Payment type
export const columns: ColumnDef<Payment>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />,
		enableSorting: false,
		enableHiding: false
	},
	{
		accessorKey: "id",
		header: "ID",
		cell: ({ row }) => row.getValue("id")
	},
	{
		accessorKey: "sum",
		header: ({ column }) => (
			<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Summa <ArrowUpDown />
			</Button>
		),
		cell: ({ row }) =>
			new Intl.NumberFormat("uz-UZ", {
				style: "currency",
				currency: "UZS",
				maximumFractionDigits: 0
			}).format(row.getValue("sum"))
	},
	{
		accessorKey: "skidka",
		header: "Chegirma",
		cell: ({ row }) =>
			new Intl.NumberFormat("uz-UZ", {
				style: "currency",
				currency: "UZS",
				maximumFractionDigits: 0
			}).format(row.getValue("skidka"))
	},
	{
		accessorKey: "vznos",
		header: "Boshlang'ich",
		cell: ({ row }) =>
			new Intl.NumberFormat("uz-UZ", {
				style: "currency",
				currency: "UZS",
				maximumFractionDigits: 0
			}).format(row.getValue("vznos"))
	},
	{
		accessorKey: "consultant",
		header: "Konsultant",
		cell: ({ row }) => <div className="capitalize">{row.getValue("consultant")}</div>
	},
	{
		accessorKey: "date",
		header: "Sana",
		cell: ({ row }) => row.getValue("date")
	},
	{
		accessorKey: "schedule",
		header: "Jadval (oy)",
		cell: ({ row }) => row.getValue("schedule")
	},
	{
		accessorKey: "pays",
		header: "To‘langan (oy)",
		cell: ({ row }) => row.getValue("pays")
	},
	{
		accessorKey: "goods",
		header: "Mahsulot ID",
		cell: ({ row }) => row.getValue("goods")
	},
	{
		id: "actions",
		enableHiding: false,
		cell: ({ row }) => {
			const payment = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.id.toString())}>To‘lov ID sini nusxalash</DropdownMenuItem>
						{/* <DropdownMenuSeparator />
						<DropdownMenuItem>View consultant</DropdownMenuItem>
						<DropdownMenuItem>View payment details</DropdownMenuItem> */}
					</DropdownMenuContent>
				</DropdownMenu>
			);
		}
	}
];

export function DataTableDemo() {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection
		}
	});

	return (
		<div className="w-full">
			<div className="flex items-center py-4">
				<Input
					placeholder="Konsultant bo‘yicha filtrlash..."
					value={(table.getColumn("consultant")?.getFilterValue() as string) ?? ""}
					onChange={(event) => table.getColumn("consultant")?.setFilterValue(event.target.value)}
					className="max-w-sm"
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="ml-auto">
							Ustunlar <ChevronDown />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{table
							.getAllColumns()
							.filter((column) => column.getCanHide())
							.map((column) => {
								return (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) => column.toggleVisibility(!!value)}
									>
										{column.id}
									</DropdownMenuCheckboxItem>
								);
							})}
					</DropdownMenuContent>
				</DropdownMenu>
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
								<TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<div className="text-muted-foreground flex-1 text-sm">
					{table.getFilteredSelectedRowModel().rows.length} tadan {table.getFilteredRowModel().rows.length} ta qator tanlandi.
				</div>
				<div className="space-x-2">
					<Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
						Oldingi
					</Button>
					<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
						Keyingi
					</Button>
				</div>
			</div>
		</div>
	);
}
