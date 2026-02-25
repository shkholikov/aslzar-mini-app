"use client";

import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { ProductCard, type ProductCardProps } from "@/components/common/product-card";

const demoProducts: ProductCardProps[] = [
	{
		id: "1",
		title: "ASLZAR oltin karta",
		description: "Har bir xaridda yuqori keshbek va eksklyuziv takliflar.",
		price: 250000,
		url: "/icons/wallet.png",
		badgeLabel: "Aksiya"
	},
	{
		id: "2",
		title: "ASLZAR premium obuna",
		description: "Qo‘shimcha bonuslar, ustuvor qo‘llab-quvvatlash va ko‘proq imkoniyatlar.",
		price: 150000,
		url: "/icons/crown.png"
	},
	{
		id: "3",
		title: "To‘lovlar paketi",
		description: "Kommunal va boshqa to‘lovlar uchun qulay to‘lov paketi.",
		price: 99000,
		url: "/icons/paper.png"
	},
	{
		id: "4",
		title: "Bonus ballar to‘plami",
		description: "Ko‘proq xarid qiladiganlar uchun qo‘shimcha bonus ballar.",
		price: 75000,
		url: "/icons/bonus.png",
		badgeLabel: "Chegirma"
	},
	{
		id: "5",
		title: "ASLZAR oilaviy rejasi",
		description: "Butun oila uchun birgalikdagi sodiqlik va to‘lov tizimi.",
		price: 180000,
		url: "/icons/user-info.png"
	},
	{
		id: "6",
		title: "Maxsus takliflar to‘plami",
		description: "Cheklangan vaqt davomida amal qiladigan maxsus aksiyalar.",
		price: 210000,
		mediaType: "video",
		url: "/IMG_9998.MOV"
	}
];

export default function CatalogPage() {
	return (
		<div className="pt-12">
			<Header title="Katalog" description="Mahsulotlar katalogi" iconImage="/icons/book.png" />
			<SectionCard iconImage="/icons/ring.png" title="Mahsulotlar">
				<div className="grid grid-cols-1 gap-3 mt-2">
					{demoProducts.map((product) => (
						<ProductCard key={product.id} {...product} />
					))}
				</div>
			</SectionCard>
		</div>
	);
}
