"use client";

import * as React from "react";
import { Users, CheckCircle, XCircle, Calendar, Eye, ShoppingBag } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminStats } from "@/lib/db";

const CARDS: { key: keyof AdminStats; label: string; icon: React.ElementType }[] = [
	{ key: "totalUsers", label: "Umumiy foydalanuvchilar", icon: Users },
	{ key: "verified", label: "Tasdiqlangan", icon: CheckCircle },
	{ key: "nonVerified", label: "Tasdiqlanmagan", icon: XCircle },
	{ key: "currentMonthUsers", label: "Joriy oy kelgan foydalanuvchilar", icon: Calendar },
	{ key: "lastVisitTrue", label: "Последний визит (Ha)", icon: Eye },
	{ key: "contractFirstFalse", label: "Xarid qilmagan", icon: ShoppingBag }
];

export function SectionCards() {
	const [stats, setStats] = React.useState<AdminStats | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		async function fetchStats() {
			try {
				setError(null);
				const res = await fetch("/api/stats");
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					setError(data.error || "Statistikani yuklashda xatolik");
					return;
				}
				const data = await res.json();
				if (!cancelled) setStats(data);
			} catch {
				if (!cancelled) setError("Statistikani yuklashda xatolik");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		fetchStats();
		return () => {
			cancelled = true;
		};
	}, []);

	if (error) {
		return <p className="px-4 text-sm text-destructive lg:px-6">{error}</p>;
	}

	return (
		<div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 lg:px-6">
			{CARDS.map(({ key, label, icon: Icon }) => (
				<Card key={key} className="@container/card">
					<CardHeader>
						<CardDescription className="flex items-center gap-2">
							<Icon className="size-4" />
							{label}
						</CardDescription>
						<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{loading || !stats ? <Skeleton className="h-8 w-20" /> : stats[key].toLocaleString("ru-RU")}
						</CardTitle>
					</CardHeader>
				</Card>
			))}
		</div>
	);
}
