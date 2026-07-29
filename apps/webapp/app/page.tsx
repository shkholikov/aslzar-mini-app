"use client";

import { useEffect } from "react";
import { Profile } from "@/components/common/profile";
import { usePathname, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { PlatformInfo } from "@/components/platform-info";
import { News } from "@/components/news";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { ChannelSubscribeCard } from "@/components/common/channel-subscribe-card";
import { ProductCarousel } from "@/components/common/product-carousel";
import { BonusCard } from "@/components/common/bonus-card";

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
				<div className="w-full overflow-hidden">
					{!loading && !(data && data.code === 0) && <RegisterPromptCard />}
					{/* Bonus card is for ASLZAR customers only — same gate as the referral programme. */}
					{!loading && data?.code === 0 && data.contractFirst === true && data.clientId && <BonusCard clientId={data.clientId} />}
					<PlatformInfo />
					<ProductCarousel />
					<ChannelSubscribeCard />
					<News />
				</div>
			</>
		</main>
	);
}
