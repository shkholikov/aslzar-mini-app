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
	type SortingState,
	type VisibilityState
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Download } from "lucide-react";
import { exportToExcel } from "@/lib/export";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserDocument } from "@/lib/db";
import { Loading } from "./common/loading";

export type User = UserDocument;

type EmployeeSummary = {
	referralCode: string;
	name: string;
	surname: string;
};

function createColumns(employeesByCode: Record<string, EmployeeSummary>): ColumnDef<User>[] {
	return [
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
			meta: { className: "hidden md:table-cell" },
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
			meta: { className: "hidden md:table-cell" },
			header: "Familiya",
			cell: ({ row }) => <div>{row.original.value.last_name || "-"}</div>
		},
		{
			accessorFn: (row) => row.value.username,
			id: "username",
			meta: { className: "hidden md:table-cell" },
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
			meta: { className: "hidden md:table-cell" },
			header: "Kanal a'zosi",
			cell: ({ row }) => <div className="capitalize">{row.original.value.isChannelMember ? "Ha" : "Yo'q"}</div>
		},
		{
			accessorFn: (row) => row.value.user1CData,
			id: "user1CData",
			meta: { className: "hidden md:table-cell" },
			header: "1C Ma'lumotlari",
			cell: ({ row }) => <div>{row.original.value.user1CData ? "Mavjud" : "Mavjud emas"}</div>
		},
		{
			accessorFn: (row) => row.value.referredByEmployeeCode ?? null,
			id: "referredByEmployeeCode",
			meta: { className: "hidden md:table-cell" },
			header: "Xodim(referral)",
			cell: ({ row }) => {
				const code = row.original.value.referredByEmployeeCode;
				if (!code) return <div>-</div>;
				const emp = employeesByCode[code];
				if (!emp) return <div>{code}</div>;
				return <div>{`${emp.name} ${emp.surname}`}</div>;
			}
		},
		{
			accessorFn: (row) => row.value.user1CData?.status ?? null,
			id: "status",
			header: "Status",
			cell: ({ row }) => {
				const user1CData = row.original.value.user1CData;
				if (!user1CData) return <div>-</div>;

				const status = user1CData.status;

				if (status === true) return <div>Aktiv</div>;
				if (status === false) return <div>Aktiv emas</div>;

				return <div>-</div>;
			}
		},
		{
			accessorFn: (row) => row.value.user1CData?.bonusInfo?.uroven ?? null,
			id: "uroven",
			meta: { className: "hidden md:table-cell" },
			header: "Level",
			cell: ({ row }) => {
				const uroven = row.original.value.user1CData?.bonusInfo?.uroven;
				return <div>{uroven ?? "-"}</div>;
			}
		},
		{
			meta: { className: "hidden md:table-cell" },
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
		}
	];
}

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
	const router = useRouter();
	const [users, setUsers] = React.useState<User[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [employeesByCode, setEmployeesByCode] = React.useState<Record<string, EmployeeSummary>>({});

	React.useEffect(() => {
		async function fetchUsers() {
			try {
				setError(null);
				const response = await fetch("/api/users");
				if (response.status === 401) {
					router.replace("/login");
					return;
				}
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					setError(data.error || "Foydalanuvchilarni yuklashda xatolik");
					return;
				}
				const data = await response.json();
				setUsers(data.users || []);
			} catch (err) {
				console.error("Foydalanuvchilarni yuklashda xatolik:", err);
				setError("Foydalanuvchilarni yuklashda xatolik");
			} finally {
				setLoading(false);
			}
		}
		fetchUsers();
	}, [router]);

	React.useEffect(() => {
		let cancelled = false;
		async function fetchEmployees() {
			try {
				const res = await fetch("/api/employees");
				if (res.status === 401) {
					router.replace("/login");
					return;
				}
				if (!res.ok) {
					// Don't block users table if employees request fails
					return;
				}
				const data = await res.json();
				const map: Record<string, EmployeeSummary> = {};
				for (const emp of data.employees || []) {
					if (emp?.referralCode) {
						map[emp.referralCode] = {
							referralCode: emp.referralCode,
							name: emp.name ?? "",
							surname: emp.surname ?? ""
						};
					}
				}
				if (!cancelled) {
					setEmployeesByCode(map);
				}
			} catch {
				// ignore, we just won't resolve employee names
			}
		}
		fetchEmployees();
		return () => {
			cancelled = true;
		};
	}, [router]);

	const columns = React.useMemo(() => createColumns(employeesByCode), [employeesByCode]);

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

	React.useEffect(() => {
		table.setPageSize(10);
	}, [table]);

	if (loading) return <Loading />;
	if (error) {
		return <p className="text-sm text-destructive py-4">{error}</p>;
	}

	function handleExport() {
		const rows = table.getFilteredRowModel().rows.map((row) => {
			const val = row.original.value;
			let createdAtStr = "";
			const createdAt = val.createdAt;
			if (createdAt) {
				let date: Date | null = null;
				if (createdAt instanceof Date) {
					date = createdAt;
				} else if (typeof createdAt === "object" && "$date" in createdAt && typeof createdAt.$date === "string") {
					date = new Date(createdAt.$date);
				} else if (typeof createdAt === "string") {
					date = new Date(createdAt);
				}
				if (date && !isNaN(date.getTime())) {
					createdAtStr = new Intl.DateTimeFormat("uz-UZ", {
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit"
					}).format(date);
				}
			}
			return {
				ID: val.id ?? "",
				Ism: val.first_name ?? "",
				Familiya: val.last_name ?? "",
				Username: val.username ?? "",
				Telefon: val.phone_number ?? "",
				Tasdiqlangan: val.isVerified ? "Ha" : "Yo\'q",
				"Kanal a\'zosi": val.isChannelMember ? "Ha" : "Yo\'q",
				"1C Ma\'lumotlari": val.user1CData ? "Mavjud" : "Mavjud emas",
				Status: val.user1CData?.status === true ? "Aktiv" : val.user1CData?.status === false ? "Aktiv emas" : "",
				Level: val.user1CData?.bonusInfo?.uroven ?? "",
				"Yaratilgan sana": createdAtStr
			};
		});
		exportToExcel(rows, "Foydalanuvchilar", "foydalanuvchilar");
	}

	return (
		<div className="w-full">
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 py-4">
				<Input
					placeholder="Foydalanuvchi nomi, telefon yoki ism bo'yicha qidirish..."
					value={(table.getColumn("username")?.getFilterValue() as string) ?? ""}
					onChange={(event) => table.getColumn("username")?.setFilterValue(event.target.value)}
					className="w-full sm:max-w-sm"
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
			<div className="flex items-center justify-between mb-3">
				<h2 className="text-lg font-medium text-gray-800">Foydalanuvchilar ro'yxati</h2>
				<Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={users.length === 0} className="shrink-0">
					<Download className="mr-2 h-4 w-4" />
					Excel
				</Button>
			</div>
			<div className="overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const meta = header.column.columnDef.meta as { className?: string } | undefined;
									return (
										<TableHead key={header.id} className={meta?.className}>
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
									{row.getVisibleCells().map((cell) => {
										const meta = cell.column.columnDef.meta as { className?: string } | undefined;
										return (
											<TableCell key={cell.id} className={meta?.className}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										);
									})}
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
				<span className="text-muted-foreground text-sm">
					{table.getRowModel().rows.length === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
					{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} /{" "}
					{table.getFilteredRowModel().rows.length}
				</span>
				<Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
					Oldingi
				</Button>
				<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
					Keyingi
				</Button>
			</div>
		</div>
	);
}
