/* eslint-disable @typescript-eslint/no-explicit-any */
import { SectionCard } from "@/components/common/section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarClock, ClockAlert } from "lucide-react";
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

interface GroupedPayments {
	[contractId: string]: UpcomingPayment[];
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

function groupPaymentsByContract(payments: UpcomingPayment[]): GroupedPayments {
	return payments.reduce((acc, payment) => {
		const contractId = String(payment.contractId);
		if (!acc[contractId]) {
			acc[contractId] = [];
		}
		acc[contractId].push(payment);
		return acc;
	}, {} as GroupedPayments);
}

export function UpcomingPayments({ contracts, loading }: UpcomingPaymentsProps) {
	if (loading) return <Loading />;

	const upcomingPayments = getUpcomingPayments(contracts);

	if (upcomingPayments.length === 0) return null;

	const groupedPayments = groupPaymentsByContract(upcomingPayments);

	return (
		<SectionCard icon={CalendarClock} title="Kutilayotgan to'lovlar">
			<div className="mt-2 space-y-4">
				{Object.entries(groupedPayments).map(([contractId, payments]) => (
					<Alert key={contractId} variant="default" className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
						<ClockAlert />
						<AlertDescription className="text-amber-800 dark:text-amber-200">
							<div className="mb-3">
								<p className="font-semibold text-amber-900 dark:text-amber-100">
									Shartnoma {contractId} - {payments.length} ta kutilayotgan to&apos;lov
								</p>
							</div>
							<div className="space-y-3 pl-4 border-l-2 border-amber-300 dark:border-amber-700">
								{payments.map((payment, idx) => (
									<div key={idx} className="space-y-1">
										<p>
											{payment.step}-to&apos;lov:{" "}
											{new Date(payment.date).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })} sanasida muddati
											tugaydi.
										</p>
										<p>
											To&apos;lov summasi:{" "}
											<span className="font-semibold text-amber-700 dark:text-amber-300">{payment.sumToPay.toLocaleString("uz-UZ")} so&apos;m</span>
										</p>
										{idx < payments.length - 1 && <div className="border-t border-amber-200 dark:border-amber-800 pt-2 mt-2" />}
									</div>
								))}
							</div>
						</AlertDescription>
					</Alert>
				))}
			</div>
		</SectionCard>
	);
}
