"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Newspaper, Loader2, ImageIcon, VideoIcon, X, Upload, Trash2 } from "lucide-react";
import type { NewsItemDoc } from "@/lib/db";
import { Loading } from "@/components/common/loading";
import { AdminGuard } from "@/components/common/admin-guard";

const PAGE_SIZE = 10;

export default function NewsPage() {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [buttonText, setButtonText] = useState("");
	const [buttonUrl, setButtonUrl] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [items, setItems] = useState<NewsItemDoc[]>([]);
	const [loadingItems, setLoadingItems] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
	const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
	const [uploadedMediaType, setUploadedMediaType] = useState<"photo" | "video" | null>(null);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		const isImage = file.type.startsWith("image/");
		const isVideo = file.type === "video/mp4";
		if (!isImage && !isVideo) {
			setError("Faqat rasm yoki MP4 video yuklash mumkin.");
			return;
		}
		if (isVideo && file.size > 20 * 1024 * 1024) {
			setError("Video uchun maksimal hajm 20 MB.");
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
					prefix: "news"
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

	const fetchItems = useCallback(async () => {
		try {
			const res = await fetch("/api/news");
			if (!res.ok) throw new Error("Failed to load news");
			const data = await res.json();
			setItems(data.items || []);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoadingItems(false);
		}
	}, []);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
		if (page > totalPages) setPage(totalPages);
	}, [items.length, page]);

	useEffect(() => {
		return () => {
			if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
		};
	}, [mediaPreviewUrl]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const t = title.trim();
		const d = description.trim();
		if (!t || !d || submitting || uploading) return;

		const btnText = buttonText.trim();
		let btnUrl = buttonUrl.trim();
		if (btnUrl.startsWith("@")) {
			btnUrl = `https://t.me/${btnUrl.slice(1)}`;
		}
		if ((btnText && !btnUrl) || (!btnText && btnUrl)) {
			setError("Tugma matni va havolasi ikkalasi ham kiritilishi kerak.");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			const res = await fetch("/api/news", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: t,
					description: d,
					...(uploadedMediaUrl &&
						uploadedMediaType && {
							mediaUrl: uploadedMediaUrl,
							mediaType: uploadedMediaType
						}),
					...(btnText && btnUrl && { buttonText: btnText, buttonUrl: btnUrl })
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to create news item");
			setTitle("");
			setDescription("");
			setButtonText("");
			setButtonUrl("");
			clearMedia();
			setItems((prev) => [data.item, ...prev]);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleToggle(item: NewsItemDoc, isActive: boolean) {
		const id = item._id;
		if (!id) return;
		setItems((prev) => prev.map((i) => (String(i._id) === String(id) ? { ...i, isActive } : i)));
		try {
			const res = await fetch(`/api/news/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isActive })
			});
			if (!res.ok) throw new Error("O'zgartirib bo'lmadi");
		} catch (e) {
			setItems((prev) => prev.map((i) => (String(i._id) === String(id) ? { ...i, isActive: !isActive } : i)));
			setError(e instanceof Error ? e.message : "Xatolik");
		}
	}

	async function handleDelete(item: NewsItemDoc) {
		const id = item._id;
		if (!id) return;
		try {
			const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("O'chirib bo'lmadi");
			setItems((prev) => prev.filter((i) => String(i._id) !== String(id)));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Xatolik");
		}
	}

	function formatDate(d: Date | string) {
		const date = typeof d === "string" ? new Date(d) : d;
		return new Intl.DateTimeFormat("uz-UZ", {
			dateStyle: "short",
			timeStyle: "short"
		}).format(date);
	}

	const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
	const paginatedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const startItem = items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const endItem = Math.min(page * PAGE_SIZE, items.length);

	return (
		<AdminGuard>
			<main className="flex min-h-screen w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
				<div className="w-full">
					<div className="flex items-center gap-2 pb-4">
						<Newspaper className="w-10 h-10 text-gray-800" />
						<div>
							<h1 className="text-2xl text-gray-800 font-semibold">Yangiliklar</h1>
							<p className="text-sm text-gray-600">Webapp uchun yangiliklar boshqaruvi</p>
						</div>
					</div>
					<Separator className="mb-6" />

					<form onSubmit={handleSubmit} className="space-y-4 mb-8">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="news-title">
								Sarlavha
							</label>
							<Input
								id="news-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Yangilik sarlavhasi"
								disabled={submitting}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="news-description">
								Tavsif
							</label>
							<textarea
								id="news-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Yangilik matni..."
								rows={5}
								className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground disabled:opacity-50"
								disabled={submitting}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Media (ixtiyoriy)</label>
							{!uploadedMediaUrl ? (
								<div className="flex items-center gap-3">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*,video/mp4"
										onChange={handleFileSelect}
										disabled={submitting || uploading}
										className="hidden"
									/>
									<Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={submitting || uploading}>
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
									disabled={submitting}
								/>
								<Input
									value={buttonUrl}
									onChange={(e) => setButtonUrl(e.target.value)}
									placeholder="https://example.com yoki @kanal"
									className="flex-1"
									disabled={submitting}
								/>
							</div>
							<p className="text-xs text-muted-foreground mt-1">Webapp da yangilik ostida tugma ko'rinadi. Ikkalasi ham to'ldirilishi kerak.</p>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" disabled={submitting || uploading || !title.trim() || !description.trim()}>
							{submitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saqlanmoqda...
								</>
							) : (
								"Qo'shish"
							)}
						</Button>
					</form>

					<div>
						<h2 className="text-lg font-medium text-gray-800 mb-3">Yangiliklar ro'yxati</h2>
						{loadingItems ? (
							<Loading />
						) : items.length === 0 ? (
							<p className="text-sm text-muted-foreground">Hali yangiliklar yo'q.</p>
						) : (
							<div className="space-y-4">
								<div className="overflow-x-auto rounded-md border">
									<Table className="min-w-[800px]">
										<TableHeader>
											<TableRow>
												<TableHead>Sana</TableHead>
												<TableHead>Sarlavha</TableHead>
												<TableHead>Tavsif</TableHead>
												<TableHead>Media</TableHead>
												<TableHead>Tugma</TableHead>
												<TableHead>Holat</TableHead>
												<TableHead className="text-right">Amal</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{paginatedItems.map((item) => (
												<TableRow key={String(item._id)}>
													<TableCell className="whitespace-nowrap text-xs">{formatDate(item.createdAt)}</TableCell>
													<TableCell className="max-w-[160px]">
														<div className="text-sm font-medium truncate">{item.title}</div>
													</TableCell>
													<TableCell className="max-w-[260px]">
														<div className="text-xs text-muted-foreground line-clamp-2">{item.description}</div>
													</TableCell>
													<TableCell>
														{item.mediaUrl ? (
															<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
																{item.mediaType === "photo" ? <ImageIcon className="h-3.5 w-3.5" /> : <VideoIcon className="h-3.5 w-3.5" />}
																{item.mediaType === "photo" ? "Rasm" : "Video"}
															</span>
														) : (
															<span className="text-xs text-muted-foreground">—</span>
														)}
													</TableCell>
													<TableCell className="max-w-[160px]">
														{item.buttonText ? (
															<div className="text-xs truncate">{item.buttonText}</div>
														) : (
															<span className="text-xs text-muted-foreground">—</span>
														)}
													</TableCell>
													<TableCell>
														<Switch checked={item.isActive !== false} onCheckedChange={(checked) => handleToggle(item, checked)} />
													</TableCell>
													<TableCell className="text-right">
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => handleDelete(item)}
															className="text-destructive border-destructive/50 hover:bg-destructive/10"
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
								<div className="flex items-center justify-end space-x-2 py-2">
									<span className="text-muted-foreground text-sm">
										{startItem}-{endItem} / {items.length}
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
