"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { FAQ } from "./components/faq";
import { Link } from "@/components/common/link";
import { Gem, Instagram } from "lucide-react";
import { ProductCarousel } from "@/components/common/product-carousel";
import type { CatalogProduct } from "@/lib/db";

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
	const [products, setProducts] = useState<CatalogProduct[]>([]);
	const [productsLoading, setProductsLoading] = useState(true);

	useEffect(() => {
		fetch("/api/products")
			.then((res) => res.json())
			.then((data) => setProducts(Array.isArray(data.products) ? data.products : []))
			.catch(() => setProducts([]))
			.finally(() => setProductsLoading(false));
	}, []);

	return (
		<div className="pt-12">
			<Header title="Boshqa" description="Platformadagi boshqa imkoniyatlar" iconImage="/icons/box.png" />
			<Link title="Filiallar va manzillar" href="/branches" iconImage="/icons/location.png" />
			<Link title="Taklif va shikoyatlar" href="/suggestions" iconImage="/icons/discussion.png" />
			<Link title="ASLZAR Instagram rasmiy sahifasi" href="https://www.instagram.com/aslzar.uz/" icon={Instagram} />
			<Link title="ASLZAR Telegram rasmiy kanali" href="https://t.me/ASLZAR_tilla" icon={Gem} />
			<ProductCarousel products={products} loading={productsLoading} />
			<SectionCard iconImage="/icons/faq.png" title="Ko'p so'raladigan savollar">
				<FAQ items={faqItems} />
			</SectionCard>
		</div>
	);
}
