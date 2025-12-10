"use client";

import { Newspaper } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";

export function News() {
	return (
		<SectionCard icon={Newspaper} title="Yangiliklar">
			<ul className="space-y-3">
				<li>
					<strong>🎉 ASLZAR endi yanada qulay!</strong> – Platformamiz interfeysi yangilandi va foydalanuvchilar uchun intuitiv bo‘ldi.
				</li>
				<li>
					<strong>📱 Referral tizimi ishga tushdi</strong> – Do‘stlaringizni taklif qiling va bonuslarga ega bo‘ling!
				</li>
				<li>
					<strong>🔒 Xavfsizlikni oshirish bo‘yicha yangiliklar</strong> – Endi ma’lumotlaringiz yanada ishonchli himoyalangan.
				</li>
				<li>
					<strong>💰 Maxsus takliflar</strong> – ASLZAR orqali xarid qiling va har oy cheklangan aksiya va bonuslardan foydalaning.
				</li>
			</ul>
		</SectionCard>
	);
}
