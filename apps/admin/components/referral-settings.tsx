"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, ShieldAlert, SlidersHorizontal, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/common/loading";
import { useAdminContext } from "@/components/common/admin-context";
import { num } from "@/lib/dashboard-format";
import { FALLBACK_REFERRAL_LIMIT, type ReferralSettings, type ReferralStats } from "@/lib/referral";

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
	return (
		<div className="rounded-lg border bg-white p-4">
			<div className="flex items-center gap-2 text-sm text-gray-600">
				<Icon className="h-4 w-4" />
				{label}
			</div>
			<div className="mt-1 text-2xl font-semibold text-gray-800">{value}</div>
			{hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
		</div>
	);
}

export function ReferralSettingsView() {
	const router = useRouter();
	const admin = useAdminContext();
	const [settings, setSettings] = React.useState<ReferralSettings | null>(null);
	const [stats, setStats] = React.useState<ReferralStats | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	const [limitInput, setLimitInput] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [saveError, setSaveError] = React.useState<string | null>(null);
	const [saved, setSaved] = React.useState(false);

	const load = React.useCallback(async () => {
		try {
			setError(null);
			const res = await fetch("/api/referral-settings");
			if (res.status === 401) {
				router.replace("/login");
				return;
			}
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				setError(data.error || "Sozlamalarni yuklashda xatolik");
				return;
			}
			const data = await res.json();
			setSettings(data.settings);
			setStats(data.stats);
			setLimitInput(String(data.settings?.defaultReferralLimit ?? FALLBACK_REFERRAL_LIMIT));
		} catch (err) {
			console.error("Sozlamalarni yuklashda xatolik:", err);
			setError("Sozlamalarni yuklashda xatolik");
		} finally {
			setLoading(false);
		}
	}, [router]);

	React.useEffect(() => {
		load();
	}, [load]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (saving) return;

		const parsed = Number(limitInput.trim());
		if (!Number.isInteger(parsed) || parsed < 0) {
			setSaveError("Limit 0 yoki undan katta butun son bo'lishi kerak");
			return;
		}

		setSaving(true);
		setSaveError(null);
		setSaved(false);
		try {
			const res = await fetch("/api/referral-settings", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ defaultReferralLimit: parsed })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || "Saqlab bo'lmadi");
			setSaved(true);
			// Reload so the stats reflect the new default (who counts as "at limit" changes with it).
			await load();
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : "Noma'lum xatolik");
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <Loading />;
	if (error) return <p className="text-sm text-destructive">{error}</p>;

	const canEdit = !admin?.role || admin.role === "superadmin";
	const updatedAt = settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString("ru-RU") : null;

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-lg border bg-white p-4">
				<h2 className="text-base font-semibold text-gray-800">Standart referal limiti</h2>
				<p className="mt-1 text-sm text-gray-600">
					Bu limit shaxsiy limiti belgilanmagan barcha foydalanuvchilarga qo&apos;llaniladi. Alohida foydalanuvchi uchun limitni uning
					sahifasida o&apos;zgartirish mumkin — u har doim ustuvor bo&apos;ladi.
				</p>

				<form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
					<div className="w-40">
						<label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="defaultReferralLimit">
							Limit
						</label>
						<Input
							id="defaultReferralLimit"
							type="number"
							min={0}
							inputMode="numeric"
							value={limitInput}
							disabled={!canEdit}
							onChange={(e) => {
								setLimitInput(e.target.value);
								setSaved(false);
							}}
						/>
					</div>
					<Button type="submit" disabled={saving || !canEdit}>
						{saving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saqlanmoqda...
							</>
						) : (
							"Saqlash"
						)}
					</Button>
				</form>

				{!canEdit && <p className="mt-2 text-sm text-gray-600">Standart limitni faqat superadmin o&apos;zgartira oladi.</p>}
				{saveError && <p className="mt-2 text-sm text-destructive">{saveError}</p>}
				{saved && <p className="mt-2 text-sm text-green-600">Saqlandi</p>}
				{settings?.updatedBy && (
					<p className="mt-2 text-xs text-gray-500">
						Oxirgi o&apos;zgartirish: {settings.updatedBy}
						{updatedAt ? ` · ${updatedAt}` : ""}
					</p>
				)}
			</div>

			<div>
				<h2 className="text-base font-semibold text-gray-800 mb-2">Referal statistikasi</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard icon={Users} label="Mijozlar" value={num(stats?.totalCustomers ?? 0)} hint="1C ma'lumotlari mavjud" />
					<StatCard icon={ShieldAlert} label="Limitga yetganlar" value={num(stats?.atLimit ?? 0)} hint="Yangi referal qo'sha olmaydi" />
					<StatCard icon={SlidersHorizontal} label="Maxsus limitli" value={num(stats?.withCustomLimit ?? 0)} hint="Standartdan farqli" />
					<StatCard icon={Share2} label="Jami referallar" value={num(stats?.totalReferrals ?? 0)} hint="Barcha mijozlar bo'yicha" />
				</div>
				<p className="mt-2 text-xs text-gray-500">
					Statistika 1C dan saqlangan ma&apos;lumotlar asosida hisoblanadi va kunlik sinxronizatsiyadan keyin yangilanadi.
				</p>
			</div>
		</div>
	);
}
