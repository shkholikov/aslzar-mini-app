"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MonthlyGrowthPoint {
	month: string;
	users: number;
}

const chartConfig: ChartConfig = {
	users: {
		label: "Foydalanuvchilar",
		color: "#2563EB"
	}
};

export function UserGrowthChart() {
	const [data, setData] = React.useState<MonthlyGrowthPoint[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [timeRange, setTimeRange] = React.useState("12m");

	React.useEffect(() => {
		let cancelled = false;
		fetch("/api/charts")
			.then((r) => r.json())
			.then((d) => { if (!cancelled) setData(d.monthlyGrowth ?? []); })
			.catch(console.error)
			.finally(() => { if (!cancelled) setLoading(false); });
		return () => { cancelled = true; };
	}, []);

	const filteredData = React.useMemo(() => {
		const months = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
		return data.slice(-months);
	}, [data, timeRange]);

	return (
		<Card className="pt-0">
			<CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
				<div className="grid flex-1 gap-1">
					<CardTitle>Oylik o&apos;sish</CardTitle>
					<CardDescription>Yangi foydalanuvchilar soni oylar bo&apos;yicha</CardDescription>
				</div>
				<Select value={timeRange} onValueChange={setTimeRange}>
					<SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Vaqt oralig'ini tanlang">
						<SelectValue placeholder="12 oy" />
					</SelectTrigger>
					<SelectContent className="rounded-xl">
						<SelectItem value="12m" className="rounded-lg">So&apos;nggi 12 oy</SelectItem>
						<SelectItem value="6m" className="rounded-lg">So&apos;nggi 6 oy</SelectItem>
						<SelectItem value="3m" className="rounded-lg">So&apos;nggi 3 oy</SelectItem>
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				{loading ? (
					<div className="aspect-auto h-[250px] w-full animate-pulse rounded-md bg-gray-100" />
				) : (
					<ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
						<AreaChart data={filteredData}>
							<defs>
								<linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.8} />
									<stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.1} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="month"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tick={{ fontSize: 12 }}
							/>
							<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} width={36} />
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent indicator="dot" />}
							/>
							<Area
								dataKey="users"
								type="natural"
								fill="url(#fillUsers)"
								stroke="var(--color-users)"
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
