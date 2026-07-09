"use client";

import type { DashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { num, som } from "@/lib/dashboard-format";

function Row({ label, primary, secondary }: { label: string; primary: string; secondary?: string }) {
	return (
		<div className="flex items-center justify-between gap-2 border-b py-3 last:border-0">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-right text-sm font-medium tabular-nums">
				{primary}
				{secondary && <span className="block text-xs font-normal text-muted-foreground">{secondary}</span>}
			</span>
		</div>
	);
}

export function PaymentsPanel({ payments, loading }: { payments?: DashboardData["payments"]; loading: boolean }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>To&apos;lovlar va yig&apos;im</CardTitle>
				<CardDescription>Muddati o&apos;tgan va kutilayotgan to&apos;lovlar</CardDescription>
			</CardHeader>
			<CardContent>
				{loading || !payments ? (
					<Skeleton className="h-40 w-full" />
				) : (
					<div className="flex flex-col">
						<Row label="Muddati o'tgan" primary={som(payments.overdue.amount)} secondary={`${num(payments.overdue.count)} mijoz`} />
						<Row label="7 kun ichida" primary={som(payments.due7.amount)} secondary={`${num(payments.due7.count)} to'lov`} />
						<Row label="30 kun ichida" primary={som(payments.due30.amount)} secondary={`${num(payments.due30.count)} to'lov`} />
						<Row
							label="Eslatmalar (30 kun)"
							primary={`${num(payments.reminders.sent)} yuborilgan`}
							secondary={payments.reminders.failed > 0 ? `${num(payments.reminders.failed)} xato` : undefined}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
