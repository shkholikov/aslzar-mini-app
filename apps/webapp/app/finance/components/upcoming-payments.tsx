/* eslint-disable @typescript-eslint/no-explicit-any */
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { ClockAlert } from "lucide-react";
import { Loading } from "@/components/common/loading";

interface ScheduleItem {
	status: boolean;
	step: number;
	date: string;
	sumToPay: number;
	sumPayed: number;
}

interface ContractWithSchedule {
	id?: string | number;
	contractId?: string | number;
	schedule?: ScheduleItem[];
	[key: string]: any;
}

interface UpcomingPaymentsProps {
	contracts: ContractWithSchedule[];
	loading: boolean;
}

interface UpcomingPayment {
	contractId: string | number;
	step: number;
	date: string;
	sumToPay: number;
	sumPayed: number;
}

function getUpcomingPayments(contracts: ContractWithSchedule[]): UpcomingPayment[] {
	const upcomingPayments: UpcomingPayment[] = [];

	contracts.forEach((contract) => {
		if (!contract.schedule || !Array.isArray(contract.schedule)) {
			return;
		}

		const contractId = contract.contractId || contract.id || "N/A";

		contract.schedule.forEach((item: ScheduleItem) => {
			if (item.status === false) {
				upcomingPayments.push({
					contractId,
					step: item.step,
					date: item.date,
					sumToPay: item.sumToPay,
					sumPayed: item.sumPayed
				});
			}
		});
	});

	return upcomingPayments;
}

export function UpcomingPayments({ contracts, loading }: UpcomingPaymentsProps) {
	if (loading) return <Loading />;

	const upcomingPayments = getUpcomingPayments(contracts);

	if (upcomingPayments.length === 0) return null;

	return (
		<SectionCard iconImage="/icons/paper.png" title="Kutilayotgan to'lovlar">
			<div className="flex flex-wrap gap-2">
				{upcomingPayments.map((payment, idx) => (
					<div
						key={idx}
						className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[4px] bg-muted/50 bg-transparent rounded-4xl shadow-sm border-2 px-4 py-3 flex flex-col items-center gap-1"
					>
						<ClockAlert className="w-12 h-12 text-[#be9941]" />
						<div className="text-xs font-semibold text-center">Shartnoma {payment.contractId}</div>
						<div className="text-xs text-muted-foreground text-center">{payment.step}-to&apos;lov</div>
						<div className="text-xs text-muted-foreground text-center">
							{new Date(payment.date).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })}
						</div>
						<Badge variant="default" className="bg-[#be9941] text-white">
							{payment.sumToPay.toLocaleString("uz-UZ")} so&apos;m
						</Badge>
					</div>
				))}
			</div>
		</SectionCard>
	);
}
