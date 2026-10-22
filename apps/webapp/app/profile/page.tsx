"use client";

import { BadgeCheckIcon, UserIcon } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Link } from "@/components/common/link";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { UserLoadError } from "@/components/common/user-load-error";
import { BonusCard } from "@/components/common/bonus-card";
import { ProfileStats } from "@/components/common/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/useUser";
import { useTelegram } from "@/hooks/useTelegram";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { useFavoriteIds } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

/** Avatar ring per 1C level, same colours as the home header. */
const TIER_RING: Record<string, string> = {
	Silver: "ring-slate-300",
	Gold: "ring-[#be9941]",
	Diamond: "ring-sky-300"
};

export default function ProfilePage() {
	const { data, loading, error } = useUser();
	const tg = useTelegram();

	useTelegramBackButton();

	const tgUser = tg?.initDataUnsafe?.user;
	const verified = data?.code === 0;
	// useUser maps 404 (not a customer) to data: null with no error, so error without data is a failed call.
	const failed = !loading && !data && Boolean(error);

	return (
		<div className="pt-12">
			<ProfileHero data={verified ? data : null} loading={loading || failed} />

			{/* Shows its own skeletons while loading and nothing for non-customers. */}
			<div className="mx-2 my-2">
				<ProfileStats />
			</div>

			{verified ? (
				<>
					{/* Same gate as the home screen: ASLZAR customers only. */}
					{data.contractFirst === true && data.bonusToken ? <BonusCard /> : null}
					<Activity data={data} />
					<PersonalData data={data} />
				</>
			) : failed ? (
				<UserLoadError />
			) : !loading ? (
				<RegisterPromptCard />
			) : null}

			<SectionCard iconImage="/icons/user.webp" title="Telegram hisobi">
				<dl className="flex flex-col gap-2 text-sm">
					{tgUser?.username ? <Row label="Username" value={`@${tgUser.username}`} /> : null}
					<Row label="Telegram ID" value={tgUser?.id ? String(tgUser.id) : "—"} />
					{tgUser?.language_code ? <Row label="Til" value={tgUser.language_code} /> : null}
				</dl>
			</SectionCard>
		</div>
	);
}

/* eslint-disable @typescript-eslint/no-explicit-any -- useUser() returns the raw 1C payload untyped */

function ProfileHero({ data, loading }: { data: any | null; loading: boolean }) {
	const tg = useTelegram();
	const tgUser = tg?.initDataUnsafe?.user;
	const uroven: string | null = data?.bonusInfo?.uroven ?? null;

	// 1C name first: it is the customer's legal name. Telegram's is the fallback for non-customers.
	const fullName = data
		? [data.familiya, data.imya].filter(Boolean).join(" ")
		: [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ");
	// Same source as the title, so "Aliyev Vali" never sits over a "J" from the Telegram name.
	const initials = fullName
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0))
		.filter(Boolean)
		.join("")
		.toUpperCase();

	return (
		<div className="mx-2 mt-2 mb-5 flex flex-col items-center gap-2 text-center">
			<Avatar
				className={cn(
					"size-24 ring-[3px] ring-offset-4 ring-offset-background",
					uroven ? (TIER_RING[uroven] ?? "ring-border") : "ring-border"
				)}
			>
				<AvatarImage src={tgUser?.photo_url || ""} alt={fullName || "Profil"} />
				<AvatarFallback className="bg-[#be9941]/15 text-[#be9941] text-3xl font-semibold">
					{initials || <UserIcon className="size-10" />}
				</AvatarFallback>
			</Avatar>

			<h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold leading-tight">
				<span>{fullName || "Mehmon"}</span>
				{data && <BadgeCheckIcon aria-label="Tasdiqlangan mijoz" className="size-6 shrink-0 fill-blue-500 text-white" />}
			</h1>

			{!loading && !data && <span className="text-sm text-muted-foreground">ASLZAR mijozi emas</span>}
		</div>
	);
}

function Activity({ data }: { data: any }) {
	const { count: favorites } = useFavoriteIds();
	const active: number = data.contract?.active ?? 0;
	const ended: number = data.contract?.ended ?? 0;
	const referralLimit = typeof data.referralLimit === "number" ? data.referralLimit : null;

	const title = (label: string, value: string) => (
		<span className="flex w-full items-center justify-between gap-2">
			{label}
			<span className="text-sm font-normal text-muted-foreground">{value}</span>
		</span>
	);

	return (
		<SectionCard iconImage="/icons/star-folder.webp" title="Faoliyat" bare>
			<div className="-m-2">
				<Link
					title={title("Shartnomalar", ended ? `${active} faol, ${ended} yopilgan` : `${active} faol`)}
					href="/finance"
					iconImage="/icons/contract.webp"
				/>
				<Link
					title={title(
						"Takliflar",
						referralLimit !== null ? `${data.referalCount ?? 0} / ${referralLimit}` : `${data.referalCount ?? 0} ta`
					)}
					href="/referral"
					iconImage="/icons/user.webp"
				/>
				<Link title={title("Sevimlilar", `${favorites} ta`)} href="/catalog?favorites=1" iconImage="/icons/ring.webp" />
			</div>
		</SectionCard>
	);
}

function PersonalData({ data }: { data: any }) {
	const branch: string | null = data.suboffice || data.lastContractBranch || null;
	return (
		<SectionCard iconImage="/icons/user-info.webp" title="Shaxsiy ma'lumotlar">
			<dl className="flex flex-col gap-2 text-sm">
				<Row label="FIO" value={[data.familiya, data.imya, data.otchestvo].filter(Boolean).join(" ")} />
				{data.clientId ? <Row label="Mijoz ID" value={String(data.clientId)} /> : null}
				<Row label="Telefon" value={data.phone} />
				{branch ? <Row label="Filial" value={branch} /> : null}
				{data.inn ? <Row label="STIR" value={data.inn} /> : null}
			</dl>
		</SectionCard>
	);
}

/* eslint-enable @typescript-eslint/no-explicit-any */

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-right font-medium break-all">{value}</dd>
		</div>
	);
}
