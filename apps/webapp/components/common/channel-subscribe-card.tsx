"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { SectionCard } from "@/components/common/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { Megaphone, Loader2, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const CHANNEL_LINK = "https://t.me/ASLZAR_tilla";

export function ChannelSubscribeCard() {
	const tg = useTelegram();
	const [isMember, setIsMember] = useState<boolean | null>(null);
	const [checkLoading, setCheckLoading] = useState(false);
	const [checkMessage, setCheckMessage] = useState<string | null>(null);

	const userId = tg?.initDataUnsafe?.user?.id?.toString();

	useEffect(() => {
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
	}, [tg, userId]);

	const handleOpenChannel = () => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		tg?.openTelegramLink?.(CHANNEL_LINK);
	};

	const handleCheckMembership = async () => {
		if (!userId) return;
		tg?.HapticFeedback?.impactOccurred("medium");
		setCheckLoading(true);
		setCheckMessage(null);
		try {
			const res = await fetch(`/api/channel-member?userId=${userId}`);
			const data = (await res.json()) as { isMember?: boolean };
			const member = data.isMember ?? false;
			if (member) {
				tg?.HapticFeedback?.notificationOccurred("success");
				toast.success("Rahmat, obuna bo'lganingiz uchun!");
				const opts = { particleCount: 80, spread: 70, origin: { y: 0.6 } };
				confetti(opts);
				setTimeout(() => confetti({ ...opts, particleCount: 40, scalar: 0.8 }), 200);
				setIsMember(true);
			} else {
				setCheckMessage("Hali obuna bo'lmagansiz. Avval kanalga o'ting.");
			}
		} catch {
			setCheckMessage("Tekshirish amalga oshmadi. Qaytadan urinib ko'ring.");
		} finally {
			setCheckLoading(false);
		}
	};

	if (!userId) return null;

	if (isMember === null) {
		return (
			<SectionCard iconImage="/icons/discussion.webp" title="Kanalga obuna bo'ling">
				<Skeleton className="h-3 w-full mb-1" />
				<Skeleton className="h-3 w-3/4 mb-4" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-9 w-full rounded-md" />
					<Skeleton className="h-9 w-full rounded-md" />
				</div>
			</SectionCard>
		);
	}

	if (isMember) return null;

	return (
		<SectionCard iconImage="/icons/discussion.webp" title="Kanalga obuna bo'ling">
			<p className="text-muted-foreground text-sm mb-4">
				Yangiliklar va maxsus takliflar — ASLZAR rasmiy Telegram kanalimizda. Obuna bo&apos;ling va yangiliklardan xabardor bo&apos;ling.
			</p>
			<div className="flex flex-col gap-2">
				<RippleButton
					variant="outline"
					size="default"
					className={`w-full sm:w-auto ${goldButtonClass}`}
					onClick={handleOpenChannel}
					disabled={checkLoading}
				>
					<Megaphone className="size-4 shrink-0" />
					Kanalga azo bo&apos;lish
				</RippleButton>
				<RippleButton
					variant="outline"
					size="default"
					className={`w-full sm:w-auto ${goldButtonClass}`}
					onClick={handleCheckMembership}
					disabled={checkLoading}
				>
					{checkLoading ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <CheckCircle2 className="size-4 shrink-0" />}
					A&apos;zolikni tekshirish
				</RippleButton>
			</div>
			{checkMessage && (
				<p className="text-muted-foreground text-sm mt-3" role="status">
					{checkMessage}
				</p>
			)}
		</SectionCard>
	);
}
