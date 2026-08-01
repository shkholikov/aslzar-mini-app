import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/hooks/useUser";
import { Skeleton } from "../ui/skeleton";
import { useTelegram } from "@/hooks/useTelegram";
import { BadgeCheckIcon, BadgeXIcon } from "lucide-react";
import Image from "next/image";

interface ProfileInfo {
	verified: boolean;
	/** Null until 1C tells us the level — an unregistered user has no tier, so never invent one. */
	uroven: string | null;
	bonusOstatok: number;
	contracts: number;
}

const DEFAULT_PROFILE_INFO: ProfileInfo = {
	verified: false,
	uroven: null,
	bonusOstatok: 0,
	contracts: 0
};

export function Profile() {
	const tg = useTelegram();
	const { data, loading } = useUser();
	const [profileInfo, setProfileInfo] = useState(DEFAULT_PROFILE_INFO);

	const userData = tg?.initDataUnsafe?.user;
	const photo_url = userData?.photo_url || "";
	const first_name = userData?.first_name || userData?.last_name || "";

	useEffect(() => {
		if (data && data.bonusInfo) {
			setProfileInfo({
				verified: data.code === 0,
				uroven: data.bonusInfo.uroven ?? DEFAULT_PROFILE_INFO.uroven,
				bonusOstatok: data.bonusOstatok ?? DEFAULT_PROFILE_INFO.bonusOstatok,
				contracts: data.contract?.ids?.length ?? DEFAULT_PROFILE_INFO.contracts
			});
		} else {
			setProfileInfo(DEFAULT_PROFILE_INFO);
		}
	}, [data]);

	return (
		<>
			<Avatar className="rounded-lg w-20 h-20">
				<AvatarImage src={photo_url} alt="profile_avatar" />
				<AvatarFallback className="w-20 h-20 text-xl">
					<Spinner className="size-6" />
				</AvatarFallback>
			</Avatar>

			{/* Verification badge sits directly under the avatar, above the greeting. */}
			<div className="flex justify-center mt-2">
				{loading ? (
					<Skeleton className="h-6 w-44 rounded-full" />
				) : profileInfo.verified ? (
					<Badge
						variant="secondary"
						className="text-xs px-3 py-1 gap-1.5 [&>svg]:size-3.5 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 text-white border border-white/40 shadow-[0_4px_12px_-2px_rgba(59,130,246,0.45),inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.15)]"
					>
						<BadgeCheckIcon />
						Tasdiqlangan Mijoz
					</Badge>
				) : (
					<Badge
						variant="secondary"
						className="text-xs px-3 py-1 gap-1.5 [&>svg]:size-3.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-white border border-white/45 shadow-[0_4px_12px_-2px_rgba(251,191,36,0.45),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.12)]"
					>
						<BadgeXIcon />
						Tasdiqlanmagan Mijoz
					</Badge>
				)}
			</div>

			<div className="w-full">
				<h1 className="text-xl text-center font-bold">Salom {first_name} 👋</h1>
				<span>
					<h4 className="text-center font-semibold tracking-tight">ASLZAR platformasiga xush kelibsiz!</h4>
				</span>

				{/* Always rendered, in every state: a grid that appears only once 1C answers made the
				    skeletons below unreachable and shoved the page down when the data landed. */}
				<div className="mx-2">
					<Separator className="my-2" />

					<div className="grid grid-cols-3 gap-2 w-full">
						<div className="backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-2 pt-2 pb-3 flex flex-col items-center gap-1">
							<Image src="/icons/crown.webp" alt="Level" width={64} height={64} className="object-contain" priority sizes="64px" />
							<div className="text-sm font-semibold text-center">Level</div>
							{loading ? (
								<Skeleton className="h-5 w-14 rounded-full" />
							) : (
								<Badge variant="default" className="bg-[#be9941] text-white w-fit">
									{profileInfo.uroven ?? "—"}
								</Badge>
							)}
						</div>
						<div className="backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-2 pt-2 pb-3 flex flex-col items-center gap-1">
							<Image
								src="/icons/contract.webp"
								alt="Shartnomalar"
								width={64}
								height={64}
								className="object-contain"
								priority
								sizes="64px"
							/>
							<div className="text-sm font-semibold text-center">Shartnoma</div>
							{loading ? (
								<Skeleton className="h-5 w-8 rounded-full" />
							) : (
								<Badge variant="default" className="bg-[#be9941] text-white w-fit">
									{profileInfo.contracts} ta
								</Badge>
							)}
						</div>
						<div className="backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-2 pt-2 pb-3 flex flex-col items-center gap-1">
							<Image src="/icons/bonus.webp" alt="Bonus" width={64} height={64} className="object-contain" priority sizes="64px" />
							<div className="text-sm font-semibold text-center">Bonus</div>
							{loading ? (
								<Skeleton className="h-5 w-20 rounded-full" />
							) : (
								<Badge variant="default" className="bg-[#be9941] text-white w-fit">
									{profileInfo.bonusOstatok.toLocaleString("uz-UZ")} so&apos;m
								</Badge>
							)}
						</div>
					</div>
					<Separator className="my-2" />
				</div>
			</div>
		</>
	);
}
