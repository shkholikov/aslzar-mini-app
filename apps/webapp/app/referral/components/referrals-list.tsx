"use client";

import { SectionCard } from "@/components/common/section-card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loading } from "@/components/common/loading";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { RefreshCw } from "lucide-react";

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

interface ReferralsListProps {
	referrals: IReferral[];
	loading?: boolean;
	onReload?: () => void;
}

export function ReferralsList({ referrals, loading, onReload }: ReferralsListProps) {
	return (
		<SectionCard iconImage="/icons/user.png" title="Referallar">
			<div className="mt-2">
				{loading ? (
					<Loading />
				) : (
					<>
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
								{referrals.map((referral) => (
									<TableRow key={referral.id}>
										<TableCell className="font-medium">{referral.phone}</TableCell>
										<TableCell>{referral.imya || "Nomaʼlum"}</TableCell>
										<TableCell>{referral.contract ? "Xarid qilgan" : "Xarid qilmagan"}</TableCell>
										<TableCell>{new Date(referral.chislo).toLocaleDateString("uz-UZ")}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						{onReload && (
							<div className="mt-4 flex justify-center">
								<RippleButton onClick={onReload} variant="outline" size="sm">
									<RefreshCw className="size-4 text-[#be9941]" />
									Yangilash
								</RippleButton>
							</div>
						)}
					</>
				)}
			</div>
		</SectionCard>
	);
}
