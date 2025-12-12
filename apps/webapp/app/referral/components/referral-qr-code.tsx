"use client";

import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { QRCodeGenerator } from "./qrcode-generator";
import { CopyCheck, Forward, QrCode } from "lucide-react";

interface ReferralQRCodeProps {
	referralLink: string;
	preparedMessageId: string | null;
	onCopy: () => void;
	onShare: () => void;
}

export function ReferralQRCode({ referralLink, preparedMessageId, onCopy, onShare }: ReferralQRCodeProps) {
	return (
		<SectionCard icon={QrCode} title="Sizning referral QR kodingiz">
			<p className="mb-2">
				<strong>Doʻstlaringizni taklif qilish uchun ushbu QR kodni skaner qiling</strong>
			</p>
			<p className="mb-2 text-sm ">
				Har bir taklif qilingan mijoz uchun <strong className="text-foreground">10 000 so&apos;m</strong> bonus qo&apos;lga kiriting.
			</p>
			<div className="flex flex-col items-center justify-center">
				<QRCodeGenerator href={referralLink} />
				<Button variant="link" disabled={true}>
					{referralLink}
				</Button>
			</div>
			<div className="flex flex-wrap items-center justify-center mt-2 gap-2 md:flex-row">
				<RippleButton variant="outline" onClick={onCopy}>
					<CopyCheck /> Nusxa olish
				</RippleButton>
				<RippleButton
					variant="outline"
					onClick={onShare}
					disabled={!preparedMessageId}
					title={!preparedMessageId ? "Ulashish uchun hozircha referral tayyorlangan emas" : undefined}
				>
					<Forward /> Ulashish
				</RippleButton>
			</div>
		</SectionCard>
	);
}
