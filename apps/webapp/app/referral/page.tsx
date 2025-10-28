"use client";

import { Header } from "@/components/common/header";
import { Users } from "lucide-react";

export default function ReferralPage() {
	return (
		<div className="pt-12">
			<Header
				title="Referral"
				description="Sizning referal link va do‘stlaringizni taklif qilib, qanday foyda olishingiz mumkinligi shu yerda ko‘rsatiladi."
				icon={Users}
			/>
		</div>
	);
}
