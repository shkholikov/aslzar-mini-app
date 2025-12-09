"use client";

import { InfoIcon } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";

export function PlatformInfo() {
	return (
		<SectionCard icon={InfoIcon} title="Platforma Haqida">
			<p>
				Bu platforma orqali siz <strong>ASLZAR💎</strong> xizmatlaridan, shartnomasiz yoki shartnoma bilan, onlayn va xavfsiz
				foydalanishingiz mumkin.
			</p>
		</SectionCard>
	);
}

