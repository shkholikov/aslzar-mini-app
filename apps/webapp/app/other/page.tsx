"use client";

import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { FAQ } from "./components/faq";
import { LayoutGrid, HelpCircle } from "lucide-react";

const faqItems = [
	{
		id: "faq-1",
		question: "Platformadan qanday foydalanish kerak?",
		answer:
			"Platformadan foydalanish uchun avval ro'yxatdan o'ting va profil yarating. Keyin kerakli bo'limlarni tanlab, xizmatlardan foydalanishingiz mumkin."
	},
	{
		id: "faq-2",
		question: "Qanday to'lov usullari mavjud?",
		answer: "Platformada turli to'lov usullari mavjud: bank kartasi, elektron to'lov tizimlari va boshqa qulay usullar."
	},
	{
		id: "faq-3",
		question: "Ma'lumotlarim xavfsizmi?",
		answer: "Ha, barcha ma'lumotlaringiz shifrlangan va xavfsiz saqlanadi. Biz sizning shaxsiy ma'lumotlaringizni uchinchi shaxslarga o'tkazmaymiz."
	},
	{
		id: "faq-4",
		question: "Qanday qilib yordam olishim mumkin?",
		answer: "Agar savollaringiz bo'lsa, bizning qo'llab-quvvatlash xizmatimizga murojaat qiling yoki FAQ bo'limida javob topishga harakat qiling."
	}
];

export default function OtherPage() {
	return (
		<div className="pt-12">
			<Header title="Boshqa" description="Platformadagi boshqa imkoniyat va menu elementlari shu yerda ko'rsatiladi." icon={LayoutGrid} />
			<SectionCard icon={HelpCircle} title="Ko'p so'raladigan savollar">
				<FAQ items={faqItems} />
			</SectionCard>
		</div>
	);
}
