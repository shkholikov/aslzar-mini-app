"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Megaphone, ArrowLeft, Loader2 } from "lucide-react";
import type { BroadcastJobDoc } from "@/lib/db";

export default function BroadcastPage() {
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [jobs, setJobs] = useState<BroadcastJobDoc[]>([]);
	const [loadingJobs, setLoadingJobs] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchJobs = useCallback(async () => {
		try {
			const res = await fetch("/api/broadcast");
			if (!res.ok) throw new Error("Failed to load broadcasts");
			const data = await res.json();
			setJobs(data.jobs || []);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoadingJobs(false);
		}
	}, []);

	useEffect(() => {
		fetchJobs();
		const interval = setInterval(fetchJobs, 10000); // refresh every 10s
		return () => clearInterval(interval);
	}, [fetchJobs]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const text = message.trim();
		if (!text || sending) return;
		setSending(true);
		setError(null);
		try {
			const res = await fetch("/api/broadcast", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: text })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to create broadcast");
			setMessage("");
			setJobs((prev) => [data.job, ...prev]);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setSending(false);
		}
	}

	function formatDate(d: Date | string) {
		const date = typeof d === "string" ? new Date(d) : d;
		return new Intl.DateTimeFormat("uz-UZ", {
			dateStyle: "short",
			timeStyle: "short"
		}).format(date);
	}

	function statusLabel(status: BroadcastJobDoc["status"]) {
		const map: Record<string, string> = {
			pending: "Kutilmoqda",
			processing: "Yuborilmoqda",
			completed: "Tugallandi",
			failed: "Xatolik"
		};
		return map[status] ?? status;
	}

	return (
		<main className="flex min-h-screen w-full container flex-col py-8 px-4">
			<div className="w-full max-w-2xl mx-auto">
				<div className="flex items-center gap-4 pb-4">
					<Link href="/">
						<Button variant="ghost" size="icon" aria-label="Orqaga">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div className="flex items-center gap-2">
						<Megaphone className="w-10 h-10 text-gray-800" />
						<div>
							<h1 className="text-2xl text-gray-800 font-semibold">Broadcast</h1>
							<p className="text-sm text-gray-600">Barcha foydalanuvchilarga xabar yuborish</p>
						</div>
					</div>
				</div>
				<Separator className="mb-6" />

				<form onSubmit={handleSubmit} className="space-y-4 mb-8">
					<label className="block text-sm font-medium text-gray-700" htmlFor="message">
						Xabar matni
					</label>
					<textarea
						id="message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Yubormoqchi bo'lgan xabaringizni yozing..."
						rows={5}
						className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground disabled:opacity-50"
						disabled={sending}
					/>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<Button type="submit" disabled={sending || !message.trim()}>
						{sending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Yuborilmoqda...
							</>
						) : (
							"Yuborish"
						)}
					</Button>
				</form>

				<div>
					<h2 className="text-lg font-medium text-gray-800 mb-3">So'nggi broadcastlar</h2>
					{loadingJobs ? (
						<p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
					) : jobs.length === 0 ? (
						<p className="text-sm text-muted-foreground">Hali broadcastlar yo'q.</p>
					) : (
						<ul className="space-y-3">
							{jobs.map((job) => (
								<li
									key={String(job._id)}
									className="rounded-lg border border-border bg-card p-4 text-card-foreground"
								>
									<div className="flex justify-between items-start gap-2 mb-2">
										<span
											className={`text-xs font-medium px-2 py-0.5 rounded ${
												job.status === "completed"
													? "bg-green-100 text-green-800"
													: job.status === "failed"
														? "bg-red-100 text-red-800"
														: job.status === "processing"
															? "bg-blue-100 text-blue-800"
															: "bg-gray-100 text-gray-800"
											}`}
										>
											{statusLabel(job.status)}
										</span>
										<span className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
									</div>
									<p className="text-sm whitespace-pre-wrap break-words">{job.message}</p>
									{(job.sentCount !== undefined || job.failedCount !== undefined) && (
										<p className="text-xs text-muted-foreground mt-2">
											Yuborildi: {job.sentCount ?? 0}, xatolik: {job.failedCount ?? 0}
											{job.totalUsers != null && ` (jami: ${job.totalUsers})`}
										</p>
									)}
									{job.error && <p className="text-xs text-destructive mt-1">{job.error}</p>}
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</main>
	);
}
