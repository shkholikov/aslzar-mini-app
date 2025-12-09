"use client";

import { useEffect } from "react";
import { Profile } from "@/components/profile";
import { usePathname, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { Link } from "@/components/common/link";
import { Gem } from "lucide-react";
import { BonusPrograms } from "@/components/common/bonus-programs";
import { PlatformInfo } from "@/components/common/platform-info";
import { UserInfo } from "@/components/common/user-info";
import { News } from "@/components/common/news";
import { DataLoading } from "@/components/common/data-loading";

export default function HomePage() {
	const pathname = usePathname();
	const router = useRouter();
	const tg = useTelegram();
	const { loading } = useUser();

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
				{loading ? (
					<DataLoading />
				) : (
					<div>
						<Link title="ASLZAR Telegram rasmiy kanali." href="https://t.me/ASLZAR_tilla" icon={Gem} />
						<PlatformInfo />
						<UserInfo />
						<News />
						<BonusPrograms />
					</div>
				)}
			</>
		</main>
	);
}
