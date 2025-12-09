"use client";

import { Newspaper } from "lucide-react";
import { SectionCard } from "./section-card";

export function News() {
	return (
		<SectionCard icon={Newspaper} title="Yangiliklar">
			<p>Bu yerga telegram kanaldagi so’nggi postlarni qo‘shsak bo‘ladi...</p>
		</SectionCard>
	);
}

