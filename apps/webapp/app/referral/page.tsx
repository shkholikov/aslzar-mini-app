"use client";

import { Header } from "@/components/common/header";
import { Loading } from "@/components/common/loading";
import { QRCodeGenerator } from "@/components/common/qrcode";
import { Button } from "@/components/ui/button";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { CopyCheck, Forward, QrCode, Users } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

export default function ReferralPage() {
	const tg = useTelegram();
	const { data, loading } = useUser();

	// Memoize referral link for stable reference
	const referralLink = useMemo(() => {
		if (!tg?.initDataUnsafe?.user?.id) return "https://t.me/aslzardevbot";
		return `https://t.me/aslzardevbot?start=${tg.initDataUnsafe.user.id}`;
	}, [tg]);

	// Memoize preparedMessageId to simplify sharing logic and safe access
	const preparedMessageId = useMemo(() => data?.tgData?.preparedMessageId, [data]);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(referralLink);
		toast.success("Referral link nusxasi olindi!");
	}, [referralLink]);

	const handleShare = useCallback(() => {
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
			{!loading ? (
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
			) : (
				<div className="flex flex-col items-center">
					<Loading />
				</div>
			)}
		</div>
	);
}
