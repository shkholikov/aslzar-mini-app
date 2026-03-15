"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { SectionCard } from "@/components/common/section-card";
import { Loading } from "@/components/common/loading";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { Megaphone } from "lucide-react";

const CHANNEL_LINK = "https://t.me/ASLZAR_tilla";

export function ChannelSubscribeCard() {
	const tg = useTelegram();
	const [isMember, setIsMember] = useState<boolean | null>(null);

	useEffect(() => {
		const userId = tg?.initDataUnsafe?.user?.id?.toString();
		if (!userId) {
			setIsMember(null);
			return;
		}

		let cancelled = false;

		fetch(`/api/channel-member?userId=${userId}`)
			.then((res) => res.json())
			.then((data: { isMember?: boolean }) => {
				if (!cancelled) setIsMember(data.isMember ?? false);
			})
			.catch(() => {
				if (!cancelled) setIsMember(null);
			});

		return () => {
			cancelled = true;
		};
	}, [tg]);

	const userId = tg?.initDataUnsafe?.user?.id?.toString();

	if (!userId) return null;

	if (isMember === null) {
		return (
			<div className="flex flex-col items-center py-4">
				<Loading />
			</div>
		);
	}

	if (isMember) return null;

	const handleOpenChannel = () => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		tg?.openTelegramLink?.(CHANNEL_LINK);
	};

	return (
		<SectionCard iconImage="/icons/discussion.png" title="Kanalga obuna bo'ling">
			<p className="text-muted-foreground text-sm mb-4">
				Siz hali ASLZAR rasmiy Telegram kanalimizga obuna bo&apos;lmagansiz. Yangiliklar va maxsus takliflar uchun obuna bo&apos;ling.
			</p>
			<RippleButton variant="outline" size="default" className={`w-full sm:w-auto ${goldButtonClass}`} onClick={handleOpenChannel}>
				<Megaphone className="size-4 shrink-0" />
				Kanalga o&apos;tish
			</RippleButton>
		</SectionCard>
	);
}
