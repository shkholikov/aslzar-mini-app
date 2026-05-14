"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, Loader2, ImageIcon, VideoIcon, X, Upload, Download } from "lucide-react";
import { exportToExcel } from "@/lib/export";
import type { BroadcastJobDoc, BroadcastAudienceFilters, BroadcastMedia } from "@/lib/db";
import { Loading } from "@/components/common/loading";
import { AdminGuard } from "@/components/common/admin-guard";

type FilterOption = { key: keyof BroadcastAudienceFilters; label: string };
type FilterGroup = { type: "radio"; label: string; options: FilterOption[] } | { type: "checkbox"; label: string; options: FilterOption[] };

const FILTER_GROUPS: FilterGroup[] = [
	{
		type: "radio",
		label: "Tasdiqlangan",
		options: [
			{ key: "verified", label: "Ha" },
			{ key: "nonVerified", label: "Yo'q" }
		]
	},
	{
		type: "radio",
		label: "Aktiv",
		options: [
			{ key: "aktiv", label: "Ha" },
			{ key: "aktivEmas", label: "Yo'q" }
		]
	},
	{
		type: "radio",
		label: "Последний визит",
		options: [
			{ key: "lastVisit", label: "Ha" },
			{ key: "lastVisitNo", label: "Yo'q" }
		]
	},
	{
		type: "radio",
		label: "Xarid qilgan",
		options: [
			{ key: "contractFirst", label: "Ha" },
			{ key: "contractFirstNo", label: "Yo'q" }
		]
	},
	{
		type: "checkbox",
		label: "Level",
		options: [
			{ key: "silver", label: "Silver" },
			{ key: "gold", label: "Gold" },
			{ key: "diamond", label: "Diamond" }
		]
	}
];

const PAGE_SIZE = 10;
const CAPTION_LIMIT = 1024;
const MAX_MEDIA = 5;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

interface UploadedMedia extends BroadcastMedia {
	previewUrl: string;
}

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

	const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [testTelegramId, setTestTelegramId] = useState("");
	const [testSending, setTestSending] = useState(false);
	const [testResult, setTestResult] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

	const hasMedia = uploadedMedia.length > 0;
	const isAlbum = uploadedMedia.length >= 2;
	const captionWarning = hasMedia && message.length > CAPTION_LIMIT;

	async function uploadOne(file: File): Promise<UploadedMedia> {
		const isImage = file.type.startsWith("image/");
		const isVideo = file.type === "video/mp4";
		if (!isImage && !isVideo) {
			throw new Error(`"${file.name}": faqat rasm yoki MP4 video yuklash mumkin.`);
		}
		if (isVideo && file.size > MAX_VIDEO_SIZE) {
			throw new Error(`"${file.name}": video maksimal 20 MB bo'lishi kerak.`);
		}

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

		const putRes = await fetch(data.uploadUrl, {
			method: "PUT",
			headers: { "Content-Type": file.type },
			body: file
		});
		if (!putRes.ok) throw new Error("R2 ga yuklashda xatolik");

		return {
			url: data.publicUrl,
			type: isImage ? "photo" : "video",
			previewUrl: URL.createObjectURL(file)
		};
	}

	async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? []);
		if (fileInputRef.current) fileInputRef.current.value = "";
		if (files.length === 0) return;

		const available = MAX_MEDIA - uploadedMedia.length;
		if (available <= 0) {
			setError(`Maksimal ${MAX_MEDIA} ta media yuklash mumkin.`);
			return;
		}
		const toUpload = files.slice(0, available);
		if (files.length > available) {
			setError(`Faqat ${available} ta fayl qo'shildi. Maksimal ${MAX_MEDIA} ta.`);
		} else {
			setError(null);
		}

		setUploading(true);
		try {
			const uploaded: UploadedMedia[] = [];
			for (const file of toUpload) {
				uploaded.push(await uploadOne(file));
			}
			setUploadedMedia((prev) => [...prev, ...uploaded]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload xatoligi");
		} finally {
			setUploading(false);
		}
	}

	function removeMediaAt(index: number) {
		setUploadedMedia((prev) => {
			const item = prev[index];
			if (item) URL.revokeObjectURL(item.previewUrl);
			return prev.filter((_, i) => i !== index);
		});
	}

	function clearAllMedia() {
		for (const m of uploadedMedia) URL.revokeObjectURL(m.previewUrl);
		setUploadedMedia([]);
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
		const saved = typeof window !== "undefined" ? window.localStorage.getItem("aslzar.broadcast.testId") : null;
		if (saved) setTestTelegramId(saved);
	}, []);

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [jobs.length, page]);

	const uploadedMediaRef = useRef(uploadedMedia);
	useEffect(() => {
		uploadedMediaRef.current = uploadedMedia;
	}, [uploadedMedia]);
	useEffect(() => {
		return () => {
			for (const m of uploadedMediaRef.current) URL.revokeObjectURL(m.previewUrl);
		};
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const text = message.trim();
		if (!text || sending || uploading) return;
		const btnText = isAlbum ? "" : buttonText.trim();
		let btnUrl = isAlbum ? "" : buttonUrl.trim();
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
					...(uploadedMedia.length > 0 && {
						media: uploadedMedia.map((m) => ({ url: m.url, type: m.type }))
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
			clearAllMedia();
			setJobs((prev) => [data.job, ...prev]);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setSending(false);
		}
	}

	async function handleTestSend() {
		const text = message.trim();
		const rawId = testTelegramId.trim();
		if (!text || !rawId || testSending) return;
		const chatId = Number(rawId);
		if (!Number.isFinite(chatId) || !Number.isInteger(chatId)) {
			setTestResult({ kind: "err", text: "Telegram ID butun son bo'lishi kerak" });
			return;
		}
		const btnText = isAlbum ? "" : buttonText.trim();
		let btnUrl = isAlbum ? "" : buttonUrl.trim();
		if (btnUrl.startsWith("@")) btnUrl = `https://t.me/${btnUrl.slice(1)}`;
		setTestSending(true);
		setTestResult(null);
		try {
			const res = await fetch("/api/broadcast/test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chatId,
					message: text,
					...(uploadedMedia.length > 0 && {
						media: uploadedMedia.map((m) => ({ url: m.url, type: m.type }))
					}),
					...(btnText && btnUrl && { buttonText: btnText, buttonUrl: btnUrl })
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Test xabar yuborilmadi");
			localStorage.setItem("aslzar.broadcast.testId", rawId);
			setTestResult({ kind: "ok", text: "Yuborildi" });
			setTimeout(() => setTestResult(null), 4000);
		} catch (e) {
			setTestResult({ kind: "err", text: e instanceof Error ? e.message : "Xatolik" });
		} finally {
			setTestSending(false);
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
			const labels: string[] = [];
			for (const group of FILTER_GROUPS) {
				for (const opt of group.options) {
					if (job.audienceFilters[opt.key]) {
						labels.push(`${group.label}: ${opt.label}`);
					}
				}
			}
			return labels.join(", ") || "Barcha foydalanuvchilar";
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

	function getJobMedia(job: BroadcastJobDoc): BroadcastMedia[] {
		if (job.media && job.media.length > 0) return job.media;
		if (job.mediaUrl && job.mediaType) return [{ url: job.mediaUrl, type: job.mediaType }];
		return [];
	}

	function mediaSummary(items: BroadcastMedia[]): string {
		if (items.length === 0) return "";
		if (items.length === 1) return items[0].type === "photo" ? "Rasm" : "Video";
		const photos = items.filter((m) => m.type === "photo").length;
		const videos = items.length - photos;
		const parts: string[] = [];
		if (photos > 0) parts.push(`${photos} rasm`);
		if (videos > 0) parts.push(`${videos} video`);
		return `Albom (${parts.join(" + ")})`;
	}

	function handleExport() {
		const rows = jobs.map((job) => ({
			Sana: formatDate(job.createdAt),
			Status: statusLabel(job.status),
			Auditoriya: getAudienceText(job),
			Xabar: job.message,
			Media: mediaSummary(getJobMedia(job)),
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
								Har bir qator — alohida shart. Qatorlardagi shartlar bir-biriga AND (VA) bog&apos;langan: faqat barcha tanlangan shartlarga
								mos foydalanuvchilarga yuboriladi. Har qatorda faqat bitta variant tanlanishi mumkin (Ha yoki Yo&apos;q). Level qatorida bir
								nechta daraja tanlanishi mumkin — ular o&apos;zaro OR (YOKI) mantiqida ishlaydi. Hech qanday filtr tanlanmasa, xabar barcha
								foydalanuvchilarga yuboriladi.
							</p>
							<div className="space-y-2">
								{FILTER_GROUPS.map((group) => (
									<div key={group.label} className="flex items-center gap-3">
										<span className="text-sm text-gray-600 w-36 shrink-0">{group.label}</span>
										<div className="flex items-center gap-1">
											{group.type === "radio" && (
												<Button
													type="button"
													size="sm"
													variant={group.options.every((o) => !filters[o.key]) ? "default" : "outline"}
													className="h-7 px-3 text-xs"
													disabled={sending}
													onClick={() =>
														setFilters((prev) => {
															const next = { ...prev };
															for (const o of group.options) delete next[o.key];
															return next;
														})
													}
												>
													—
												</Button>
											)}
											{group.options.map((opt) => (
												<Button
													key={opt.key}
													type="button"
													size="sm"
													variant={filters[opt.key] ? "default" : "outline"}
													className="h-7 px-3 text-xs"
													disabled={sending}
													onClick={() => {
														if (group.type === "radio") {
															setFilters((prev) => {
																const next = { ...prev };
																for (const o of group.options) delete next[o.key];
																next[opt.key] = true;
																return next;
															});
														} else {
															setFilters((prev) => {
																const next = { ...prev };
																if (prev[opt.key]) delete next[opt.key];
																else next[opt.key] = true;
																return next;
															});
														}
													}}
												>
													{opt.label}
												</Button>
											))}
										</div>
									</div>
								))}
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
								Telegram caption limiti 1024 belgi. Hozirgi uzunlik: {message.length}. Media bilan yuborilganda xabar qisqartirilishi
								mumkin.
							</p>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Media (ixtiyoriy) — {uploadedMedia.length}/{MAX_MEDIA}
							</label>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*,video/mp4"
								multiple
								onChange={handleFileSelect}
								disabled={sending || uploading}
								className="hidden"
							/>
							<div className="flex flex-wrap items-start gap-2">
								{uploadedMedia.map((m, idx) => (
									<div key={m.url} className="relative h-24 w-24 rounded-md border overflow-hidden bg-muted/30">
										{m.type === "photo" ? (
											<img src={m.previewUrl} alt="Preview" className="h-full w-full object-cover" />
										) : (
											<video src={m.previewUrl} className="h-full w-full object-cover" muted />
										)}
										<span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
											{m.type === "photo" ? <ImageIcon className="h-2.5 w-2.5" /> : <VideoIcon className="h-2.5 w-2.5" />}
										</span>
										<button
											type="button"
											onClick={() => removeMediaAt(idx)}
											disabled={sending || uploading}
											className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-destructive disabled:opacity-50"
											aria-label="Olib tashlash"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								))}
								{uploadedMedia.length < MAX_MEDIA && (
									<Button
										type="button"
										variant="outline"
										onClick={() => fileInputRef.current?.click()}
										disabled={sending || uploading}
										className="h-24 w-24 flex-col gap-1 p-0"
									>
										{uploading ? (
											<Loader2 className="h-5 w-5 animate-spin" />
										) : (
											<>
												<Upload className="h-5 w-5" />
												<span className="text-[11px]">Qo&apos;shish</span>
											</>
										)}
									</Button>
								)}
							</div>
							<p className="text-xs text-muted-foreground mt-2">
								Maksimal {MAX_MEDIA} ta. Video: faqat MP4, har biri ≤ 20 MB. 2+ media albom sifatida yuboriladi — Telegram bunda tugmani
								qo&apos;llab-quvvatlamaydi.
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Tugma (ixtiyoriy)</label>
							<div className="flex flex-col sm:flex-row gap-3">
								<Input
									value={isAlbum ? "" : buttonText}
									onChange={(e) => setButtonText(e.target.value)}
									placeholder="Tugma matni"
									className="flex-1"
									disabled={sending || isAlbum}
								/>
								<Input
									value={isAlbum ? "" : buttonUrl}
									onChange={(e) => setButtonUrl(e.target.value)}
									placeholder="https://example.com yoki t.me/channel"
									className="flex-1"
									disabled={sending || isAlbum}
								/>
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{isAlbum
									? "Tugma faqat 0 yoki 1 ta media bilan ishlaydi — Telegram albomda inline tugmani qo'llab-quvvatlamaydi."
									: "Xabar ostida havola tugmasi ko'rinadi. Ikkalasi ham to'ldirilishi kerak."}
							</p>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						<div className="rounded-md border bg-muted/30 p-3 space-y-2">
							<label className="block text-sm font-medium text-gray-700">Test qilish</label>
							<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
								<Input
									value={testTelegramId}
									onChange={(e) => setTestTelegramId(e.target.value.replace(/[^\d-]/g, ""))}
									placeholder="Telegram ID (masalan, 6764272076)"
									inputMode="numeric"
									className="flex-1"
									disabled={testSending}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={handleTestSend}
									disabled={testSending || uploading || !testTelegramId.trim() || !message.trim()}
								>
									{testSending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Yuborilmoqda...
										</>
									) : (
										"Test qilish"
									)}
								</Button>
								{testResult && (
									<span className={`text-xs ${testResult.kind === "ok" ? "text-green-600" : "text-destructive"}`}>{testResult.text}</span>
								)}
							</div>
							<p className="text-xs text-muted-foreground">
								Xabar siz tanlagan Telegram ID ga yuboriladi. Broadcast yaratilmaydi, statistika saqlanmaydi.
							</p>
						</div>

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
															{(() => {
																const items = getJobMedia(job);
																if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
																return (
																	<div className="flex items-center gap-1">
																		{items.slice(0, 3).map((m, i) => (
																			<span
																				key={i}
																				className="inline-flex h-5 w-5 items-center justify-center rounded border bg-muted text-muted-foreground"
																				title={m.type === "photo" ? "Rasm" : "Video"}
																			>
																				{m.type === "photo" ? <ImageIcon className="h-3 w-3" /> : <VideoIcon className="h-3 w-3" />}
																			</span>
																		))}
																		{items.length > 3 && <span className="text-[10px] text-muted-foreground">+{items.length - 3}</span>}
																		<span className="ml-1 text-xs text-muted-foreground whitespace-nowrap">
																			{items.length === 1 ? (items[0].type === "photo" ? "Rasm" : "Video") : `${items.length} ta`}
																		</span>
																	</div>
																);
															})()}
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
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page === totalPages}
									>
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
