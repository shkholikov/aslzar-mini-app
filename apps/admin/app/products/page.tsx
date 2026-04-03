"use client";

import * as React from "react";
import { AdminGuard } from "@/components/common/admin-guard";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductDoc } from "@/lib/db";
import { Download, Loader2, Package, Upload } from "lucide-react";
import { exportToExcel } from "@/lib/export";

const ACCEPT_MEDIA = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const PAGE_SIZE = 10;

export default function ProductsPage() {
	const [products, setProducts] = React.useState<ProductDoc[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [saving, setSaving] = React.useState(false);
	const [uploading, setUploading] = React.useState(false);
	const [uploadError, setUploadError] = React.useState<string | null>(null);
	const [page, setPage] = React.useState(1);

	const [title, setTitle] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [price, setPrice] = React.useState<string>("");
	const [url, setUrl] = React.useState("");
	const [badgeLabel, setBadgeLabel] = React.useState("");
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const fetchProducts = React.useCallback(async () => {
		try {
			setError(null);
			const res = await fetch("/api/products");
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Mahsulotlarni yuklab bo‘lmadi");
			}
			const data = await res.json();
			setProducts(data.products || []);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Noma’lum xatolik");
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	React.useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [products.length, page]);

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (saving) return;

		const trimmedTitle = title.trim();
		const trimmedDescription = description.trim();
		const trimmedUrl = url.trim();
		const hasPriceInput = price.trim() !== "";
		const numericPrice = hasPriceInput ? Number(price) : undefined;

		if (!trimmedTitle || !trimmedDescription || !trimmedUrl) {
			setError("Iltimos, majburiy maydonlarni to‘ldiring (nomi, tavsif, URL).");
			return;
		}

		if (hasPriceInput && (!numericPrice || !isFinite(numericPrice) || numericPrice <= 0)) {
			setError("Agar narx kiritilgan bo‘lsa, u musbat son bo‘lishi kerak.");
			return;
		}

		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: trimmedTitle,
					description: trimmedDescription,
					price: hasPriceInput ? numericPrice : undefined,
					url: trimmedUrl,
					badgeLabel: badgeLabel.trim() || undefined
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Mahsulotni saqlab bo‘lmadi");
			}

			setProducts((prev) => [data.product, ...prev]);
			setTitle("");
			setDescription("");
			setPrice("");
			setUrl("");
			setBadgeLabel("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Noma’lum xatolik");
		} finally {
			setSaving(false);
		}
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploadError(null);
		setUploading(true);
		try {
			// Basic client-side validations to match backend rules.
			if (file.size > 100 * 1024 * 1024) {
				throw new Error("Fayl hajmi juda katta. Maksimal 100 MB.");
			}

			const type = (file.type || "").toLowerCase();
			const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];
			if (!allowedTypes.includes(type)) {
				throw new Error("Noto‘g‘ri fayl turi. Ruxsat etilgan: JPEG, PNG, WebP, GIF, MP4, WebM, MOV.");
			}

			// Step 1: get presigned URL from server (no file bytes sent to Vercel)
			const res = await fetch("/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					filename: file.name,
					contentType: file.type,
					size: file.size
				})
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Yuklash xatosi");
			}

			// Step 2: upload file directly to R2
			const r2Res = await fetch(data.uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file
			});
			if (!r2Res.ok) {
				throw new Error("R2 ga yuklash xatosi");
			}

			if (typeof data.publicUrl === "string") {
				setUrl(data.publicUrl);
			}
		} catch (e) {
			setUploadError(e instanceof Error ? e.message : "Yuklash xatosi");
		} finally {
			setUploading(false);
			e.target.value = "";
		}
	}

	async function handleDelete(id?: string) {
		if (!id) return;
		if (!confirm("Mahsulotni o‘chirmoqchimisiz?")) return;
		try {
			const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.error || "Mahsulotni o‘chirib bo‘lmadi");
			}
			setProducts((prev) => prev.filter((p) => String(p._id) !== String(id)));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Noma’lum xatolik");
		}
	}

	function formatPrice(value?: number) {
		if (typeof value !== "number" || !isFinite(value) || value <= 0) return "-";
		return new Intl.NumberFormat("uz-UZ").format(value);
	}

	function formatDate(d: Date | string | undefined) {
		if (!d) return "-";
		const date = typeof d === "string" ? new Date(d) : d;
		return new Intl.DateTimeFormat("uz-UZ", {
			dateStyle: "short",
			timeStyle: "short"
		}).format(date);
	}

	const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
	const paginatedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const startItem = products.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const endItem = Math.min(page * PAGE_SIZE, products.length);

	function handleExport() {
		const rows = products.map((p) => ({
			Nomi: p.title,
			Badji: p.badgeLabel ?? "",
			"Narx (so\'m)": typeof p.price === "number" && p.price > 0 ? p.price : "",
			URL: p.url,
			Yaratilgan: formatDate(p.createdAt)
		}));
		exportToExcel(rows, "Mahsulotlar", "mahsulotlar");
	}

	return (
		<AdminGuard requiredPermission="products">
			<main className="flex min-h-screen w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
				<div className="w-full">
					<div className="flex items-center gap-2 pb-4">
						<Package className="w-10 h-10 text-gray-800" />
						<div>
							<h1 className="text-2xl text-gray-800 font-semibold">Mahsulotlar</h1>
							<p className="text-sm text-gray-600">Webapp katalogi uchun mahsulotlarni qo‘shish va boshqarish</p>
						</div>
					</div>
					<Separator className="mb-6" />

					<form onSubmit={handleCreate} className="space-y-4 mb-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
								<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mahsulot nomi" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Narxi (so‘m | ixtiyoriy)</label>
								<Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" placeholder="Masalan: 250000" />
							</div>
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Rasm yoki video (URL yoki yuklash)</label>
								<div className="flex flex-col sm:flex-row gap-2">
									<div className="flex gap-2 flex-1">
										<Input
											value={url}
											onChange={(e) => {
												setUrl(e.target.value);
												setUploadError(null);
											}}
											placeholder="R2 URL yoki boshqa to’liq URL"
										/>
										<input ref={fileInputRef} type="file" accept={ACCEPT_MEDIA} className="hidden" onChange={handleFileChange} />
										<Button type="button" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
											{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
											{uploading ? "Yuklanmoqda…" : "Yuklash"}
										</Button>
									</div>
								</div>
								<p className="text-xs text-gray-500 mt-1">Rasm: JPEG, PNG, WebP, GIF. Video: MP4, WebM, MOV. Maks. 100 MB.</p>
								{uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Aksiya badji (ixtiyoriy)</label>
								<Input value={badgeLabel} onChange={(e) => setBadgeLabel(e.target.value)} placeholder="Masalan: Aksiya, Chegirma" />
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
							<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Mahsulot tavsifi" />
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={saving}>
								{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
								Mahsulot qo‘shish
							</Button>
						</div>
						{error && <p className="text-sm text-red-600 mt-2">{error}</p>}
					</form>

					<Separator className="mb-4" />

					<div className="flex items-center justify-between mb-3">
						<h2 className="text-lg font-semibold">Mavjud mahsulotlar</h2>
						<Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={products.length === 0} className="shrink-0">
							<Download className="mr-2 h-4 w-4" />
							Excel
						</Button>
					</div>
					{loading ? (
						<div className="flex items-center gap-2 text-gray-600">
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Yuklanmoqda...</span>
						</div>
					) : products.length === 0 ? (
						<p className="text-sm text-gray-600">Hozircha mahsulotlar yo‘q.</p>
					) : (
						<>
							<div className="overflow-x-auto border rounded-md">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Nomi</TableHead>
											<TableHead className="hidden sm:table-cell">Badji</TableHead>
											<TableHead>Narx (so‘m)</TableHead>
											<TableHead className="hidden sm:table-cell">URL</TableHead>
											<TableHead className="hidden md:table-cell">Yaratilgan</TableHead>
											<TableHead className="w-[100px] text-right">Amallar</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginatedProducts.map((p) => (
											<TableRow key={String(p._id)}>
												<TableCell className="font-medium">{p.title}</TableCell>
												<TableCell className="hidden sm:table-cell">{p.badgeLabel ?? "-"}</TableCell>
												<TableCell>{formatPrice(p.price)}</TableCell>
												<TableCell className="hidden sm:table-cell max-w-xs truncate text-xs text-gray-600">{p.url}</TableCell>
												<TableCell className="hidden md:table-cell whitespace-nowrap text-xs">{formatDate(p.createdAt)}</TableCell>
												<TableCell className="text-right">
													<Button variant="destructive" size="sm" onClick={() => handleDelete(p._id as string)}>
														O‘chirish
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							<div className="flex items-center justify-end space-x-2 py-2">
								<span className="text-muted-foreground text-sm">
									{startItem}-{endItem} / {products.length}
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
