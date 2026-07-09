"use client";

import type { DashboardData } from "@/lib/dashboard";
import { KpiCard } from "./kpi-card";
import { num, som } from "@/lib/dashboard-format";

export function KpiCards({ data, loading }: { data?: DashboardData; loading: boolean }) {
	const c = data?.cards;
	return (
		<div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
			<KpiCard
				label="Mijozlar"
				value={c && num(c.customers.value)}
				subtitle={c ? `${num(c.customers.verified)} tasdiqlangan` : undefined}
				deltaPct={c?.customers.deltaPct}
				direction={c?.customers.direction}
				note="Umumiy foydalanuvchilar"
				loading={loading}
			/>
			<KpiCard
				label="Yangi mijozlar (oy)"
				value={c && num(c.newThisMonth.value)}
				deltaPct={c?.newThisMonth.deltaPct}
				direction={c?.newThisMonth.direction}
				note="O'tgan oyga nisbatan"
				loading={loading}
			/>
			<KpiCard
				label="Sotuvlar (oy)"
				value={c && som(c.salesThisMonth.value)}
				subtitle={c ? `${num(c.salesThisMonth.count)} ta shartnoma` : undefined}
				deltaPct={c?.salesThisMonth.deltaPct}
				direction={c?.salesThisMonth.direction}
				note="O'tgan oyga nisbatan"
				loading={loading}
			/>
			<KpiCard
				label="Qoldiq to'lovlar"
				value={c && som(c.receivables.value)}
				deltaPct={c?.receivables.deltaPct}
				direction={c?.receivables.direction}
				invert
				note="Umumiy debitorlik"
				loading={loading}
			/>
			<KpiCard
				label="Muddati o'tgan"
				value={c && som(c.overdue.value)}
				subtitle={c ? `${num(c.overdue.count)} mijoz` : undefined}
				deltaPct={c?.overdue.deltaPct}
				direction={c?.overdue.direction}
				invert
				note="Kechiktirilgan to'lovlar"
				loading={loading}
			/>
			<KpiCard
				label="Faol shartnomalar"
				value={c && num(c.activeContracts.value)}
				deltaPct={c?.activeContracts.deltaPct}
				direction={c?.activeContracts.direction}
				note="Aktiv installment"
				loading={loading}
			/>
			<KpiCard
				label="Последний визит (Ha)"
				value={c && num(c.lastVisitTrue.value)}
				deltaPct={c?.lastVisitTrue.deltaPct}
				direction={c?.lastVisitTrue.direction}
				note="Shu oy tashrif buyurgan"
				loading={loading}
			/>
			<KpiCard
				label="Xarid qilmagan"
				value={c && num(c.contractFirstFalse.value)}
				deltaPct={c?.contractFirstFalse.deltaPct}
				direction={c?.contractFirstFalse.direction}
				invert
				note="Hali xarid qilmagan"
				loading={loading}
			/>
		</div>
	);
}
