import { useEffect, useState } from "react";
import { BadgeCheckIcon, BadgeXIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/hooks/useUser";
import { Loading } from "./loading";
import { useTelegram } from "@/hooks/useTelegram";

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

					<div className="flex flex-wrap justify-center items-center gap-2 text-sm">
						<Badge variant="outline" className="shadow-sm">
							Level: {profileInfo.uroven}
						</Badge>
						<Badge variant="outline" className="shadow-sm">
							Shartnomalar: {profileInfo.contracts}
						</Badge>
						<Badge variant="outline" className="shadow-sm">
							Bonus: {profileInfo.bonusOstatok.toLocaleString("uz-UZ")} so&apos;m
						</Badge>
					</div>
					<Separator className="my-2" />
				</div>
			</div>
		</>
	);
}
