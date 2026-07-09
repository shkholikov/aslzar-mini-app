"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Direction } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardProps {
	label: string;
	value?: string;
	subtitle?: string;
	deltaPct?: number | null;
	direction?: Direction;
	/** When true, a rising value is a concern (e.g. overdue, receivables) — flips the "good/bad" wording. */
	invert?: boolean;
	note?: string;
	loading?: boolean;
}

export function KpiCard({ label, value, subtitle, deltaPct, direction = "flat", invert = false, note, loading }: KpiCardProps) {
	const TrendIcon = direction === "down" ? TrendingDown : direction === "up" ? TrendingUp : Minus;
	const good = invert ? direction === "down" : direction === "up";
	const boldLine =
		deltaPct == null
			? null
			: direction === "flat"
				? "Barqaror"
				: good
					? invert
						? "Yaxshilanmoqda"
						: "O'sish kuzatilmoqda"
					: invert
						? "E'tibor talab qiladi"
						: "Pasayish kuzatilmoqda";

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					{loading || value == null ? <Skeleton className="h-8 w-28" /> : value}
				</CardTitle>
				{subtitle && !loading && <span className="text-xs text-muted-foreground">{subtitle}</span>}
				{deltaPct != null && (
					<CardAction>
						<Badge variant="outline">
							<TrendIcon />
							{deltaPct > 0 ? "+" : ""}
							{deltaPct}%
						</Badge>
					</CardAction>
				)}
			</CardHeader>
			<CardFooter className="flex-col items-start gap-1.5 text-sm">
				{boldLine && (
					<div className="line-clamp-1 flex gap-2 font-medium">
						{boldLine} <TrendIcon className="size-4" />
					</div>
				)}
				{note && <div className="text-muted-foreground">{note}</div>}
			</CardFooter>
		</Card>
	);
}
