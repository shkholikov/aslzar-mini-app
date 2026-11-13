"use client";

import { Header } from "@/components/common/header";
import { BonusPrograms } from "@/components/common/bonus-programs";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";

/**
 * Not linked from anywhere yet: the «Bonus darajalari» row on /other is commented out until ASLZAR
 * confirms the level rules. BonusPrograms' percentages and thresholds are hardcoded text, not 1C data.
 */
export default function BonusLevelsPage() {
	useTelegramBackButton();

	return (
		<div className="pt-12">
			<Header title="Bonus darajalari" description="Silver, Gold va Diamond darajalari shartlari" iconImage="/icons/crown.webp" />
			<BonusPrograms />
		</div>
	);
}
