"use client";

import type { DashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { num } from "@/lib/dashboard-format";

export function ReferralLeaderboard({ referrals, loading }: { referrals?: DashboardData["referrals"]; loading: boolean }) {
	const rows = referrals?.top ?? [];
	const max = Math.max(...rows.map((r) => r.count), 1);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Referral kanali</CardTitle>
				<CardDescription>
					{referrals ? `${num(referrals.totalReferred)} mijoz · ${referrals.ratePct}%` : "Xodimlar bo'yicha jalb qilingan mijozlar"}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{loading || !referrals ? (
					<Skeleton className="h-48 w-full" />
				) : rows.length === 0 ? (
					<p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
				) : (
					<div className="flex flex-col gap-3">
						{rows.map((e, i) => (
							<div key={e.code} className="flex flex-col gap-1">
								<div className="flex items-center justify-between gap-2 text-sm">
									<span className="flex min-w-0 items-center gap-2">
										<span className="w-4 text-right text-xs text-muted-foreground">{i + 1}</span>
										<span className="truncate font-medium">{e.name}</span>
									</span>
									<span className="font-semibold tabular-nums">{num(e.count)}</span>
								</div>
								<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full"
										style={{ width: `${Math.round((e.count / max) * 100)}%`, backgroundColor: "#2563EB" }}
									/>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
