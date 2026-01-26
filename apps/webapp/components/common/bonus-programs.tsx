"use client";

import { SectionCard } from "@/components/common/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect, useState } from "react";
import { Loading } from "./loading";

export interface IBonusProgram {
	uroven: string;
	nachislenie: number;
	spisanie: number;
	nachislenieVSrok: number;
	perexod: number;
}

const programs = {
	"Silver": {
		"title": "Silver🥈",
		"description": "Silver🥈 — bu boshlang'ich bonus darajasi.",
		"benefits": [
			"Mijoz qarzni to'laganda 4% bonus oladi",
			"To'lovni o'z vaqtida amalga oshirsa — 3% qo'shimcha bonus beriladi",
			"Yangi shartnoma tuzishda bonuslarning 7% gacha qismini ishlatish mumkin"
		],
		"requirement": "Bu darajaga o'tish uchun hech qanday aylanma talab qilinmaydi."
	},
	"Gold": {
		"title": "Gold🥇",
		"description": "Gold🥇 — faol mijozlar uchun yuqori bonus darajasi.",
		"benefits": [
			"Qarzni to'laganda 6% bonus beriladi",
			"O'z vaqtida to'lov uchun yana 5% bonus beriladi",
			"Yangi shartnoma bo'yicha 7% gacha bonusni chegirma sifatida ishlatish mumkin"
		],
		"requirement": "Gold darajasiga o'tish uchun mijozning umumiy aylanishi 1501 dan yuqori bo'lishi kerak."
	},
	"Diamond": {
		"title": "Diamond💎",
		"description": "Diamond💎 — eng yuqori va eng foydali bonus darajasi.",
		"benefits": [
			"Qarzni to'lashda 9% bonus beriladi",
			"O'z vaqtida to'lovda qo'shimcha 8% bonus beriladi",
			"Yangi shartnoma bo'yicha 7% gacha bonuslarni ishlatish mumkin"
		],
		"requirement": "Diamond darajasi uchun talab qilinadigan aylanish miqdori — 3001 dan yuqori."
	}
};

export function BonusPrograms() {
	const tg = useTelegram();
	const [bonusProgramList, setBonusProgramList] = useState<IBonusProgram[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchBonusProgramData = async () => {
			try {
				const response = await fetch("/api/bonus");

				if (!response.ok) {
					throw new Error(`Failed to fetch bonus programs data: ${response.status}`);
				}

				const responseData = await response.json();
				const order = ["Silver", "Gold", "Diamond"];
				const sorted = responseData.sort((a: IBonusProgram, b: IBonusProgram) => order.indexOf(a.uroven) - order.indexOf(b.uroven));
				setBonusProgramList(sorted);
			} catch (error) {
				console.error("Error fetching bonus programs data from 1C:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchBonusProgramData();
	}, []);

	if (loading) return <Loading />;

	if (!bonusProgramList || bonusProgramList.length === 0) return null;

	return (
		<SectionCard iconImage="/icons/crown.png" title="Bonus darajalari haqida">
			<Tabs defaultValue={bonusProgramList[0]?.uroven} className="w-full items-center">
				<TabsList>
					{bonusProgramList.map((program) => (
						<TabsTrigger key={program.uroven} value={program.uroven} onClick={() => tg?.HapticFeedback?.impactOccurred("heavy")}>
							{program.uroven}
						</TabsTrigger>
					))}
				</TabsList>
				{bonusProgramList.map((program) => (
					<TabsContent key={program.uroven} value={program.uroven}>
						<strong className="text-sm">{programs[program.uroven as keyof typeof programs].description}</strong>
						<ul className="text-sm list-disc pl-5">
							{programs[program.uroven as keyof typeof programs].benefits.map((benefit: string, idx: number) => (
								<li key={idx}>{benefit}</li>
							))}
						</ul>
						<p className="text-sm">
							<strong>Shartlar:</strong> {programs[program.uroven as keyof typeof programs].requirement}
						</p>
					</TabsContent>
				))}
			</Tabs>
		</SectionCard>
	);
}
