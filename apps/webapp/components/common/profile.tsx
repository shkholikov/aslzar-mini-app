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

const DEFAULT_PROFILE_INFO = {
	verified: false,
	uroven: "Silver",
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
			<Avatar className="rounded-lg w-14 h-14">
				<AvatarImage src={photo_url} alt="profile_avatar" />
				<AvatarFallback className="w-14 h-14 text-xl">
					<Spinner className="size-6" />
				</AvatarFallback>
			</Avatar>
			<div className="w-full">
				<h1 className="text-xl text-center font-bold">Salom {first_name} 👋</h1>
				<span>
					<h4 className="text-center font-semibold tracking-tight">ASLZAR platformasiga xush kelibsiz!</h4>
				</span>

				<div className="mx-2">
					<div className="flex justify-center">
						{loading ? (
							<Skeleton className="h-5 w-40 rounded-full my-2" />
						) : profileInfo.verified ? (
							<Badge
								variant="secondary"
								className="bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 text-white my-2 border border-white/40 shadow-[0_4px_12px_-2px_rgba(59,130,246,0.45),inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.15)]"
							>
								<BadgeCheckIcon />
								Tasdiqlangan Mijoz
							</Badge>
						) : (
							<Badge
								variant="secondary"
								className="bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-white my-2 border border-white/45 shadow-[0_4px_12px_-2px_rgba(251,191,36,0.45),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.12)]"
							>
								<BadgeXIcon />
								Tasdiqlanmagan Mijoz
							</Badge>
						)}
					</div>
					<Separator className="my-2" />

					<div className="grid grid-cols-3 gap-2 w-full">
						<div className="backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-2 pt-2 pb-3 flex flex-col items-center gap-1">
							<Image src="/icons/crown.png" alt="Level" width={64} height={64} className="object-contain" />
							<div className="text-sm font-semibold text-center">Level</div>
							{loading ? (
								<Skeleton className="h-5 w-14 rounded-full" />
							) : (
								<Badge variant="default" className="bg-[#be9941] text-white w-fit">
									{profileInfo.uroven}
								</Badge>
							)}
						</div>
						<div className="backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-2 pt-2 pb-3 flex flex-col items-center gap-1">
							<Image src="/icons/contract.png" alt="Shartnomalar" width={64} height={64} className="object-contain" />
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
							<Image src="/icons/bonus.png" alt="Bonus" width={64} height={64} className="object-contain" />
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
