"use client";

import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface BonusInfoProps {
	data?: {
		code?: number;
		bonusInfo?: {
			uroven?: string;
		};
		bonusOstatok?: number;
		referalCount?: number;
		referralLimit?: number;
	};
}

/** One stat tile. Three fit in a row on a ~390px screen, so paddings and type are tighter than a 2-up layout. */
function Tile({ icon, label, value }: { icon: string; label: string; value: string }) {
	return (
		<div className="flex-1 backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-2 py-3 flex flex-col items-center gap-1">
			<Image src={icon} alt={label} width={40} height={40} sizes="40px" className="object-contain" />
			<div className="text-[11px] font-semibold text-center">{label}</div>
			<Badge variant="default" className="bg-[#be9941] text-white text-[10px] px-2">
				{value}
			</Badge>
		</div>
	);
}

export function BonusInfo({ data }: BonusInfoProps) {
	if (!data || data.code !== 0 || !data.bonusInfo) return null;

	const level = data.bonusInfo.uroven || "N/A";
	const remainingBonus = data.bonusOstatok || 0;
	const referralsUsed = data.referalCount ?? 0;
	const referralLimit = data.referralLimit;

	return (
		<SectionCard iconImage="/icons/oxup.webp" title="Bonus ma'lumotlari" bare>
			<div className="flex gap-2">
				<Tile icon="/icons/crown.webp" label="Level" value={level} />
				<Tile icon="/icons/bonus.webp" label="Bonus" value={`${remainingBonus.toLocaleString("uz-UZ")} so'm`} />
				{typeof referralLimit === "number" && (
					<Tile icon="/icons/star-folder.webp" label="Takliflar" value={`${referralsUsed} / ${referralLimit}`} />
				)}
			</div>
		</SectionCard>
	);
}
