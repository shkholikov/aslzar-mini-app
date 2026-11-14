"use client";

import useSWR from "swr";
import { BadgeCheckIcon, Instagram, Send } from "lucide-react";
import { Header } from "@/components/common/header";
import { ListCard, ListGroup } from "@/components/common/list-group";
import { UserAvatar } from "@/components/common/profile";
import { ProductCarousel } from "@/components/common/product-carousel";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { useFavoriteIds } from "@/hooks/useFavorites";

export default function OtherPage() {
	const tg = useTelegram();
	const { data } = useUser();
	const { count: favorites } = useFavoriteIds();

	// Read-only: no fetcher, so this never calls 1C from here. The count appears once /branches
	// has loaded the list in this session.
	const branchesKey = tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData ? "/v1/branches" : null;
	const { data: branches } = useSWR<unknown[]>(branchesKey, null);

	const verified = data?.code === 0;
	const tgUser = tg?.initDataUnsafe?.user;
	// 1C name first: it is the customer's legal name. Telegram's is the fallback for non-customers.
	const fullName =
		(verified ? [data.familiya, data.imya].filter(Boolean).join(" ") : "") ||
		[tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ");

	return (
		<div className="pt-12">
			<Header title="Boshqa" description="Platformadagi boshqa imkoniyatlar" iconImage="/icons/box.webp" />

			<ListCard
				href="/profile"
				media={<UserAvatar name={fullName} className="size-[52px] m-1" textClassName="text-[17px]" />}
				title={
					<span className="flex min-w-0 items-center gap-1.5 text-[17px] font-bold">
						<span className="truncate">{fullName || "Mehmon"}</span>
						{verified && <BadgeCheckIcon aria-label="Tasdiqlangan mijoz" className="size-[18px] shrink-0 fill-blue-500 text-white" />}
					</span>
				}
				subtitle="Profil va shaxsiy ma'lumotlar"
			/>

			<ListGroup
				className="mt-4"
				rows={[
					{ id: "favorites", title: "Sevimlilar", href: "/catalog?favorites=1", iconImage: "/icons/ring.webp", value: `${favorites} ta` },
					{
						id: "branches",
						title: "Filiallar va manzillar",
						href: "/branches",
						iconImage: "/icons/location.webp",
						value: Array.isArray(branches) ? `${branches.length} ta` : undefined
					}
					// Hidden until ASLZAR confirms the level rules. /bonus-levels shows BonusPrograms, whose
					// percentages and thresholds are hardcoded text from Nov 2025, not the values 1C returns.
					// To bring it back, uncomment this row and add
					// `const uroven = verified ? (data.bonusInfo?.uroven ?? null) : null;` above:
					// { id: "bonus-levels", title: "Bonus darajalari", href: "/bonus-levels", iconImage: "/icons/crown.webp", badge: uroven ?? undefined }
				]}
			/>

			<ListGroup
				title="Yordam"
				titleIcon="/icons/info.webp"
				className="mt-4"
				rows={[
					{ id: "faq", title: "Ko'p so'raladigan savollar", href: "/faq", iconImage: "/icons/faq.webp" },
					{ id: "suggestions", title: "Taklif va shikoyatlar", href: "/suggestions", iconImage: "/icons/discussion.webp" }
				]}
			/>

			<ListGroup
				title="Ijtimoiy tarmoqlar"
				titleIcon="/icons/news.webp"
				className="mt-4"
				rows={[
					{ id: "instagram", title: "Instagram", subtitle: "@aslzar.uz", href: "https://www.instagram.com/aslzar.uz/", icon: Instagram },
					{ id: "telegram", title: "Telegram kanal", subtitle: "@ASLZAR_tilla", href: "https://t.me/ASLZAR_tilla", icon: Send }
				]}
			/>

			<ProductCarousel />
		</div>
	);
}
