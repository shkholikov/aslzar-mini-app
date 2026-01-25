import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/hooks/useUser";
import { Loading } from "./loading";
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
				contracts: data.contract.ids.length ?? DEFAULT_PROFILE_INFO.contracts
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
			<div>
				<h1 className="text-xl text-center font-bold">Salom {first_name} 👋</h1>
				<span>
					<h4 className="text-center font-semibold tracking-tight">ASLZAR platformasiga xush kelibsiz!</h4>
				</span>

				<div className="mx-2">
					<div className="flex justify-center">
						{loading ? (
							<Loading />
						) : profileInfo.verified ? (
							<Badge variant="secondary" className="bg-blue-500 text-white my-2 shadow-sm">
								<BadgeCheckIcon />
								Tasdiqlangan Mijoz
							</Badge>
						) : (
							<Badge variant="secondary" className="bg-amber-400 text-white my-2 shadow-sm">
								<BadgeXIcon />
								Tasdiqlanmagan Mijoz
							</Badge>
						)}
					</div>
					<Separator className="my-2" />

					<div className="flex flex-wrap justify-center items-stretch gap-2">
						<div className="flex-1 min-w-0 backdrop-blur-[4px] bg-muted/50 bg-transparent rounded-4xl shadow-sm border-2 px-4 py-3 flex flex-col items-center gap-1">
							<Image src="/icons/crown.png" alt="Level" width={50} height={50} className="object-contain" />
							<div className="text-xs font-semibold text-center">Level:</div>
							<div className="text-xs text-muted-foreground text-center">{profileInfo.uroven}</div>
						</div>
						<div className="flex-1 min-w-0 backdrop-blur-[4px] bg-muted/50 bg-transparent rounded-4xl shadow-sm border-2 px-4 py-3 flex flex-col items-center gap-1">
							<Image src="/icons/contract.png" alt="Shartnomalar" width={50} height={50} className="object-contain" />
							<div className="text-xs font-semibold text-center">Shartnomalar:</div>
							<div className="text-xs text-muted-foreground text-center">{profileInfo.contracts}</div>
						</div>
						<div className="flex-1 min-w-0 backdrop-blur-[4px] bg-muted/50 bg-transparent rounded-4xl shadow-sm border-2 px-4 py-3 flex flex-col items-center gap-1">
							<Image src="/icons/bonus.png" alt="Bonus" width={50} height={50} className="object-contain" />
							<div className="text-xs font-semibold text-center">Bonus:</div>
							<div className="text-xs text-muted-foreground text-center">{profileInfo.bonusOstatok.toLocaleString("uz-UZ")} so&apos;m</div>
						</div>
					</div>
					<Separator className="my-2" />
				</div>
			</div>
		</>
	);
}
