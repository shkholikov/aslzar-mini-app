"use client";

import type { DashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { num, som } from "@/lib/dashboard-format";

export function EngagementPanel({ data, loading }: { data?: DashboardData; loading: boolean }) {
	const e = data?.engagement;
	const bonus = data?.cards.bonusLiability.value;

	const active = e?.activeStatus ?? 0;
	const inactive = e?.inactiveStatus ?? 0;
	const total = active + inactive || 1;
	const activePct = Math.round((active / total) * 100);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Mijozlar faolligi</CardTitle>
				<CardDescription>Aktivlik va bonus majburiyati</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				{loading || !e ? (
					<Skeleton className="h-32 w-full" />
				) : (
					<>
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-1.5">
									<span className="size-2.5 rounded-full" style={{ backgroundColor: "#2563EB" }} />
									Faol <span className="font-semibold tabular-nums">{num(active)}</span>
								</span>
								<span className="flex items-center gap-1.5">
									<span className="text-muted-foreground">Aktiv emas</span>
									<span className="font-semibold tabular-nums">{num(inactive)}</span>
									<span className="size-2.5 rounded-full bg-muted" />
								</span>
							</div>
							<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
								<div className="h-full rounded-full" style={{ width: `${activePct}%`, backgroundColor: "#2563EB" }} />
							</div>
							<span className="text-xs text-muted-foreground">Faollik darajasi: {activePct}%</span>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-0.5">
								<span className="text-xs text-muted-foreground">Shu oy tashrif</span>
								<span className="text-lg font-semibold tabular-nums">{num(e.lastVisitTrue)}</span>
							</div>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs text-muted-foreground">Bonus qoldiq</span>
								<span className="text-lg font-semibold tabular-nums">{bonus != null ? som(bonus) : "—"}</span>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
