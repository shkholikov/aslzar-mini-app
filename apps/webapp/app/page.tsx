"use client";

import { useEffect } from "react";
import { Profile } from "@/components/common/profile";
import { usePathname, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { PlatformInfo } from "@/components/platform-info";
import { UserInfo } from "@/components/user-info";
import { News } from "@/components/news";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { ChannelSubscribeCard } from "@/components/common/channel-subscribe-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/common/section-card";

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
					{loading ? (
						<SectionCard iconImage="/icons/user-info.png" title="Asosiy Ma'lumotlar">
							<div className="flex flex-col gap-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
								<Skeleton className="h-4 w-2/3" />
							</div>
						</SectionCard>
					) : data && data.code === 0 ? (
						<>
							<UserInfo />
						</>
					) : (
						<RegisterPromptCard />
					)}
					<ChannelSubscribeCard />
					<PlatformInfo />
					<News />
				</div>
			</>
		</main>
	);
}
