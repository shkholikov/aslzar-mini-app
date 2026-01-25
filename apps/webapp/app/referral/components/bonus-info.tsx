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
		<SectionCard iconImage="/icons/wallet.png" title="Bonus ma'lumotlari">
			<div className="flex flex-wrap justify-center items-center gap-3 mt-2">
				<Badge variant="outline" className="flex items-center gap-1.5">
					<Image src="/icons/crown.png" alt="" width={16} height={16} className="object-contain" />
					<span className="font-medium">Level:</span>
					<span>{level}</span>
				</Badge>
				<Badge variant="outline" className="flex items-center gap-1.5">
					<Image src="/icons/ring.png" alt="" width={16} height={16} className="object-contain" />
					<span className="font-medium">Bonus: </span>
					<span>{remainingBonus} so&apos;m</span>
				</Badge>
			</div>
		</SectionCard>
	);
}
