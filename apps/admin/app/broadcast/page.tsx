"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, Loader2, ImageIcon, VideoIcon, X, Upload, Download } from "lucide-react";
import { exportToExcel } from "@/lib/export";
import type { BroadcastJobDoc, BroadcastAudienceFilters } from "@/lib/db";
import { Loading } from "@/components/common/loading";
import { AdminGuard } from "@/components/common/admin-guard";

const FILTER_ROW_1: { key: keyof BroadcastAudienceFilters; label: string }[] = [
	{ key: "verified", label: "Tasdiqlangan" },
	{ key: "nonVerified", label: "Tasdiqlanmagan" },
	{ key: "aktiv", label: "Aktiv" },
	{ key: "aktivEmas", label: "Aktiv emas" }
];

const FILTER_ROW_2_LEVELS: {
	key: keyof BroadcastAudienceFilters;
	label: string;
}[] = [
	{ key: "silver", label: "Silver" },
	{ key: "gold", label: "Gold" },
	{ key: "diamond", label: "Diamond" }
];

const ALL_FILTERS = [...FILTER_ROW_1, ...FILTER_ROW_2_LEVELS];

const PAGE_SIZE = 10;
const CAPTION_LIMIT = 1024;

export default function BroadcastPage() {
	const [message, setMessage] = useState("");
	const [filters, setFilters] = useState<BroadcastAudienceFilters>({});
	const [sending, setSending] = useState(false);
	const [jobs, setJobs] = useState<BroadcastJobDoc[]>([]);
	const [loadingJobs, setLoadingJobs] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	const [buttonText, setButtonText] = useState("");
	const [buttonUrl, setButtonUrl] = useState("");

	const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
	const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
	const [uploadedMediaType, setUploadedMediaType] = useState<"photo" | "video" | null>(null);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const hasMedia = !!uploadedMediaUrl;
	const captionWarning = hasMedia && message.length > CAPTION_LIMIT;

	async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		const isImage = file.type.startsWith("image/");
		const isVideo = file.type === "video/mp4";
		if (!isImage && !isVideo) {
			setError("Faqat rasm yoki MP4 video yuklash mumkin. Telegram faqat MP4 formatni qo'llab-quvvatlaydi.");
			return;
		}

		if (isVideo && file.size > 20 * 1024 * 1024) {
			setError("Telegram orqali video URL yuborish uchun maksimal hajm 20 MB.");
			return;
		}

		setError(null);
		setUploading(true);
		try {
			const res = await fetch("/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					filename: file.name,
					contentType: file.type,
					size: file.size,
					prefix: "broadcasts"
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Upload xatoligi");

			await fetch(data.uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file
			});

			setUploadedMediaUrl(data.publicUrl);
			setUploadedMediaType(isImage ? "photo" : "video");
			if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
			setMediaPreviewUrl(URL.createObjectURL(file));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload xatoligi");
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	function clearMedia() {
		if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
		setMediaPreviewUrl(null);
		setUploadedMediaUrl(null);
		setUploadedMediaType(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

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

	useEffect(() => {
		return () => {
			if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
		};
	}, [mediaPreviewUrl]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const text = message.trim();
		if (!text || sending || uploading) return;
		const btnText = buttonText.trim();
		let btnUrl = buttonUrl.trim();
		if (btnUrl.startsWith("@")) {
			btnUrl = `https://t.me/${btnUrl.slice(1)}`;
		}
		if ((btnText && !btnUrl) || (!btnText && btnUrl)) {
			setError("Tugma matni va havolasi ikkalasi ham kiritilishi kerak.");
			return;
		}
		setSending(true);
		setError(null);
		try {
			const res = await fetch("/api/broadcast", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: text,
					audienceFilters: filters,
					...(uploadedMediaUrl &&
						uploadedMediaType && {
							mediaUrl: uploadedMediaUrl,
							mediaType: uploadedMediaType
						}),
					...(btnText &&
						btnUrl && {
							buttonText: btnText,
							buttonUrl: btnUrl
						})
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to create broadcast");
			setMessage("");
			setButtonText("");
			setButtonUrl("");
			clearMedia();
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

	function getAudienceText(job: BroadcastJobDoc): string {
		if (job.audienceFilters) {
			const labels = ALL_FILTERS.filter((f) => job.audienceFilters?.[f.key])
				.map((f) => f.label)
				.join(", ");
			return labels || "Barcha foydalanuvchilar";
		}
		if (job.audience === "verified") return "Tasdiqlangan";
		if (job.audience === "non_verified") return "Tasdiqlanmagan";
		return job.audience || "Barcha foydalanuvchilar";
	}

	async function handleCancel(job: BroadcastJobDoc) {
		const id = job._id;
		if (!id || (job.status !== "pending" && job.status !== "processing")) return;
		try {
			const res = await fetch(`/api/broadcast/${id}/cancel`, {
				method: "PATCH"
			});
			if (!res.ok) throw new Error("Bekor qilib bo'lmadi");
			setJobs((prev) => prev.map((j) => (String(j._id) === String(id) ? { ...j, status: "cancelled" as const } : j)));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Xatolik");
		}
	}

	const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
	const paginatedJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const startItem = jobs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const endItem = Math.min(page * PAGE_SIZE, jobs.length);

	function handleExport() {
		const rows = jobs.map((job) => ({
			Sana: formatDate(job.createdAt),
			Status: statusLabel(job.status),
			Auditoriya: getAudienceText(job),
			Xabar: job.message,
			Media: job.mediaUrl ? (job.mediaType === "photo" ? "Rasm" : "Video") : "",
			Yuborildi: job.sentCount ?? 0,
			"Xatoliklar soni": job.failedCount ?? 0,
			Jami: job.totalUsers ?? "",
			"Xato xabari": job.error ?? ""
		}));
		exportToExcel(rows, "Broadcastlar", "broadcastlar");
	}

	return (
		<AdminGuard requiredPermission="broadcast">
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
												onCheckedChange={(checked) =>
													setFilters((prev) => ({
														...prev,
														[key]: checked === true
													}))
												}
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
												onCheckedChange={(checked) =>
													setFilters((prev) => ({
														...prev,
														[key]: checked === true
													}))
												}
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
						{captionWarning && (
							<p className="text-sm text-amber-600">
								Telegram caption limiti 1024 belgi. Hozirgi uzunlik: {message.length}. Media bilan yuborilganda xabar qisqartirilishi mumkin.
							</p>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Media (ixtiyoriy)</label>
							{!uploadedMediaUrl ? (
								<div className="flex items-center gap-3">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*,video/mp4"
										onChange={handleFileSelect}
										disabled={sending || uploading}
										className="hidden"
									/>
									<Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={sending || uploading}>
										{uploading ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Yuklanmoqda...
											</>
										) : (
											<>
												<Upload className="mr-2 h-4 w-4" />
												Rasm yoki video yuklash
											</>
										)}
									</Button>
									<span className="text-xs text-muted-foreground">Video: faqat MP4, maks. 20 MB</span>
								</div>
							) : (
								<div className="flex items-start gap-3">
									{uploadedMediaType === "photo" && mediaPreviewUrl ? (
										<img src={mediaPreviewUrl} alt="Preview" className="h-24 w-24 rounded-md object-cover border" />
									) : uploadedMediaType === "video" && mediaPreviewUrl ? (
										<video src={mediaPreviewUrl} className="h-24 w-40 rounded-md object-cover border" muted />
									) : null}
									<div className="flex flex-col gap-1">
										<span className="text-sm text-muted-foreground flex items-center gap-1">
											{uploadedMediaType === "photo" ? <ImageIcon className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
											{uploadedMediaType === "photo" ? "Rasm" : "Video"} yuklandi
										</span>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={clearMedia}
											className="w-fit text-destructive border-destructive/50 hover:bg-destructive/10"
										>
											<X className="mr-1 h-3 w-3" />
											Olib tashlash
										</Button>
									</div>
								</div>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Tugma (ixtiyoriy)</label>
							<div className="flex flex-col sm:flex-row gap-3">
								<Input
									value={buttonText}
									onChange={(e) => setButtonText(e.target.value)}
									placeholder="Tugma matni"
									className="flex-1"
									disabled={sending}
								/>
								<Input
									value={buttonUrl}
									onChange={(e) => setButtonUrl(e.target.value)}
									placeholder="https://example.com yoki t.me/channel"
									className="flex-1"
									disabled={sending}
								/>
							</div>
							<p className="text-xs text-muted-foreground mt-1">Xabar ostida havola tugmasi ko&apos;rinadi. Ikkalasi ham to&apos;ldirilishi kerak.</p>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" disabled={sending || uploading || !message.trim()}>
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
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg font-medium text-gray-800">So&apos;nggi broadcastlar</h2>
							<Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={jobs.length === 0} className="shrink-0">
								<Download className="mr-2 h-4 w-4" />
								Excel
							</Button>
						</div>
						{loadingJobs ? (
							<Loading />
						) : jobs.length === 0 ? (
							<p className="text-sm text-muted-foreground">Hali broadcastlar yo&apos;q.</p>
						) : (
							<div className="space-y-4">
								<div className="overflow-x-auto rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Sana</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Auditoriya</TableHead>
												<TableHead>Xabar</TableHead>
												<TableHead>Media</TableHead>
												<TableHead>Statistika</TableHead>
												<TableHead>Xatolik</TableHead>
												<TableHead className="text-right">Amal</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{paginatedJobs.map((job) => {
												const audienceText = getAudienceText(job);

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
														<TableCell className="max-w-[280px] sm:max-w-[420px]">
															<div className="text-sm whitespace-pre-wrap break-words">{job.message}</div>
														</TableCell>
														<TableCell>
															{job.mediaUrl ? (
																<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
																	{job.mediaType === "photo" ? <ImageIcon className="h-3.5 w-3.5" /> : <VideoIcon className="h-3.5 w-3.5" />}
																	{job.mediaType === "photo" ? "Rasm" : "Video"}
																</span>
															) : (
																<span className="text-xs text-muted-foreground">—</span>
															)}
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
