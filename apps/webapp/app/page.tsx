"use client";

import { useEffect } from "react";
import { Profile } from "@/components/common/profile";
import { usePathname, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { Link } from "@/components/common/link";
import { PlatformInfo } from "@/components/platform-info";
import { UserInfo } from "@/components/user-info";
import { News } from "@/components/news";
import { CallToActionItem } from "@/components/common/call-to-action-item";
import { Loading } from "@/components/common/loading";

export default function HomePage() {
	const { data, loading } = useUser();
	const tg = useTelegram();
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		if (!tg) return;
		const platform = tg.platform || "";
		const isMobile = platform === "android" || platform === "ios" || platform === "weba" || platform === "webk";
		if (isMobile) tg.requestFullscreen();
		tg.isVerticalSwipesEnabled = false;
	}, [tg, pathname, router]);

	return (
		<main className="flex flex-col items-center min-h-screen pt-12">
			<>
				<Profile />
				<div>
					<Link title="ASLZAR Telegram rasmiy kanali." href="https://t.me/ASLZAR_tilla" iconImage="/icons/ring.png" />
					<PlatformInfo />
					{loading ? (
						<Loading />
					) : data && data.code === 0 ? (
						<>
							<UserInfo />
							<News />
						</>
					) : (
						<CallToActionItem
							iconImage="/icons/info.png"
							title="Siz hali ASLZAR mijozi emassiz."
							description="Ro'yxatdan o'ting va Aslzar mijoziga aylaning!"
							buttonText="Kirish"
							onButtonClick={() => {
								router.push("/register");
								tg?.HapticFeedback?.impactOccurred("heavy");
							}}
						/>
					)}
				</div>
			</>
		</main>
	);
}
