"use client";

import * as React from "react";
import { RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "@/lib/dashboard";
import { KpiCards } from "./kpi-cards";
import { SalesChart } from "./sales-chart";
import { UserGrowthChart } from "@/components/user-growth-chart";
import { ActivationFunnel } from "./activation-funnel";
import { LoyaltyTiers } from "./loyalty-tiers";
import { PaymentsPanel } from "./payments-panel";
import { ReferralLeaderboard } from "./referral-leaderboard";
import { EngagementPanel } from "./engagement-panel";

function formatUpdated(iso?: string): string | null {
	if (!iso) return null;
	return new Date(iso).toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Tashkent"
	});
}

export function DashboardView() {
	const [data, setData] = React.useState<DashboardData | undefined>();
	const [loading, setLoading] = React.useState(true);
	const [refreshing, setRefreshing] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const load = React.useCallback(async (force: boolean) => {
		try {
			setError(null);
			if (force) setRefreshing(true);
			const res = await fetch(force ? "/api/dashboard?refresh=1" : "/api/dashboard");
			if (!res.ok) {
				setError("Ma'lumotlarni yuklashda xatolik");
				return;
			}
			const json = (await res.json()) as DashboardData;
			setData(json);
		} catch {
			setError("Ma'lumotlarni yuklashda xatolik");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	React.useEffect(() => {
		load(false);
	}, [load]);

	return (
		<div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
			{error && <p className="px-4 text-sm text-destructive lg:px-6">{error}</p>}

			<div className="flex items-center justify-start gap-3 px-4 lg:px-6">
				<Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading || refreshing}>
					<RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
					Yangilash
				</Button>
				{formatUpdated(data?.generatedAt) && (
					<Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground">
						<Clock />
						Yangilangan: {formatUpdated(data?.generatedAt)}
					</Badge>
				)}
			</div>

			<KpiCards data={data} loading={loading} />

			<div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<SalesChart data={data?.monthlySales} loading={loading} />
				<UserGrowthChart />
			</div>

			<div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
				<ActivationFunnel funnel={data?.funnel} loading={loading} />
				<LoyaltyTiers tiers={data?.tiers} loading={loading} />
				<PaymentsPanel payments={data?.payments} loading={loading} />
			</div>

			<div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<ReferralLeaderboard referrals={data?.referrals} loading={loading} />
				<EngagementPanel data={data} loading={loading} />
			</div>
		</div>
	);
}
