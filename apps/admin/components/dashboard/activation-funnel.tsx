"use client";

import type { DashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { num } from "@/lib/dashboard-format";

export function ActivationFunnel({ funnel, loading }: { funnel?: DashboardData["funnel"]; loading: boolean }) {
	const steps = funnel
		? [
				{ label: "Ro'yxatdan o'tgan", value: funnel.registered },
				{ label: "Tasdiqlangan", value: funnel.verified },
				{ label: "Xarid qilgan", value: funnel.purchased }
			]
		: [];
	const max = funnel ? Math.max(funnel.registered, 1) : 1;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Aktivatsiya bosqichlari</CardTitle>
				<CardDescription>Ro&apos;yxat → Tasdiq → Xarid</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{loading || !funnel ? (
					<Skeleton className="h-32 w-full" />
				) : (
					steps.map((s, i) => {
						const pct = Math.round((s.value / max) * 100);
						const conv = i === 0 ? null : steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : 0;
						return (
							<div key={s.label} className="flex flex-col gap-1">
								<div className="flex items-center justify-between text-sm">
									<span className="font-medium">{s.label}</span>
									<span className="tabular-nums">
										{num(s.value)}
										{conv != null && <span className="text-muted-foreground"> · {conv}%</span>}
									</span>
								</div>
								<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#2563EB" }} />
								</div>
							</div>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}
