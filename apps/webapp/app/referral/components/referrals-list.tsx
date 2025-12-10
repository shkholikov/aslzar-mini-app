"use client";

import { SectionCard } from "@/components/common/section-card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loading } from "@/components/common/loading";
import { Users } from "lucide-react";

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
}

export function ReferralsList({ referrals, loading }: ReferralsListProps) {
	return (
		<SectionCard icon={Users} title="Referallar">
			<div className="mt-2">
				{loading ? (
					<Loading />
				) : (
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
				)}
			</div>
		</SectionCard>
	);
}
