"use client";

import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";
import { MessageCircle } from "lucide-react";

/** Telegram account users are sent to when they want their referral limit raised. */
const SUPPORT_LINK = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_LINK || "https://t.me/Aslzar_admin";

/**
 * Shown instead of the QR / copy / share block once the user reached their referral limit.
 * Deliberately explains that already-shared links stop being counted — the link itself keeps
 * working (it still opens the bot), only the referral attribution is skipped.
 */
export function ReferralLimitCard() {
	const tg = useTelegram();

	return (
		<SectionCard iconImage="/icons/info.webp" title="Referal dasturi">
			<p className="text-muted-foreground text-sm">
				Sizning referal limitingiz tugagan. Havolangiz orqali ro&apos;yxatdan o&apos;tgan yangi mijozlar referal sifatida hisobga olinmaydi.
			</p>
			<p className="text-muted-foreground text-sm mt-2 mb-4">Limitni oshirish uchun ASLZAR bilan bog&apos;laning.</p>
			{/* Plain anchor (via asChild) rather than tg.openTelegramLink — that API leaves iOS
			    users stuck on a broken back navigation. */}
			<Button asChild variant="outline" size="default" className={`w-full sm:w-auto ${goldButtonClass}`}>
				<a href={SUPPORT_LINK} onClick={() => tg?.HapticFeedback?.impactOccurred("heavy")}>
					<MessageCircle className="size-4 shrink-0" />
					ASLZAR bilan bog&apos;lanish
				</a>
			</Button>
		</SectionCard>
	);
}
