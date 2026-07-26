"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loading } from "@/components/common/loading";
import type { UserDocument } from "@/lib/db";
import { num, som } from "@/lib/dashboard-format";
import { FALLBACK_REFERRAL_LIMIT } from "@/lib/referral";

interface Referral {
	id: string;
	familiya?: string;
	imya?: string;
	otchestvo?: string;
	phone?: string;
	contract?: boolean;
	contractDate?: string;
}

function formatDate(value: unknown): string {
	if (!value) return "-";
	const raw = typeof value === "object" && value !== null && "$date" in value ? (value as { $date: string }).$date : value;
	const date = new Date(raw as string);
	return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ru-RU");
}

/** One label/value line. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-4 py-1.5 border-b last:border-b-0">
			<span className="text-sm text-gray-600 shrink-0">{label}</span>
			<span className="text-sm text-gray-900 text-right break-all">{value ?? "-"}</span>
		</div>
	);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border bg-white p-4">
			<h2 className="text-base font-semibold text-gray-800 mb-2">{title}</h2>
			{children}
		</div>
	);
}

export function UserProfile({ userKey }: { userKey: string }) {
	const router = useRouter();
	const [user, setUser] = React.useState<UserDocument | null>(null);
	// Platform default from the Referal settings page, used when this user has no individual limit.
	const [defaultLimit, setDefaultLimit] = React.useState(FALLBACK_REFERRAL_LIMIT);
	const [defaultLoaded, setDefaultLoaded] = React.useState(false);
	const [referrals, setReferrals] = React.useState<Referral[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	// Referral limit editor
	const [limitInput, setLimitInput] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [saveError, setSaveError] = React.useState<string | null>(null);
	const [saved, setSaved] = React.useState(false);

	React.useEffect(() => {
		async function fetchUser() {
			try {
				setError(null);
				const response = await fetch(`/api/users/${userKey}`);
				if (response.status === 401) {
					router.replace("/login");
					return;
				}
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					setError(data.error || "Foydalanuvchini yuklashda xatolik");
					return;
				}
				const data = await response.json();
				setUser(data.user);
			} catch (err) {
				console.error("Foydalanuvchini yuklashda xatolik:", err);
				setError("Foydalanuvchini yuklashda xatolik");
			} finally {
				setLoading(false);
			}
		}
		fetchUser();
	}, [userKey, router]);

	// Referrals come from 1C via the API proxy; a failure here must not break the page.
	React.useEffect(() => {
		async function fetchReferrals() {
			try {
				const response = await fetch(`/api/users/${userKey}/referrals`);
				if (!response.ok) return;
				const data = await response.json();
				setReferrals(Array.isArray(data?.list) ? data.list : []);
			} catch (err) {
				console.error("Referallarni yuklashda xatolik:", err);
			}
		}
		fetchReferrals();

		async function fetchDefaultLimit() {
			try {
				const response = await fetch("/api/referral-settings");
				if (!response.ok) return;
				const data = await response.json();
				if (typeof data?.settings?.defaultReferralLimit === "number") setDefaultLimit(data.settings.defaultReferralLimit);
			} catch {
				// ignore, fall back to FALLBACK_REFERRAL_LIMIT
			} finally {
				setDefaultLoaded(true);
			}
		}
		fetchDefaultLimit();
	}, [userKey]);

	// Prefill the editor with the limit actually in force — the user's own value, or the platform
	// default when they have none. Runs once both are known so the field never flashes a stale
	// number; clearing it still means "follow the default".
	const editorInitialised = React.useRef(false);
	React.useEffect(() => {
		if (!user || !defaultLoaded || editorInitialised.current) return;
		editorInitialised.current = true;
		setLimitInput(String(typeof user.referralLimit === "number" ? user.referralLimit : defaultLimit));
	}, [user, defaultLimit, defaultLoaded]);

	async function handleSaveLimit(e: React.FormEvent) {
		e.preventDefault();
		if (saving) return;

		const trimmed = limitInput.trim();
		const parsed = trimmed === "" ? null : Number(trimmed);
		if (parsed !== null && (!Number.isInteger(parsed) || parsed < 0)) {
			setSaveError("Limit 0 yoki undan katta butun son bo'lishi kerak (bo'sh = standart)");
			return;
		}

		setSaving(true);
		setSaveError(null);
		setSaved(false);
		try {
			const res = await fetch(`/api/users/${userKey}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ referralLimit: parsed })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || "Limitni saqlab bo'lmadi");
			setUser((prev) => (prev ? { ...prev, referralLimit: parsed } : prev));
			setSaved(true);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : "Noma'lum xatolik");
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <Loading />;
	if (error) return <p className="text-sm text-destructive">{error}</p>;
	if (!user) return <p className="text-sm text-gray-600">Foydalanuvchi topilmadi</p>;

	const v = user.value;
	const oneC = v.user1CData;
	const fullName = [oneC?.imya || v.first_name, oneC?.familiya || v.last_name].filter(Boolean).join(" ") || "Noma'lum";
	const effectiveLimit = typeof user.referralLimit === "number" ? user.referralLimit : defaultLimit;
	const used = oneC?.referalCount ?? 0;

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link href="/users" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
					<ArrowLeft className="h-4 w-4" />
					Foydalanuvchilar
				</Link>
				<h1 className="text-2xl text-gray-800 font-semibold mt-2">{fullName}</h1>
				<p className="text-sm text-gray-600">
					{v.phone_number ? `+${v.phone_number}` : "Telefon raqami yo'q"}
					{v.username ? ` · @${v.username}` : ""} · ID: {user.key}
				</p>
			</div>
			<Separator />

			<div className="grid gap-4 md:grid-cols-2">
				<Card title="Referal limiti">
					<div className="mb-3">
						<Row label="Ishlatilgan" value={`${num(used)} / ${num(effectiveLimit)}`} />
						<Row
							label="Joriy limit"
							value={typeof user.referralLimit === "number" ? num(user.referralLimit) : `${defaultLimit} (standart)`}
						/>
						<Row
							label="O'zgartirgan"
							value={user.referralLimitUpdatedBy ? `${user.referralLimitUpdatedBy} · ${formatDate(user.referralLimitUpdatedAt)}` : "-"}
						/>
					</div>
					<form onSubmit={handleSaveLimit} className="flex items-end gap-2">
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="referralLimit">
								Yangi limit
							</label>
							<Input
								id="referralLimit"
								type="number"
								min={0}
								inputMode="numeric"
								value={limitInput}
								onChange={(e) => {
									setLimitInput(e.target.value);
									setSaved(false);
								}}
								placeholder=""
							/>
						</div>
						<Button type="submit" disabled={saving}>
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
					{saveError && <p className="mt-2 text-sm text-destructive">{saveError}</p>}
					{saved && <p className="mt-2 text-sm text-green-600">Saqlandi</p>}
					{used >= effectiveLimit && (
						<p className="mt-2 text-sm text-gray-600">
							Limit to&apos;lgan: foydalanuvchi yangi referal qo&apos;sha olmaydi va ilovada havola ulashish o&apos;chirilgan.
						</p>
					)}
				</Card>

				<Card title="Umumiy ma'lumot">
					<Row label="Telegram ID" value={user.key} />
					<Row label="Username" value={v.username ? `@${v.username}` : "-"} />
					<Row label="Tasdiqlangan" value={v.isVerified ? "Ha" : "Yo'q"} />
					<Row label="Kanal a'zosi" value={v.isChannelMember ? "Ha" : "Yo'q"} />
					<Row label="Ro'yxatdan o'tgan" value={formatDate(v.createdAt)} />
					<Row label="Xodim referal kodi" value={v.referredByEmployeeCode || "-"} />
				</Card>

				<Card title="1C ma'lumotlari">
					<Row label="Client ID" value={oneC?.clientId || "-"} />
					<Row label="Daraja" value={oneC?.bonusInfo?.uroven || "-"} />
					<Row label="Bonus qoldig'i" value={typeof oneC?.bonusOstatok === "number" ? som(oneC.bonusOstatok) : "-"} />
					<Row label="Aylanma" value={typeof oneC?.bonusInfo?.oborot === "number" ? som(oneC.bonusInfo.oborot) : "-"} />
					<Row label="Status" value={oneC?.status === true ? "Aktiv" : oneC?.status === false ? "Aktiv emas" : "-"} />
					<Row label="Xarid qilgan" value={oneC?.contractFirst === true ? "Ha" : "Yo'q"} />
					<Row label="Shu oyda tashrif" value={oneC?.lastVisit === true ? "Ha" : "Yo'q"} />
				</Card>

				<Card title="Moliyaviy holat">
					<Row label="Qarz" value={typeof oneC?.debt === "number" ? som(oneC.debt) : "-"} />
					<Row label="Qoldiq" value={typeof oneC?.remain === "number" ? som(oneC.remain) : "-"} />
					<Row label="Kechikkan to'lovlar" value={typeof oneC?.latePayment === "number" ? num(oneC.latePayment) : "-"} />
					<Row label="Aktiv shartnomalar" value={typeof oneC?.contract?.active === "number" ? num(oneC.contract.active) : "-"} />
					<Row label="Yopilgan shartnomalar" value={typeof oneC?.contract?.ended === "number" ? num(oneC.contract.ended) : "-"} />
				</Card>
			</div>

			<Card title={`Referallar (${referrals.length})`}>
				{referrals.length === 0 ? (
					<p className="text-sm text-gray-600">Referallar yo&apos;q</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Telefon</TableHead>
								<TableHead>Ism</TableHead>
								<TableHead>Xarid</TableHead>
								<TableHead>Sana</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{referrals.map((referral) => (
								<TableRow key={referral.id}>
									<TableCell className="font-medium">{referral.phone || "-"}</TableCell>
									<TableCell>{[referral.imya, referral.familiya].filter(Boolean).join(" ") || "-"}</TableCell>
									<TableCell>{referral.contract ? "Ha" : "Yo'q"}</TableCell>
									<TableCell>{referral.contractDate || "-"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</Card>
		</div>
	);
}
