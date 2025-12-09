"use client";

import { Header } from "@/components/common/header";
import { Loading } from "@/components/common/loading";
import { QRCodeGenerator } from "./components/qrcode-generator";
import { BonusPrograms } from "@/components/common/bonus-programs";
import { Button } from "@/components/ui/button";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { CopyCheck, Forward, QrCode, ReceiptText, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
	const { data, loading } = useUser();
	const [preparedMessageId, setPreparedMessageId] = useState<string | null>(null);
	const [referrals, setReferrals] = useState<IReferral[]>([]);

	useEffect(() => {
		const fetchUserReferrals = async () => {
			if (!data) return;
			try {
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
			{/* bonus programs list */}
			<BonusPrograms />

			{/* referal qr code */}
			<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
				<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
					<QrCode className="size-5" />
					Sizning referral QR kodingiz
				</h2>
				<div className="text-sm text-gray-700 mb-2">
					<p>
						<strong>Doʻstlaringizni taklif qilish uchun ushbu QR kodni skaner qiling</strong>
					</p>
				</div>
				<div className="flex flex-col items-center justify-center">
					<QRCodeGenerator href={referralLink} />
					<Button variant="link" disabled={true}>
						{referralLink}
					</Button>
				</div>
				<div className="flex flex-wrap items-center justify-center mt-2 gap-2 md:flex-row">
					<RippleButton variant="outline" onClick={handleCopy}>
						<CopyCheck /> Nusxa olish
					</RippleButton>
					<RippleButton
						variant="outline"
						onClick={handleShare}
						disabled={!preparedMessageId}
						title={!preparedMessageId ? "Ulashish uchun hozircha referral tayyorlangan emas" : undefined}
					>
						<Forward /> Ulashish
					</RippleButton>
				</div>
			</div>

			{/* referrals block */}
			<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
				<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
					<ReceiptText className="size-5" />
					Referallar
				</h2>
				{loading ? (
					<div className="flex flex-col items-center">
						<Loading />
					</div>
				) : (
					<div className="mt-2">
						<Table>
							<TableCaption>Sizning taklif qilingan referralaringiz.</TableCaption>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[100px]">Raqam</TableHead>
									<TableHead>Ism</TableHead>
									<TableHead>Statusi</TableHead>
									<TableHead>Sana</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{referrals.map((referral: IReferral) => (
									<TableRow key={referral.id}>
										<TableCell className="font-medium">{referral.phone}</TableCell>
										<TableCell>{referral.imya || "Nomaʼlum"}</TableCell>
										<TableCell>{referral.contract ? "Xarid qilgan" : "Xarid qilmagan"}</TableCell>
										<TableCell>{new Date(referral.chislo).toLocaleDateString("uz-UZ")}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</div>
	);
}
