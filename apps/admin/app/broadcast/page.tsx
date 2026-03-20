"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, Loader2 } from "lucide-react";
import type { BroadcastJobDoc, BroadcastAudienceFilters } from "@/lib/db";
import { Loading } from "@/components/common/loading";
import { AdminGuard } from "@/components/common/admin-guard";

const FILTER_ROW_1: { key: keyof BroadcastAudienceFilters; label: string }[] = [
	{ key: "verified", label: "Tasdiqlangan" },
	{ key: "nonVerified", label: "Tasdiqlanmagan" },
	{ key: "aktiv", label: "Aktiv" },
	{ key: "aktivEmas", label: "Aktiv emas" }
];

const FILTER_ROW_2_LEVELS: { key: keyof BroadcastAudienceFilters; label: string }[] = [
	{ key: "silver", label: "Silver" },
	{ key: "gold", label: "Gold" },
	{ key: "diamond", label: "Diamond" }
];

const PAGE_SIZE = 10;

export default function BroadcastPage() {
	const [message, setMessage] = useState("");
	const [filters, setFilters] = useState<BroadcastAudienceFilters>({});
	const [sending, setSending] = useState(false);
	const [jobs, setJobs] = useState<BroadcastJobDoc[]>([]);
	const [loadingJobs, setLoadingJobs] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	const fetchJobs = useCallback(async () => {
		try {
			const res = await fetch("/api/broadcast");
			if (!res.ok) throw new Error("Failed to load broadcasts");
			const data = await res.json();
			setJobs(data.jobs || []);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoadingJobs(false);
		}
	}, []);

	useEffect(() => {
		fetchJobs();
		const interval = setInterval(fetchJobs, 10000); // refresh every 10s
		return () => clearInterval(interval);
	}, [fetchJobs]);

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [jobs.length, page]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const text = message.trim();
		if (!text || sending) return;
		setSending(true);
		setError(null);
		try {
			const res = await fetch("/api/broadcast", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: text, audienceFilters: filters })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to create broadcast");
			setMessage("");
			setJobs((prev) => [data.job, ...prev]);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setSending(false);
		}
	}

	function formatDate(d: Date | string) {
		const date = typeof d === "string" ? new Date(d) : d;
		return new Intl.DateTimeFormat("uz-UZ", {
			dateStyle: "short",
			timeStyle: "short"
		}).format(date);
	}

	function statusLabel(status: BroadcastJobDoc["status"]) {
		const map: Record<string, string> = {
			pending: "Kutilmoqda",
			processing: "Yuborilmoqda",
			completed: "Tugallandi",
			failed: "Xatolik",
			cancelled: "Bekor qilindi"
		};
		return map[status] ?? status;
	}

	async function handleCancel(job: BroadcastJobDoc) {
		const id = job._id;
		if (!id || (job.status !== "pending" && job.status !== "processing")) return;
		try {
			const res = await fetch(`/api/broadcast/${id}/cancel`, { method: "PATCH" });
			if (!res.ok) throw new Error("Bekor qilib bo‘lmadi");
			setJobs((prev) => prev.map((j) => (String(j._id) === String(id) ? { ...j, status: "cancelled" as const } : j)));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Xatolik");
		}
	}

	const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
	const paginatedJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const startItem = jobs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const endItem = Math.min(page * PAGE_SIZE, jobs.length);

	return (
		<AdminGuard>
			<main className="flex min-h-screen w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
				<div className="w-full">
					<div className="flex items-center gap-2 pb-4">
						<Megaphone className="w-10 h-10 text-gray-800" />
						<div>
							<h1 className="text-2xl text-gray-800 font-semibold">Broadcast</h1>
							<p className="text-sm text-gray-600">Barcha foydalanuvchilarga xabar yuborish</p>
						</div>
					</div>
					<Separator className="mb-6" />

					<form onSubmit={handleSubmit} className="space-y-4 mb-8">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Qaysi foydalanuvchilarga</label>
							<p className="text-sm text-muted-foreground mb-3">
								Agar hech qanday filterni tanlamasangiz, xabar barcha bot foydalanuvchilariga yuboriladi. Bir yoki bir nechta filterni tanlasangiz,
								faqat barcha shartlarga mos keladigan foydalanuvchilarga yuboriladi (masalan: Tasdiqlangan va Aktiv — tasdiqlangan va aktiv
								foydalanuvchilar).
							</p>
							<div className="space-y-3">
								<div className="flex flex-wrap gap-4">
									{FILTER_ROW_1.map(({ key, label }) => (
										<label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
											<Checkbox
												checked={filters[key] === true}
												onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, [key]: checked === true }))}
												disabled={sending}
											/>
											{label}
										</label>
									))}
								</div>
								<div className="flex flex-wrap gap-4">
									{FILTER_ROW_2_LEVELS.map(({ key, label }) => (
										<label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
											<Checkbox
												checked={filters[key] === true}
												onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, [key]: checked === true }))}
												disabled={sending}
											/>
											{label}
										</label>
									))}
								</div>
							</div>
						</div>
						<label className="block text-sm font-medium text-gray-700" htmlFor="message">
							Xabar matni
						</label>
						<textarea
							id="message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Yubormoqchi bo'lgan xabaringizni yozing..."
							rows={5}
							className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground disabled:opacity-50"
							disabled={sending}
						/>
						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" disabled={sending || !message.trim()}>
							{sending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Yuborilmoqda...
								</>
							) : (
								"Yuborish"
							)}
						</Button>
					</form>

					<div>
						<h2 className="text-lg font-medium text-gray-800 mb-3">So'nggi broadcastlar</h2>
						{loadingJobs ? (
							<Loading />
						) : jobs.length === 0 ? (
							<p className="text-sm text-muted-foreground">Hali broadcastlar yo'q.</p>
						) : (
							<div className="space-y-4">
								<div className="overflow-x-auto rounded-md border">
									<Table className="min-w-[1100px]">
										<TableHeader>
											<TableRow>
												<TableHead>Sana</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Auditoriya</TableHead>
												<TableHead>Xabar</TableHead>
												<TableHead>Statistika</TableHead>
												<TableHead>Xatolik</TableHead>
												<TableHead className="text-right">Amal</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{paginatedJobs.map((job) => {
												const audienceText = job.audienceFilters
													? [...FILTER_ROW_1, ...FILTER_ROW_2_LEVELS]
															.filter((f) => job.audienceFilters?.[f.key])
															.map((f) => f.label)
															.join(", ")
													: job.audience === "verified"
														? "Tasdiqlangan"
														: job.audience === "non_verified"
															? "Tasdiqlanmagan"
															: job.audience;

												return (
													<TableRow key={String(job._id)}>
														<TableCell className="whitespace-nowrap text-xs">{formatDate(job.createdAt)}</TableCell>
														<TableCell>
															<span
																className={`text-xs font-medium px-2 py-0.5 rounded ${
																	job.status === "completed"
																		? "bg-green-100 text-green-800"
																		: job.status === "failed"
																			? "bg-red-100 text-red-800"
																			: job.status === "cancelled"
																				? "bg-amber-100 text-amber-800"
																				: job.status === "processing"
																					? "bg-blue-100 text-blue-800"
																					: "bg-gray-100 text-gray-800"
																}`}
															>
																{statusLabel(job.status)}
															</span>
														</TableCell>
														<TableCell className="max-w-[260px] text-xs text-muted-foreground">
															<div className="whitespace-pre-wrap break-words">{audienceText || "Barcha foydalanuvchilar"}</div>
														</TableCell>
														<TableCell className="max-w-[420px]">
															<div className="text-sm whitespace-pre-wrap break-words">{job.message}</div>
														</TableCell>
														<TableCell className="text-xs text-muted-foreground whitespace-nowrap">
															Yuborildi: {job.sentCount ?? 0}, xatolik: {job.failedCount ?? 0}
															{job.totalUsers != null && ` (jami: ${job.totalUsers})`}
														</TableCell>
														<TableCell className="max-w-[240px]">
															<div className="text-xs text-destructive whitespace-pre-wrap break-words">{job.error ?? "-"}</div>
														</TableCell>
														<TableCell className="text-right">
															{(job.status === "pending" || job.status === "processing") && (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => handleCancel(job)}
																	className="text-destructive border-destructive/50 hover:bg-destructive/10"
																>
																	Bekor qilish
																</Button>
															)}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
								<div className="flex items-center justify-end space-x-2 py-2">
									<span className="text-muted-foreground text-sm">
										{startItem}-{endItem} / {jobs.length}
									</span>
									<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
										Oldingi
									</Button>
									<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
										Keyingi
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
		</AdminGuard>
	);
}
