"use client";

import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";
import { ReceiptText, Award, Coins } from "lucide-react";

export function BonusInfo() {
	const { data } = useUser();

	if (!data || data.code !== 0 || !data.bonusInfo) return null;

	const level = data.bonusInfo.uroven || "N/A";
	const remainingBonus = data.bonusOstatok || 0;

	return (
		<SectionCard icon={ReceiptText} title="Bonus ma'lumotlari">
			<div className="flex flex-wrap justify-center items-center gap-3 mt-2">
				<Badge variant="outline" className="flex items-center gap-1.5">
					<Award className="size-3.5" />
					<span className="font-medium">Daraja:</span>
					<span>{level}</span>
				</Badge>
				<Badge variant="outline" className="flex items-center gap-1.5">
					<Coins className="size-3.5" />
					<span className="font-medium">Qoldiq bonus:</span>
					<span>{remainingBonus}</span>
				</Badge>
			</div>
		</SectionCard>
	);
}
