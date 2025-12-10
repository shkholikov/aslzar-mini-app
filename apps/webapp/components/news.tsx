"use client";

import { Newspaper } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";

export function News() {
	return (
		<SectionCard icon={Newspaper} title="Yangiliklar">
			<p>Bu yerga telegram kanaldagi so&#39;nggi postlarni qo&#39;shsak bo&#39;ladi...</p>
		</SectionCard>
	);
}
