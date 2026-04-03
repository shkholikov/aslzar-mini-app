"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/common/admin-guard";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EmployeeDoc } from "@/lib/db";
import { Loading } from "@/components/common/loading";
import { Copy, Download, Users } from "lucide-react";
import { exportToExcel } from "@/lib/export";
import QRCode from "qrcode";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/date-picker";

const BOT_LINK = process.env.NEXT_PUBLIC_BOT_TELEGRAM_LINK || "https://t.me/aslzaruzbot";
const PAGE_SIZE = 10;

type EmployeeWithCount = Omit<EmployeeDoc, "_id"> & { _id?: string; referredCount?: number };

function formatDate(d: Date | string | undefined) {
	if (!d) return "-";
	const date = typeof d === "string" ? new Date(d) : d;
	return new Intl.DateTimeFormat("uz-UZ", {
		dateStyle: "short",
		timeStyle: "short"
	}).format(date);
}

function formatDateShort(isoDate: string) {
	const [y, m, d] = isoDate.split("-");
	return `${d}.${m}.${y}`;
}

function buildReferralLink(code: string) {
	const base = BOT_LINK.replace(/\?.*$/, "");
	return `${base}?start=${code}`;
}

function buildQrFilename(emp: EmployeeWithCount) {
	const base = `${emp.name}-${emp.surname}-${emp.filial}`.trim();
	const normalized = base.replace(/\s+/g, "-");
	return `${normalized || "employee"}.png`;
}

interface EmployeeQrProps {
	link: string;
	filename: string;
}

function EmployeeQr({ link, filename }: EmployeeQrProps) {
	const [dataUrl, setDataUrl] = React.useState<string | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		async function generate() {
			try {
				const url = await QRCode.toDataURL(link, {
					width: 200,
					margin: 1
				});
				if (!cancelled) {
					setDataUrl(url);
				}
			} catch (e) {
				console.error("QR generation error:", e);
			}
		}
		generate();
		return () => {
			cancelled = true;
		};
	}, [link]);

	if (!dataUrl) {
		return <span className="text-xs text-muted-foreground">QR tayyorlanmoqda…</span>;
	}

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="text-xs"
			onClick={() => {
				const link = document.createElement("a");
				link.href = dataUrl;
				link.download = filename;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}}
		>
			QR ni yuklab olish
		</Button>
	);
}

export default function EmployeesPage() {
	const router = useRouter();
	const [employees, setEmployees] = React.useState<EmployeeWithCount[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [saving, setSaving] = React.useState(false);
	const [name, setName] = React.useState("");
	const [surname, setSurname] = React.useState("");
	const [filial, setFilial] = React.useState("");
	const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
	const [page, setPage] = React.useState(1);
	const [fromDate, setFromDate] = React.useState("");
	const [toDate, setToDate] = React.useState("");
	const [activeRange, setActiveRange] = React.useState<{ from: string; to: string } | null>(null);

	const fetchEmployees = React.useCallback(
		async (range?: { from: string; to: string }) => {
			try {
				setError(null);
				setLoading(true);
				const url = range ? `/api/employees?from=${range.from}&to=${range.to}` : "/api/employees";
				const res = await fetch(url);
				if (res.status === 401) {
					router.replace("/login");
					return;
				}
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					throw new Error(data.error || "Xodimlarni yuklab bo’lmadi");
				}
				const data = await res.json();
				setEmployees((data.employees || []) as EmployeeWithCount[]);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Noma’lum xatolik");
			} finally {
				setLoading(false);
			}
		},
		[router]
	);

	React.useEffect(() => {
		fetchEmployees();
	}, [fetchEmployees]);

	function handleFilter() {
		if (!fromDate || !toDate) return;
		const range = { from: fromDate, to: toDate };
		setActiveRange(range);
		setPage(1);
		fetchEmployees(range);
	}

	function handleClear() {
		setFromDate("");
		setToDate("");
		setActiveRange(null);
		setPage(1);
		fetchEmployees();
	}

	React.useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [employees.length, page]);

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (saving) return;

		const trimmedName = name.trim();
		const trimmedSurname = surname.trim();
		const trimmedFilial = filial.trim();

		if (!trimmedName || !trimmedSurname || !trimmedFilial) {
			setError("Ism, familiya va filial to‘ldirilishi shart.");
			return;
		}

		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/employees", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: trimmedName,
					surname: trimmedSurname,
					filial: trimmedFilial
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Xodimni saqlab bo‘lmadi");
			}

			// Newly created employee has 0 referrals initially
			const base = data.employee as EmployeeDoc;
			const created: EmployeeWithCount = {
				name: base.name,
				surname: base.surname,
				filial: base.filial,
				referralCode: base.referralCode,
				createdAt: base.createdAt,
				_id: (base._id as string | undefined) ?? undefined,
				referredCount: 0
			};
			setEmployees((prev) => [created, ...prev]);
			setName("");
			setSurname("");
			setFilial("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Noma’lum xatolik");
		} finally {
			setSaving(false);
		}
	}

	async function copyLink(link: string, referralCode: string) {
		try {
			await navigator.clipboard.writeText(link);
			setCopiedCode(referralCode);
			window.setTimeout(() => setCopiedCode(null), 2000);
		} catch {
			// ignore
		}
	}

	const totalPages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
	const paginatedEmployees = employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const startItem = employees.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const endItem = Math.min(page * PAGE_SIZE, employees.length);

	function handleExport() {
		const rows = employees.map((emp) => ({
			Ism: emp.name,
			Familiya: emp.surname,
			Filial: emp.filial,
			"Qo\'shilgan sana": formatDate(emp.createdAt),
			"Referral havola": buildReferralLink(emp.referralCode),
			"Taklif qilinganlar": emp.referredCount ?? 0
		}));
		exportToExcel(rows, "Xodimlar", "xodimlar");
	}

	return (
		<AdminGuard requiredPermission="employees">
			<main className="flex min-h-screen w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
				<div className="w-full">
					<div className="flex items-center gap-2 pb-4">
						<Users className="w-10 h-10 text-gray-800" />
						<div>
							<h1 className="text-2xl text-gray-800 font-semibold">Xodimlar</h1>
							<p className="text-sm text-gray-600">
								Xodimlarni qo‘shing, ularga maxsus referral havola va QR kod bering hamda taklif qilgan mijozlari sonini kuzating.
							</p>
						</div>
					</div>
					<Separator className="mb-4" />

					<div className="flex flex-wrap items-end gap-3 mb-6">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Dan</label>
							<DatePicker value={fromDate} onChange={setFromDate} />
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Gacha</label>
							<DatePicker value={toDate} onChange={setToDate} />
						</div>
						<Button type="button" disabled={!fromDate || !toDate || loading} onClick={handleFilter}>
							Filtrlash
						</Button>
						{activeRange && (
							<Button type="button" variant="outline" onClick={handleClear}>
								Tozalash
							</Button>
						)}
					</div>

					{loading ? (
						<div className="py-10">
							<Loading />
						</div>
					) : (
						<>
							<form onSubmit={handleCreate} className="space-y-4 mb-8">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
										<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Xodim ismi" />
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
										<Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Familiya" />
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
										<Input value={filial} onChange={(e) => setFilial(e.target.value)} placeholder="Filial nomi" />
									</div>
								</div>
								{error && <p className="text-sm text-red-600">{error}</p>}
								<Button type="submit" disabled={saving}>
									{saving ? "Saqlanmoqda…" : "Xodim qo‘shish"}
								</Button>
							</form>

							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg font-medium text-gray-800">Xodimlar ro'yxati</h2>
								<Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={employees.length === 0} className="shrink-0">
									<Download className="mr-2 h-4 w-4" />
									Excel
								</Button>
							</div>
							<div className="overflow-x-auto rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Ism</TableHead>
											<TableHead>Familiya</TableHead>
											<TableHead>Filial</TableHead>
											<TableHead>Qo‘shilgan sana</TableHead>
											<TableHead className="hidden lg:table-cell">Referral havola</TableHead>
											<TableHead>
												{activeRange
													? `Taklif qilinganlar (${formatDateShort(activeRange.from)} – ${formatDateShort(activeRange.to)})`
													: "Taklif qilinganlar (jami)"}
											</TableHead>
											<TableHead>QR kod</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{employees.length === 0 ? (
											<TableRow>
												<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
													Xodimlar hali qo‘shilmagan. Yuqoridagi formadan foydalanib xodim qo‘shing.
												</TableCell>
											</TableRow>
										) : (
											paginatedEmployees.map((emp) => {
												const link = buildReferralLink(emp.referralCode);
												return (
													<TableRow key={String(emp._id ?? emp.referralCode)}>
														<TableCell>{emp.name}</TableCell>
														<TableCell>{emp.surname}</TableCell>
														<TableCell>{emp.filial}</TableCell>
														<TableCell className="hidden md:table-cell">{formatDate(emp.createdAt)}</TableCell>
														<TableCell className="hidden lg:table-cell">
															<div className="flex items-center gap-1">
																<code className="text-xs bg-muted px-1 py-0.5 rounded break-all" title={link}>
																	{link}
																</code>
																<Tooltip
																	open={copiedCode === emp.referralCode}
																	onOpenChange={(open) => {
																		if (!open) setCopiedCode(null);
																	}}
																>
																	<TooltipTrigger asChild>
																		<Button
																			type="button"
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 shrink-0"
																			onClick={() => copyLink(link, emp.referralCode)}
																			aria-label="Havolani nusxa olish"
																		>
																			<Copy className="h-3 w-3" />
																		</Button>
																	</TooltipTrigger>
																	<TooltipContent>Nusxa olindi</TooltipContent>
																</Tooltip>
															</div>
														</TableCell>
														<TableCell>{emp.referredCount ?? 0}</TableCell>
														<TableCell>
															<EmployeeQr link={link} filename={buildQrFilename(emp)} />
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</div>
							<div className="flex items-center justify-end space-x-2 py-2">
								<span className="text-muted-foreground text-sm">
									{startItem}-{endItem} / {employees.length}
								</span>
								<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
									Oldingi
								</Button>
								<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
									Keyingi
								</Button>
							</div>
						</>
					)}
				</div>
			</main>
		</AdminGuard>
	);
}
