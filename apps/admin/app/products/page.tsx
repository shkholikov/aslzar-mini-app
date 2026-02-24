"use client";

import * as React from "react";
import { AdminGuard } from "@/components/common/admin-guard";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductDoc } from "@/lib/db";
import { Loader2, Package } from "lucide-react";

export default function ProductsPage() {
	const [products, setProducts] = React.useState<ProductDoc[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [saving, setSaving] = React.useState(false);

	const [title, setTitle] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [price, setPrice] = React.useState<string>("");
	const [imageUrl, setImageUrl] = React.useState("");
	const [badgeLabel, setBadgeLabel] = React.useState("");

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

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (saving) return;

		const trimmedTitle = title.trim();
		const trimmedDescription = description.trim();
		const trimmedImageUrl = imageUrl.trim();
		const numericPrice = Number(price);

		if (!trimmedTitle || !trimmedDescription || !trimmedImageUrl || !numericPrice || numericPrice <= 0) {
			setError("Iltimos, barcha majburiy maydonlarni to‘ldiring va narxni to‘g‘ri kiriting.");
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
					price: numericPrice,
					imageUrl: trimmedImageUrl,
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
			setImageUrl("");
			setBadgeLabel("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Noma’lum xatolik");
		} finally {
			setSaving(false);
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

	function formatPrice(value: number) {
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

	return (
		<AdminGuard>
			<main className="flex min-h-screen w-full container flex-col py-8 px-4">
				<div className="w-full max-w-3xl mx-auto">
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
								<label className="block text-sm font-medium text-gray-700 mb-1">Narxi (so‘m)</label>
								<Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" placeholder="Masalan: 250000" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Rasm URL</label>
								<Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/images/product.png yoki to‘liq URL" />
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

					<h2 className="text-lg font-semibold mb-2">Mavjud mahsulotlar</h2>
					{loading ? (
						<div className="flex items-center gap-2 text-gray-600">
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Yuklanmoqda...</span>
						</div>
					) : products.length === 0 ? (
						<p className="text-sm text-gray-600">Hozircha mahsulotlar yo‘q.</p>
					) : (
						<div className="overflow-x-auto border rounded-md">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Nomi</TableHead>
										<TableHead>Badji</TableHead>
										<TableHead>Narx (so‘m)</TableHead>
										<TableHead>Rasm URL</TableHead>
										<TableHead>Yaratilgan</TableHead>
										<TableHead className="w-[100px] text-right">Amallar</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{products.map((p) => (
										<TableRow key={String(p._id)}>
											<TableCell className="font-medium">{p.title}</TableCell>
											<TableCell>{p.badgeLabel ?? "-"}</TableCell>
											<TableCell>{formatPrice(p.price)}</TableCell>
											<TableCell className="max-w-xs truncate text-xs text-gray-600">{p.imageUrl}</TableCell>
											<TableCell className="whitespace-nowrap text-xs">{formatDate(p.createdAt)}</TableCell>
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
					)}
				</div>
			</main>
		</AdminGuard>
	);
}
