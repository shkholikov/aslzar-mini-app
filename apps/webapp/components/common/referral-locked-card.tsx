"use client";

import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { SectionCard } from "@/components/common/section-card";
import { Gem } from "lucide-react";
import { goldButtonClass } from "@/components/common/button-variants";
import { RippleButton } from "../ui/shadcn-io/ripple-button";

export function ReferralLockedCard() {
	const router = useRouter();
	const tg = useTelegram();

	const handleBrowseCatalog = () => {
		router.push("/catalog");
		tg?.HapticFeedback?.impactOccurred("heavy");
	};

	return (
		<SectionCard iconImage="/icons/user.webp" title="Referal dasturi">
			<p className="text-muted-foreground text-sm mb-4">
				Referal dasturi faqat ASLZAR mijozlari uchun. Birinchi xaridingizdan so&apos;ng referal dasturi siz uchun ochiladi!
			</p>
			<RippleButton variant="outline" size="default" className={`w-full sm:w-auto ${goldButtonClass}`} onClick={handleBrowseCatalog}>
				<Gem className="size-4 shrink-0" />
				Katalogni ko&apos;rish
			</RippleButton>
		</SectionCard>
	);
}
