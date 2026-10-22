import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BadgeCheckIcon, ChevronRightIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { useTelegram } from "@/hooks/useTelegram";
import { cn } from "@/lib/utils";

/** Avatar ring per 1C level; an unknown level keeps the neutral border. */
const TIER_RING: Record<string, string> = {
	Silver: "ring-slate-300",
	Gold: "ring-[#be9941]",
	Diamond: "ring-sky-300"
};

/** Uzbek greeting for the current hour in Tashkent, whatever timezone the phone is set to. */
function greetingForNow(): string {
	const hour = Number(
		new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Tashkent" }).format(new Date())
	);
	if (hour >= 5 && hour < 11) return "Xayrli tong";
	if (hour >= 11 && hour < 17) return "Xayrli kun";
	if (hour >= 17 && hour < 23) return "Xayrli kech";
	return "Xayrli tun";
}

export function Profile() {
	const tg = useTelegram();
	const router = useRouter();
	const { data } = useUser();

	const userData = tg?.initDataUnsafe?.user;
	const photoUrl = userData?.photo_url || "";
	const firstName = userData?.first_name || userData?.last_name || "";
	const initials = [userData?.first_name, userData?.last_name]
		.map((part) => part?.trim().charAt(0))
		.filter(Boolean)
		.join("")
		.toUpperCase();

	const greeting = useMemo(greetingForNow, []);

	const verified = data?.code === 0;
	const uroven = verified ? (data.bonusInfo?.uroven ?? null) : null;

	const go = (path: string) => {
		tg?.HapticFeedback?.impactOccurred("medium");
		router.push(path);
	};

	return (
		<section className="w-full px-2 mb-4">
			<button
				type="button"
				onClick={() => go("/profile")}
				className="flex w-full items-center gap-3 px-2 text-left active:opacity-60 transition-opacity"
			>
				<Avatar
					className={cn(
						"size-14 ring-2 ring-offset-2 ring-offset-background",
						uroven ? (TIER_RING[uroven] ?? "ring-border") : "ring-border"
					)}
				>
					<AvatarImage src={photoUrl} alt={firstName || "Profil"} />
					<AvatarFallback className="bg-[#be9941]/15 text-[#be9941] text-lg font-semibold">
						{initials || <UserIcon className="size-6" />}
					</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1">
					<p className="text-sm text-muted-foreground">{firstName ? `${greeting},` : `${greeting}!`}</p>
					{firstName && (
						<p className="flex items-center gap-1.5 text-xl font-bold leading-tight">
							<span className="truncate">{firstName}</span>
							{verified && <BadgeCheckIcon aria-label="Tasdiqlangan mijoz" className="size-5 shrink-0 fill-blue-500 text-white" />}
						</p>
					)}
				</div>
				<ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
			</button>

			<ProfileStats className="mt-4" />
		</section>
	);
}

/** Level, contracts and bonus in one card. Shared by the home header and /profile. */
export function ProfileStats({ className }: { className?: string }) {
	const tg = useTelegram();
	const router = useRouter();
	const { data, loading } = useUser();

	const verified = data?.code === 0;
	const uroven = verified ? (data.bonusInfo?.uroven ?? null) : null;
	const contracts = verified ? (data.contract?.ids?.length ?? 0) : 0;
	const bonus = verified ? (data.bonusOstatok ?? 0) : 0;

	const go = (path: string) => {
		tg?.HapticFeedback?.impactOccurred("medium");
		router.push(path);
	};

	// Stats exist only for ASLZAR customers; unregistered users get RegisterPromptCard instead.
	if (!loading && !verified) return null;
	return (
		<div
			className={cn(
				"grid grid-cols-3 divide-x divide-border border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent shadow-md py-3",
				className
			)}
		>
			<StatCell icon="/icons/crown.webp" label="Level" loading={loading} value={uroven ?? "—"} />
			<StatCell icon="/icons/contract.webp" label="Shartnoma" loading={loading} value={`${contracts} ta`} onClick={() => go("/finance")} />
			<StatCell
				icon="/icons/bonus.webp"
				label="Bonus"
				loading={loading}
				value={`${bonus.toLocaleString("uz-UZ")} so'm`}
				onClick={() => go("/referral")}
			/>
		</div>
	);
}

interface StatCellProps {
	icon: string;
	label: string;
	value: string;
	loading: boolean;
	onClick?: () => void;
}

function StatCell({ icon, label, value, loading, onClick }: StatCellProps) {
	const content = (
		<>
			<Image src={icon} alt="" width={36} height={36} className="object-contain" priority sizes="36px" />
			{loading ? (
				<Skeleton className="h-5 w-16 rounded-full" />
			) : (
				<span className="text-sm font-bold text-[#be9941] dark:text-[#d4b85a] truncate max-w-full">{value}</span>
			)}
			<span className="text-xs text-muted-foreground">{label}</span>
		</>
	);
	const className = "flex flex-col items-center gap-1 px-1 min-w-0";

	if (!onClick) return <div className={className}>{content}</div>;
	return (
		<button type="button" onClick={onClick} className={cn(className, "active:opacity-60 transition-opacity")}>
			{content}
		</button>
	);
}
