import { useEffect, useState } from "react";
import { BadgeCheckIcon, BadgeInfo, BadgeXIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/hooks/useUser";
import { Loading } from "./loading";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "../ui/item";
import { RippleButton } from "../ui/shadcn-io/ripple-button";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";

const DEFAULT_PROFILE_INFO = {
	verified: false,
	uroven: "Aniqlanmagan",
	nachislenie: "0",
	contracts: 0
};

export function Profile() {
	const tg = useTelegram();
	const { data, loading } = useUser();
	const router = useRouter();
	const [profileInfo, setProfileInfo] = useState(DEFAULT_PROFILE_INFO);

	const userData = tg?.initDataUnsafe?.user;
	const photo_url = userData?.photo_url || "";
	const first_name = userData?.first_name || "";

	useEffect(() => {
		if (data && data.bonusInfo) {
			setProfileInfo({
				verified: data.code === 0,
				uroven: data.bonusInfo.uroven ?? DEFAULT_PROFILE_INFO.uroven,
				nachislenie: data.bonusInfo.nachislenie ?? DEFAULT_PROFILE_INFO.nachislenie,
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
				<h1 className="text-xl text-center text-gray-800 font-semibold">Salom, {first_name} 👋</h1>
				<span>
					<h4 className="text-center font-semibold tracking-tight">ASLZAR platformasiga xush kelibsiz!</h4>
				</span>
				{loading ? (
					<div className="flex justify-center my-2">
						<Loading />
					</div>
				) : (
					<div className="mx-2">
						<div className="flex justify-center my-2">
							{profileInfo.verified ? (
								<Badge variant="secondary" className="bg-blue-500 text-white">
									<BadgeCheckIcon />
									Tasdiqlangan Mijoz
								</Badge>
							) : (
								<Badge variant="secondary" className="bg-amber-400 text-white">
									<BadgeXIcon />
									Tasdiqlanmagan Mijoz
								</Badge>
							)}
						</div>
						<Separator className="my-2" />
						{profileInfo.verified ? (
							<div className="flex h-5 items-center space-x-4 text-sm">
								<Badge variant="outline">Level: {profileInfo.uroven}</Badge>
								<Separator orientation="vertical" />
								<Badge variant="outline">Cachback: {profileInfo.nachislenie}</Badge>
								<Separator orientation="vertical" />
								<Badge variant="outline">Shartnomalar: {profileInfo.contracts}</Badge>
							</div>
						) : (
							<Item variant="outline">
								<ItemMedia>
									<BadgeInfo className="size-5" />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>Siz hali ASLZAR mijozi emassiz.</ItemTitle>
									<ItemDescription>Ro‘yxatdan o‘ting va Aslzar mijoziga aylaning!</ItemDescription>
								</ItemContent>
								<ItemActions>
									<RippleButton
										variant="outline"
										onClick={() => {
											router.push("/register");
											tg?.HapticFeedback?.impactOccurred("light");
										}}
									>
										Kirish
									</RippleButton>
								</ItemActions>
							</Item>
						)}
					</div>
				)}
			</div>
		</>
	);
}
