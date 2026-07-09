"use client";

import { Pie, PieChart, Cell } from "recharts";
import type { DashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { num } from "@/lib/dashboard-format";

const chartConfig = {
	Silver: { label: "Silver", color: "#93C5FD" },
	Gold: { label: "Gold", color: "#3B82F6" },
	Diamond: { label: "Diamond", color: "#1D4ED8" },
	other: { label: "Boshqa", color: "#CBD5E1" }
} satisfies ChartConfig;

const KEYS: (keyof DashboardData["tiers"])[] = ["Silver", "Gold", "Diamond", "other"];

export function LoyaltyTiers({ tiers, loading }: { tiers?: DashboardData["tiers"]; loading: boolean }) {
	const data = tiers ? KEYS.map((key) => ({ key, value: tiers[key] })).filter((d) => d.value > 0) : [];

	return (
		<Card className="flex flex-col">
			<CardHeader>
				<CardTitle>Sadoqat darajalari</CardTitle>
				<CardDescription>Silver / Gold / Diamond</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-4">
				{loading || !tiers ? (
					<Skeleton className="mx-auto size-[200px] rounded-full" />
				) : (
					<>
						<div className="flex justify-center">
							<ChartContainer config={chartConfig} className="h-[220px] w-[220px]">
								<PieChart>
									<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
									<Pie data={data} dataKey="value" nameKey="key" innerRadius={55} outerRadius={95} strokeWidth={2}>
										{data.map((d) => (
											<Cell key={d.key} fill={`var(--color-${d.key})`} />
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
						</div>
						<div className="flex flex-wrap justify-center gap-3 text-sm">
							{KEYS.map((key) => (
								<div key={key} className="flex items-center gap-1.5">
									<span className="size-2.5 rounded-full" style={{ backgroundColor: `var(--color-${key})` }} />
									<span className="text-muted-foreground">{chartConfig[key].label}</span>
									<span className="font-medium tabular-nums">{num(tiers[key])}</span>
								</div>
							))}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
