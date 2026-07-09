"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
	value: { label: "Sotuv", color: "#2563EB" }
} satisfies ChartConfig;

function shortSom(v: number): string {
	if (v >= 1_000_000_000) return `${Math.round(v / 1_000_000_000)} mlrd`;
	if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} mln`;
	if (v >= 1_000) return `${Math.round(v / 1_000)} ming`;
	return `${v}`;
}

export function SalesChart({ data, loading }: { data?: { month: string; value: number; count: number }[]; loading: boolean }) {
	return (
		<Card className="pt-0">
			<CardHeader className="border-b py-5">
				<CardTitle>Oylik sotuvlar</CardTitle>
				<CardDescription>So&apos;nggi 12 oy shartnomalar qiymati</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				{loading || !data ? (
					<Skeleton className="h-[250px] w-full" />
				) : (
					<ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
						<AreaChart data={data}>
							<defs>
								<linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
									<stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12 }} />
							<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={52} tickFormatter={(v) => shortSom(Number(v))} />
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent indicator="dot" formatter={(v) => shortSom(Number(v)) + " so'm"} />}
							/>
							<Area dataKey="value" type="natural" fill="url(#fillSales)" stroke="var(--color-value)" />
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
