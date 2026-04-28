"use client";

import useSWR from "swr";
import { Header } from "@/components/common/header";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { ReferralQRCode } from "./components/referral-qr-code";
import { ReferralsList } from "./components/referrals-list";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { BonusInfo } from "./components/bonus-info";
import { SectionCard } from "@/components/common/section-card";
import { ProductCarousel } from "@/components/common/product-carousel";

interface IReferral {
	id: string;
	chislo: string;
	familiya: string;
	imya: string;
	otchestvo: string;
	phone: string;
	contract: boolean;
	contractDate: string;
}

const referralsFetcher = async (url: string): Promise<IReferral[]> => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch referrals: ${res.status}`);
	const json = await res.json();
	return json?.list ?? [];
};

const preparedMessageFetcher = async (url: string): Promise<string | null> => {
	const res = await fetch(url);
	if (!res.ok) return null;
	const json = await res.json();
	return json.preparedMessageId ?? null;
};

export default function ReferralPage() {
	const tg = useTelegram();
	const { data, loading } = useUser();
	const clientId = data?.clientId;
	const userId = tg?.initDataUnsafe?.user?.id;

	const {
		data: referralsData,
		isLoading: referralsLoading,
		mutate: refreshReferrals
	} = useSWR(clientId ? `/api/referral?clientId=${clientId}` : null, referralsFetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60_000,
		keepPreviousData: true
	});
	const referrals = referralsData ?? [];

	const { data: preparedMessageId } = useSWR(userId ? `/api/referral/link?userId=${userId}` : null, preparedMessageFetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60_000
	});

	// Memoize referral link for stable reference
	const botLink = process.env.NEXT_PUBLIC_BOT_TELEGRAM_LINK || "https://t.me/aslzardevbot";
	const referralLink = useMemo(() => {
		if (!tg?.initDataUnsafe?.user?.id) return botLink;
		return `${botLink}?start=${tg.initDataUnsafe.user.id}`;
	}, [tg, botLink]);

	const handleCopy = useCallback(() => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		const referralMsg = `ASLZAR💎 platformasiga qo'shiling!\n\n🔗 Mening taklif havolam orqali ro'yxatdan o'tishingiz mumkin:\n\n${referralLink}`;
		navigator.clipboard.writeText(referralMsg);
		toast.success("Referral link nusxasi olindi!");
	}, [referralLink, tg]);

	const handleShare = useCallback(() => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		if (!preparedMessageId) {
			toast.error("Referral ulashish uchun hozircha tayyorlangan link topilmadi.");
			return;
		}
		tg?.shareMessage(preparedMessageId);
	}, [preparedMessageId, tg]);

	return (
		<div className="pt-12">
			<Header title="Referral" description="Sizning referal ma'lumotlaringiz" iconImage="/icons/user.webp" />

			{loading ? (
				<>
					<SectionCard iconImage="/icons/crown.webp" title="Bonus ma'lumotlari">
						<div className="flex flex-wrap gap-2">
							{[0, 1].map((i) => (
								<div key={i} className="flex-1 min-w-[calc(50%-0.5rem)] rounded-4xl border-2 px-4 py-3 flex flex-col items-center gap-2">
									<Skeleton className="w-12 h-12 rounded-md" />
									<Skeleton className="h-3 w-full" />
									<Skeleton className="h-5 w-16 rounded-full" />
								</div>
							))}
						</div>
					</SectionCard>
					<SectionCard iconImage="/icons/user.webp" title="Referral havolangiz">
						<Skeleton className="w-full aspect-square rounded-2xl mb-3" />
						<Skeleton className="h-9 w-full rounded-md mb-2" />
						<Skeleton className="h-9 w-full rounded-md" />
					</SectionCard>
				</>
			) : data && data.code === 0 ? (
				<>
					<BonusInfo data={data} />
					<ReferralQRCode
						referralLink={referralLink}
						preparedMessageId={preparedMessageId ?? null}
						onCopy={handleCopy}
						onShare={handleShare}
					/>
					<ProductCarousel />
					<ReferralsList
						referrals={referrals}
						loading={referralsLoading}
						onReload={() => {
							refreshReferrals();
							tg?.HapticFeedback?.impactOccurred("heavy");
						}}
					/>
				</>
			) : (
				<RegisterPromptCard />
			)}
		</div>
	);
}
