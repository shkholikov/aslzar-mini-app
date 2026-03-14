"use client";

import * as React from "react";
import { Users, CheckCircle, XCircle, Calendar } from "lucide-react";

interface AdminStats {
	totalUsers: number;
	verified: number;
	nonVerified: number;
	currentMonthUsers: number;
}

export function StatsCards() {
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

	if (loading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
						<div className="h-4 w-24 bg-muted rounded mb-2" />
						<div className="h-8 w-16 bg-muted rounded" />
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return <p className="text-sm text-destructive mb-4">{error}</p>;
	}

	if (!stats) return null;

	const cards = [
		{ label: "Umumiy foydalanuvchilar", value: stats.totalUsers, icon: Users, suffix: "ta" },
		{ label: "Tasdiqlangan", value: stats.verified, icon: CheckCircle, suffix: "ta" },
		{ label: "Tasdiqlanmagan", value: stats.nonVerified, icon: XCircle, suffix: "ta" },
		{ label: "Joriy oy kelgan foydalanuvchilar", value: stats.currentMonthUsers, icon: Calendar, suffix: "ta" }
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
			{cards.map(({ label, value, icon: Icon, suffix }) => (
				<div key={label} className="rounded-lg border bg-card p-4 shadow-sm">
					<div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
						<Icon className="h-4 w-4" />
						{label}
					</div>
					<p className="mt-2 text-2xl font-semibold text-foreground">
						{value} {suffix}
					</p>
				</div>
			))}
		</div>
	);
}
