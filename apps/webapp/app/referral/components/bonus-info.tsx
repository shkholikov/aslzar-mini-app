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
	};
}

export function BonusInfo({ data }: BonusInfoProps) {
	if (!data || data.code !== 0 || !data.bonusInfo) return null;

	const level = data.bonusInfo.uroven || "N/A";
	const remainingBonus = data.bonusOstatok || 0;

	return (
		<SectionCard iconImage="/icons/oxup.png" title="Bonus ma'lumotlari">
			<div className="flex flex-wrap gap-2">
				<div className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-4 py-3 flex flex-col items-center gap-1">
					<Image src="/icons/crown.png" alt="Level" width={50} height={50} className="object-contain" />
					<div className="text-xs font-semibold text-center">Level:</div>
					<Badge variant="default" className="bg-[#be9941] text-white">
						{level}
					</Badge>
				</div>
				<div className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-4 py-3 flex flex-col items-center gap-1">
					<Image src="/icons/bonus.png" alt="Bonus" width={50} height={50} className="object-contain" />
					<div className="text-xs font-semibold text-center">Bonus:</div>
					<Badge variant="default" className="bg-[#be9941] text-white">
						{remainingBonus.toLocaleString("uz-UZ")} so&apos;m
					</Badge>
				</div>
			</div>
		</SectionCard>
	);
}
