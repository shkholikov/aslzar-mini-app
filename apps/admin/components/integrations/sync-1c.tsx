"use client";

import * as React from "react";
import { Bot, CheckCircle2, RefreshCw, User as UserIcon, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Sync1CJob {
	_id?: string;
	status: "processing" | "completed" | "failed";
	triggeredBy?: "cron" | "admin";
	createdAt?: string;
	startedAt?: string;
	completedAt?: string;
	totalUsers?: number;
	usersWith1CDataCount?: number;
	syncedCount?: number;
	errorCount?: number;
	error?: string;
}

interface SyncListResponse {
	ok: boolean;
	jobs: Sync1CJob[];
}

const POLL_INTERVAL_MS = 5000;
const HISTORY_PAGE_SIZE = 10;

export function useSync1CState() {
	const [jobs, setJobs] = React.useState<Sync1CJob[]>([]);
	const [loaded, setLoaded] = React.useState(false);
	const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

	const latest = jobs.length > 0 ? jobs[0] : null;
	const isRunning = latest?.status === "processing";

	const refresh = React.useCallback(async () => {
		try {
			const res = await fetch("/api/sync-1c", { cache: "no-store" });
			if (!res.ok) return;
			const data: SyncListResponse = await res.json();
			setJobs(Array.isArray(data.jobs) ? data.jobs : []);
		} catch {
			// ignore — UI keeps last successful state
		} finally {
			setLoaded(true);
		}
	}, []);

	const startSync = React.useCallback(async () => {
		try {
			const res = await fetch("/api/sync-1c", { method: "POST" });
			// 409 (already running) is not really an error from the user's perspective —
			// they pressed the button, the sync is in progress, just refresh state.
			if (res.status === 409 || res.ok) {
				await refresh();
				return;
			}
			const data = await res.json().catch(() => ({}));
			console.error("[Sync1C] start failed:", data.error || res.statusText);
		} catch (err) {
			console.error("[Sync1C] start failed:", err);
		}
	}, [refresh]);

	React.useEffect(() => {
		refresh();
	}, [refresh]);

	React.useEffect(() => {
		if (isRunning && !pollingRef.current) {
			pollingRef.current = setInterval(refresh, POLL_INTERVAL_MS);
		} else if (!isRunning && pollingRef.current) {
			clearInterval(pollingRef.current);
			pollingRef.current = null;
		}
	}, [isRunning, refresh]);

	React.useEffect(() => {
		return () => {
			if (pollingRef.current) clearInterval(pollingRef.current);
		};
	}, []);

	return { jobs, latest, isRunning, startSync, refresh, loaded };
}

export function Sync1CTriggerButton({ isRunning, onClick }: { isRunning: boolean; onClick: () => void }) {
	return (
		<Button type="button" onClick={onClick} disabled={isRunning} className="shrink-0">
			<RefreshCw className={`mr-2 h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
			{isRunning ? "Sinxronlanmoqda..." : "Hozir sinxronlash"}
		</Button>
	);
}

export function Sync1CLatestCard({ latest, isRunning, onSync }: { latest: Sync1CJob | null; isRunning: boolean; onSync: () => void }) {
	return (
		<div className="rounded-lg border border-border bg-card p-5 shadow-sm">
			<div className="mb-4">
				<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Oxirgi sinxronlash</h3>
			</div>

			{latest ? (
				<dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
					<MetaRow label="Kim boshladi" value={triggeredByText(latest.triggeredBy)} />
					<MetaRow label="Status">
						<StatusBadge status={latest.status} />
					</MetaRow>
					<MetaRow label="Boshlangan" value={formatDateTime(latest.startedAt ?? latest.createdAt)} />
					<MetaRow label="Tugagan" value={latest.completedAt ? formatDateTime(latest.completedAt) : "—"} />
					<MetaRow label="Jami foydalanuvchilar" value={String(latest.totalUsers ?? 0)} />
					<MetaRow
						label="1C ma'lumoti mavjud foydalanuvchilar"
						value={typeof latest.usersWith1CDataCount === "number" ? String(latest.usersWith1CDataCount) : "—"}
					/>
					<MetaRow label="Sinxronlangan" value={String(latest.syncedCount ?? 0)} />
					<MetaRow label="Xatoliklar" value={String(latest.errorCount ?? 0)} />
				</dl>
			) : (
				<p className="text-sm text-muted-foreground">Hech qachon sinxronlanmagan.</p>
			)}

			{latest?.status === "failed" && latest.error ? (
				<div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
					<span className="font-medium">Xatolik xabari: </span>
					{latest.error}
				</div>
			) : null}

			<div className="mt-5">
				<Sync1CTriggerButton isRunning={isRunning} onClick={onSync} />
			</div>
		</div>
	);
}

export function Sync1CHistoryTable({ jobs }: { jobs: Sync1CJob[] }) {
	const [pageIndex, setPageIndex] = React.useState(0);

	const total = jobs.length;
	const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
	const safePageIndex = Math.min(pageIndex, pageCount - 1);
	const start = safePageIndex * HISTORY_PAGE_SIZE;
	const end = Math.min(start + HISTORY_PAGE_SIZE, total);
	const pageRows = jobs.slice(start, end);

	const canPrev = safePageIndex > 0;
	const canNext = safePageIndex < pageCount - 1;

	return (
		<div className="w-full">
			<div className="overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Sana</TableHead>
							<TableHead>Kim boshladi</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Jami foydalanuvchilar</TableHead>
							<TableHead className="text-right">1C ma&apos;lumoti mavjud foydalanuvchilar</TableHead>
							<TableHead className="text-right">Sinxronlangan</TableHead>
							<TableHead className="text-right">Xatoliklar</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{pageRows.length > 0 ? (
							pageRows.map((job, i) => (
								<TableRow key={job._id ?? `${start + i}`}>
									<TableCell className="whitespace-nowrap">{formatDateTime(job.startedAt ?? job.createdAt)}</TableCell>
									<TableCell>
										<span className="inline-flex items-center gap-1.5 text-sm">
											{job.triggeredBy === "cron" ? (
												<Bot className="h-3.5 w-3.5 text-muted-foreground" />
											) : (
												<UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
											)}
											{triggeredByText(job.triggeredBy)}
										</span>
									</TableCell>
									<TableCell>
										<StatusBadge status={job.status} />
									</TableCell>
									<TableCell className="text-right tabular-nums">{job.totalUsers ?? 0}</TableCell>
									<TableCell className="text-right tabular-nums">
										{typeof job.usersWith1CDataCount === "number" ? job.usersWith1CDataCount : "—"}
									</TableCell>
									<TableCell className="text-right tabular-nums">{job.syncedCount ?? 0}</TableCell>
									<TableCell className="text-right tabular-nums">{job.errorCount ?? 0}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									Natijalar topilmadi.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<span className="text-muted-foreground text-sm">
					{total === 0 ? 0 : start + 1}-{end} / {total}
				</span>
				<Button variant="outline" size="sm" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={!canPrev}>
					Oldingi
				</Button>
				<Button variant="outline" size="sm" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={!canNext}>
					Keyingi
				</Button>
			</div>
		</div>
	);
}

function MetaRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="font-medium text-foreground">{children ?? value ?? "—"}</dd>
		</div>
	);
}

function StatusBadge({ status }: { status: Sync1CJob["status"] | null }) {
	if (!status) return <Badge variant="secondary">—</Badge>;
	if (status === "processing") {
		return (
			<Badge variant="secondary" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-900">
				<RefreshCw className="h-3 w-3 animate-spin" />
				Sinxronlanmoqda
			</Badge>
		);
	}
	if (status === "completed") {
		return (
			<Badge variant="secondary" className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-900">
				<CheckCircle2 className="h-3 w-3" />
				Yakunlandi
			</Badge>
		);
	}
	return (
		<Badge variant="secondary" className="gap-1.5 border-rose-300 bg-rose-50 text-rose-900">
			<XCircle className="h-3 w-3" />
			Xatolik
		</Badge>
	);
}

function triggeredByText(by?: string): string {
	if (by === "cron") return "Avtomatik (cron)";
	if (by === "admin") return "Admin";
	return "—";
}

function formatDateTime(iso?: string): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return "—";
	return new Intl.DateTimeFormat("uz-UZ", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		timeZone: "Asia/Tashkent"
	}).format(d);
}
