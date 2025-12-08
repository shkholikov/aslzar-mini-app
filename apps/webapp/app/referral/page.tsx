"use client";

import { Header } from "@/components/common/header";
import { Loading } from "@/components/common/loading";
import { QRCodeGenerator } from "@/components/common/qrcode-generator";
import { Button } from "@/components/ui/button";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { CopyCheck, Forward, QrCode, ReceiptText, Trophy, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface IBonusProgram {
	uroven: string;
	nachislenie: number;
	spisanie: number;
	nachislenieVSrok: number;
	perexod: number;
}

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

const programs = {
	"Silver": {
		"title": "Silver🥈",
		"description": "Silver🥈 — bu boshlang‘ich bonus darajasi.",
		"benefits": [
			"Mijoz qarzni to‘laganda 4% bonus oladi",
			"To‘lovni o‘z vaqtida amalga oshirsa — 3% qo‘shimcha bonus beriladi",
			"Yangi shartnoma tuzishda bonuslarning 7% gacha qismini ishlatish mumkin"
		],
		"requirement": "Bu darajaga o‘tish uchun hech qanday aylanma talab qilinmaydi."
	},
	"Gold": {
		"title": "Gold🥇",
		"description": "Gold🥇 — faol mijozlar uchun yuqori bonus darajasi.",
		"benefits": [
			"Qarzni to‘laganda 6% bonus beriladi",
			"O‘z vaqtida to‘lov uchun yana 5% bonus beriladi",
			"Yangi shartnoma bo‘yicha 7% gacha bonusni chegirma sifatida ishlatish mumkin"
		],
		"requirement": "Gold darajasiga o‘tish uchun mijozning umumiy aylanishi 1501 dan yuqori bo‘lishi kerak."
	},
	"Diamond": {
		"title": "Diamond💎",
		"description": "Diamond💎 — eng yuqori va eng foydali bonus darajasi.",
		"benefits": [
			"Qarzni to‘lashda 9% bonus beriladi",
			"O‘z vaqtida to‘lovda qo‘shimcha 8% bonus beriladi",
			"Yangi shartnoma bo‘yicha 7% gacha bonuslarni ishlatish mumkin"
		],
		"requirement": "Diamond darajasi uchun talab qilinadigan aylanish miqdori — 3001 dan yuqori."
	}
};

export default function ReferralPage() {
	const tg = useTelegram();
	const { data, loading } = useUser();
	const [dataLoaded, setDataLoaded] = useState(false);
	const [bonusProgramList, setBonusProgramList] = useState<IBonusProgram[]>([]);
	const [preparedMessageId, setPreparedMessageId] = useState<string | null>(null);
	const [referrals, setReferrals] = useState<IReferral[]>([]);

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
			setDataLoaded(true);
		} catch (error) {
			console.error("Error fetching bonus programs data from 1C:", error);
		}
	};

	const fetchUserReferrals = async () => {
		if (!data) return;
		try {
			const clientId = data.clientId;
			console.log(clientId);

			const response = await fetch(`/api/referral?clientId=${clientId}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch referrals data: ${response.status}`);
			}

			const referralsData = await response.json();
			setReferrals(referralsData?.list);
		} catch (error) {
			console.error("Error fetching user's referrals data from 1C:", error);
		}
	};

	useEffect(() => {
		fetchUserReferrals();
		fetchBonusProgramData();
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
		const referralMsg = `ASLZAR💎 platformasiga qo‘shiling!\n\n🔗 Mening taklif havolam orqali ro‘yxatdan o‘tishingiz mumkin:\n\n${referralLink}`;
		navigator.clipboard.writeText(referralMsg);
		toast.success("Referral link nusxasi olindi!");
	}, [referralLink]);

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
				description="Sizning referal link va do‘stlaringizni taklif qilib, qanday foyda olishingiz mumkinligi shu yerda ko‘rsatiladi."
				icon={Users}
			/>
			{dataLoaded ? (
				<>
					{/* bonus programs list */}
					<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
						<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
							<Trophy className="size-5" />
							Bonus darajalari
						</h2>

						<Tabs defaultValue={bonusProgramList[0].uroven} className="w-full items-center">
							<TabsList>
								{bonusProgramList.map((program) => (
									<TabsTrigger key={program.uroven} value={program.uroven} onClick={() => tg?.HapticFeedback?.impactOccurred("light")}>
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
					</div>
					{/* referal qr code */}
					<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
						<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
							<QrCode className="size-5" />
							Sizning referral QR kodingiz
						</h2>
						<div className="text-sm text-gray-700 mb-2">
							<p>
								<strong>Do‘stlaringizni taklif qilish uchun ushbu QR kodni skaner qiling</strong>
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
												<TableCell>{referral.imya}</TableCell>
												<TableCell>{referral.contract}</TableCell>
												<TableCell>{new Date(referral.chislo).toLocaleDateString("uz-UZ")}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</div>
				</>
			) : (
				<div className="flex flex-col items-center">
					<Loading />
				</div>
			)}
		</div>
	);
}
