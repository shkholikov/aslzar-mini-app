"use client";

import { Newspaper } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";

export function News() {
	return (
		<SectionCard icon={Newspaper} title="Yangiliklar">
			<p>Newssss....</p>
		</SectionCard>
	);
}
