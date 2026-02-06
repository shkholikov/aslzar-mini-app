"use client";

import * as React from "react";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState
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
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserDocument } from "@/lib/db";
import { Loading } from "./common/loading";

export type User = UserDocument;

export const columns: ColumnDef<User>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Tanlash"
			/>
		),
		cell: ({ row }) => (
			<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Qatorni tanlash" />
		),
		enableSorting: false,
		enableHiding: false
	},
	{
		accessorFn: (row) => row.value.id,
		id: "id",
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					ID
					<ArrowUpDown />
				</Button>
			);
		},
		cell: ({ row }) => <div>{row.original.value.id}</div>
	},
	{
		accessorFn: (row) => row.value.first_name,
		id: "first_name",
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					Ism
					<ArrowUpDown />
				</Button>
			);
		},
		cell: ({ row }) => <div>{row.original.value.first_name || "-"}</div>
	},
	{
		accessorFn: (row) => row.value.last_name,
		id: "last_name",
		header: "Familiya",
		cell: ({ row }) => <div>{row.original.value.last_name || "-"}</div>
	},
	{
		accessorFn: (row) => row.value.username,
		id: "username",
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					Foydalanuvchi nomi
					<ArrowUpDown />
				</Button>
			);
		},
		cell: ({ row }) => <div className="lowercase">{row.original.value.username || "-"}</div>,
		filterFn: (row, _columnId, filterValue) => {
			if (!filterValue || typeof filterValue !== "string") return true;
			const v = filterValue.trim().toLowerCase();
			if (!v) return true;
			const val = row.original.value;
			const first = (val.first_name ?? "").toString().toLowerCase();
			const last = (val.last_name ?? "").toString().toLowerCase();
			const user = (val.username ?? "").toString().toLowerCase();
			const phone = (val.phone_number ?? "").toString().toLowerCase();
			return first.includes(v) || last.includes(v) || user.includes(v) || phone.includes(v);
		}
	},
	{
		accessorFn: (row) => row.value.phone_number,
		id: "phone_number",
		header: "Telefon raqami",
		cell: ({ row }) => <div>{row.original.value.phone_number || "-"}</div>
	},
	{
		accessorFn: (row) => row.value.isVerified,
		id: "isVerified",
		header: "Tasdiqlangan",
		cell: ({ row }) => <div className="capitalize">{row.original.value.isVerified ? "Ha" : "Yo'q"}</div>
	},
	{
		accessorFn: (row) => row.value.isChannelMember,
		id: "isChannelMember",
		header: "Kanal a'zosi",
		cell: ({ row }) => <div className="capitalize">{row.original.value.isChannelMember ? "Ha" : "Yo'q"}</div>
	},
	{
		accessorFn: (row) => row.value.user1CData,
		id: "user1CData",
		header: "1C Ma'lumotlari",
		cell: ({ row }) => <div>{row.original.value.user1CData ? "Mavjud" : "Mavjud emas"}</div>
	},
	{
		accessorFn: (row) => {
			const createdAt = row.value.createdAt;
			if (!createdAt) return 0;

			// Handle Date object
			if (createdAt instanceof Date) {
				return createdAt.getTime();
			}

			// Handle MongoDB $date format: { "$date": "2025-12-13T23:05:09.438Z" }
			if (typeof createdAt === "object" && createdAt !== null) {
				if ("$date" in createdAt && typeof createdAt.$date === "string") {
					return new Date(createdAt.$date).getTime();
				}
				// If it's already a date string
				if (typeof createdAt === "string") {
					return new Date(createdAt).getTime();
				}
			}

			// If it's a string directly
			if (typeof createdAt === "string") {
				return new Date(createdAt).getTime();
			}

			return 0;
		},
		id: "createdAt",
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					Yaratilgan sana
					<ArrowUpDown />
				</Button>
			);
		},
		cell: ({ row }) => {
			const createdAt = row.original.value.createdAt;
			if (!createdAt) return <div>-</div>;

			let date: Date | null = null;

			// Handle Date object
			if (createdAt instanceof Date) {
				date = createdAt;
			}
			// Handle MongoDB $date format: { "$date": "2025-12-13T23:05:09.438Z" }
			else if (typeof createdAt === "object" && createdAt !== null) {
				if ("$date" in createdAt) {
					const dateValue = createdAt.$date;
					if (typeof dateValue === "string") {
						date = new Date(dateValue);
					}
				}
			}
			// If it's a string directly
			else if (typeof createdAt === "string") {
				date = new Date(createdAt);
			}

			if (!date || isNaN(date.getTime())) {
				return <div>-</div>;
			}

			return (
				<div>
					{new Intl.DateTimeFormat("uz-UZ", {
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit"
					}).format(date)}
				</div>
			);
		}
	},
	{
		id: "actions",
		header: "Amallar",
		enableHiding: false,
		cell: ({ row }) => {
			const user = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Menuni ochish</span>
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Amallar</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.key)}>Foydalanuvchi ID ni nusxalash</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>Foydalanuvchi tafsilotlarini ko'rish</DropdownMenuItem>
						<DropdownMenuItem>1C ma'lumotlarini ko'rish</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		}
	}
];

export function UsersList() {
	const [sorting, setSorting] = React.useState<SortingState>([
		{
			id: "createdAt",
			desc: true // Sort by newest first
		}
	]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});
	const [users, setUsers] = React.useState<User[]>([]);
	const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		async function fetchUsers() {
			try {
				const response = await fetch("/api/users");
				if (!response.ok) {
					throw new Error("Foydalanuvchilarni yuklashda xatolik");
				}
				const data = await response.json();
				setUsers(data.users || []);
			} catch (error) {
				console.error("Foydalanuvchilarni yuklashda xatolik:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchUsers();
	}, []);

	const table = useReactTable({
		data: users,
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

	if (loading) return <Loading />;

	return (
		<div className="w-full">
			<div className="flex items-center py-4">
				<Input
					placeholder="Foydalanuvchi nomi, telefon yoki ism bo'yicha qidirish..."
					value={(table.getColumn("username")?.getFilterValue() as string) ?? ""}
					onChange={(event) => table.getColumn("username")?.setFilterValue(event.target.value)}
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
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
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
									Natijalar topilmadi.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<div className="text-muted-foreground flex-1 text-sm">
					{table.getFilteredSelectedRowModel().rows.length} ta {table.getFilteredRowModel().rows.length} tadan tanlangan.
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
