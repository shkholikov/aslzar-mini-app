"use client";

import { Header } from "@/components/common/header";
import { CallToActionItem } from "@/components/common/call-to-action-item";
import { ReferralQRCode } from "./components/referral-qr-code";
import { ReferralsList } from "./components/referrals-list";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loading } from "@/components/common/loading";
import { BonusInfo } from "./components/bonus-info";

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

export default function ReferralPage() {
	const tg = useTelegram();
	const router = useRouter();
	const { data, loading } = useUser();
	const [preparedMessageId, setPreparedMessageId] = useState<string | null>(null);
	const [referrals, setReferrals] = useState<IReferral[]>([]);
	const [referralsLoading, setReferralsLoading] = useState(false);

	useEffect(() => {
		const fetchUserReferrals = async () => {
			if (!data) return;
			try {
				setReferralsLoading(true);
				const clientId = data.clientId;

				const response = await fetch(`/api/referral?clientId=${clientId}`);
				if (!response.ok) {
					throw new Error(`Failed to fetch referrals data: ${response.status}`);
				}

				const referralsData = await response.json();
				console.log(referralsData);

				setReferrals(referralsData?.list);
			} catch (error) {
				console.error("Error fetching user's referrals data from 1C:", error);
			} finally {
				setReferralsLoading(false);
			}
		};

		fetchUserReferrals();
	}, [data]);

	useEffect(() => {
		if (!tg) return;

		const userId = tg.initDataUnsafe.user.id;

		// Always generate a fresh prepared message
		const generate = async () => {
			const res = await fetch(`/api/referral/link?userId=${userId}`);
			const data = await res.json();

			setPreparedMessageId(data.preparedMessageId);
		};

		generate();
	}, [tg]);

	// Memoize referral link for stable reference
	const referralLink = useMemo(() => {
		if (!tg?.initDataUnsafe?.user?.id) return "https://t.me/aslzardevbot";
		return `https://t.me/aslzardevbot?start=${tg.initDataUnsafe.user.id}`;
	}, [tg]);

	const handleCopy = useCallback(() => {
		tg?.HapticFeedback?.impactOccurred("light");
		const referralMsg = `ASLZAR💎 platformasiga qo'shiling!\n\n🔗 Mening taklif havolam orqali ro'yxatdan o'tishingiz mumkin:\n\n${referralLink}`;
		navigator.clipboard.writeText(referralMsg);
		toast.success("Referral link nusxasi olindi!");
	}, [referralLink, tg]);

	const handleShare = useCallback(() => {
		tg?.HapticFeedback?.impactOccurred("light");
		if (!preparedMessageId) {
			toast.error("Referral ulashish uchun hozircha tayyorlangan link topilmadi.");
			return;
		}
		tg?.shareMessage(preparedMessageId);
	}, [preparedMessageId, tg]);

	return (
		<div className="pt-12">
			<Header
				title="Referral"
				description="Sizning referal link va do'stlaringizni taklif qilib, qanday foyda olishingiz mumkinligi shu yerda ko'rsatiladi."
				icon={Users}
			/>

			{loading ? (
				<Loading />
			) : data && data.code === 0 ? (
				<>
					<BonusInfo />
					<ReferralQRCode referralLink={referralLink} preparedMessageId={preparedMessageId} onCopy={handleCopy} onShare={handleShare} />
					<ReferralsList referrals={referrals} loading={referralsLoading} />
				</>
			) : (
				<CallToActionItem
					title="Siz hali ASLZAR mijozi emassiz."
					description="Ro'yxatdan o'ting va Aslzar mijoziga aylaning!"
					buttonText="Kirish"
					onButtonClick={() => {
						router.push("/register");
						tg?.HapticFeedback?.impactOccurred("light");
					}}
				/>
			)}
		</div>
	);
}
