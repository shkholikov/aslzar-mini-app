import { SectionCard } from "@/components/common/section-card";
import { ListGroup, type ListGroupRow } from "@/components/common/list-group";
import { formatSom } from "@/lib/format";
import { format1CDate } from "@/lib/format1cDate";
import { daysLeftLabel, getUpcomingPayments, type Contract1C } from "@/lib/payments";

interface UpcomingPaymentsProps {
	contracts: Contract1C[];
}

/** This month's unpaid instalments of active contracts, one full-width row each. */
export function UpcomingPayments({ contracts }: UpcomingPaymentsProps) {
	const upcomingPayments = getUpcomingPayments(contracts);

	if (upcomingPayments.length === 0) return null;

	const rows: ListGroupRow[] = upcomingPayments.map((payment) => ({
		id: `${payment.contractId}-${payment.step}`,
		title: <span className="text-[17px] font-bold">{formatSom(payment.left)} so&apos;m</span>,
		subtitle: `${format1CDate(payment.date, { day: "numeric", month: "long" })} · Shartnoma ${payment.contractId} · ${payment.step}-to'lov`,
		badge: daysLeftLabel(payment.daysLeft)
	}));

	// Matches REMINDER_DAYS (0, 3, 5) in apps/bot/src/scheduler.ts.
	rows.push({
		id: "reminder-note",
		title: (
			<span className="text-xs font-normal text-muted-foreground">
				Bot to&apos;lovdan 5 va 3 kun oldin hamda to&apos;lov kuni eslatadi.
			</span>
		)
	});

	return (
		<SectionCard iconImage="/icons/paper.webp" title="Kutilayotgan to'lovlar" bare>
			<ListGroup rows={rows} className="m-0" />
		</SectionCard>
	);
}
