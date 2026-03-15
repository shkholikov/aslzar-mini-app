"use client";

import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { SectionCard } from "@/components/common/section-card";
import { UserPlus } from "lucide-react";
import { goldButtonClass } from "@/components/common/button-variants";
import { RippleButton } from "../ui/shadcn-io/ripple-button";

export function RegisterPromptCard() {
	const router = useRouter();
	const tg = useTelegram();

	const handleRegister = () => {
		router.push("/register");
		tg?.HapticFeedback?.impactOccurred("heavy");
	};

	return (
		<SectionCard iconImage="/icons/user.png" title="Ro'yxatdan o'tish">
			<p className="text-muted-foreground text-sm mb-4">Siz hali ASLZAR mijozi emassiz. Ro&apos;yxatdan o&apos;ting va Aslzar mijoziga aylaning!</p>
			<RippleButton variant="outline" size="default" className={`w-full sm:w-auto ${goldButtonClass}`} onClick={handleRegister}>
				<UserPlus className="size-4 shrink-0" />
				Ro&apos;yxatdan o&apos;tish
			</RippleButton>
		</SectionCard>
	);
}
