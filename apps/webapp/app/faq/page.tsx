"use client";

import { Header } from "@/components/common/header";
import { FAQ } from "../other/components/faq";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";

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
		answer:
			"Ha, barcha ma'lumotlaringiz shifrlangan va xavfsiz saqlanadi. Biz sizning shaxsiy ma'lumotlaringizni uchinchi shaxslarga o'tkazmaymiz."
	},
	{
		id: "faq-4",
		question: "Qanday qilib yordam olishim mumkin?",
		answer:
			"Agar savollaringiz bo'lsa, bizning qo'llab-quvvatlash xizmatimizga murojaat qiling yoki FAQ bo'limida javob topishga harakat qiling."
	}
];

export default function FaqPage() {
	useTelegramBackButton();

	return (
		<div className="pt-12">
			<Header title="Savollar" description="Ko'p so'raladigan savollar" iconImage="/icons/faq.webp" />
			<div className="mx-2 my-2 border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent p-4 shadow-md">
				<FAQ items={faqItems} />
			</div>
		</div>
	);
}
