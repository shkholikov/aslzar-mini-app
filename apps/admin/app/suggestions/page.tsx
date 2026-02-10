"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { MessageSquare } from "lucide-react";
import type { SuggestionDoc } from "@/lib/db";
import { Loading } from "@/components/common/loading";
import { AdminGuard } from "@/components/common/admin-guard";

export default function SuggestionsPage() {
	const [suggestions, setSuggestions] = useState<SuggestionDoc[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchSuggestions() {
			try {
				const res = await fetch("/api/suggestions");
				if (!res.ok) throw new Error("Failed to load suggestions");
				const data = await res.json();
				setSuggestions(data.suggestions || []);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		}
		fetchSuggestions();
	}, []);

	function formatDate(d: Date | string) {
		const date = typeof d === "string" ? new Date(d) : d;
		return new Intl.DateTimeFormat("uz-UZ", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(date);
	}

	function userLabel(s: SuggestionDoc) {
		const parts: string[] = [];
		if (s.firstName) parts.push(s.firstName);
		if (s.lastName) parts.push(s.lastName);
		if (s.username) parts.push(`@${s.username}`);
		if (s.userId) parts.push(`(ID: ${s.userId})`);
		return parts.length ? parts.join(" ") : "Anonim";
	}

	return (
		<AdminGuard>
			<main className="flex min-h-screen w-full container flex-col py-8 px-4">
				<div className="w-full max-w-3xl mx-auto">
					<div className="flex items-center gap-2 pb-4">
						<MessageSquare className="w-10 h-10 text-gray-800" />
						<div>
							<h1 className="text-2xl text-gray-800 font-semibold">Takliflar va shikoyatlar</h1>
							<p className="text-sm text-gray-600">Foydalanuvchilardan kelgan xabarlar</p>
						</div>
					</div>
					<Separator className="mb-6" />

					{error && <p className="text-sm text-destructive mb-4">{error}</p>}

					{loading ? (
						<Loading />
					) : suggestions.length === 0 ? (
						<p className="text-muted-foreground">Hali takliflar yo&apos;q.</p>
					) : (
						<ul className="space-y-4">
							{suggestions.map((s) => (
								<li
									key={String(s._id)}
									className="rounded-lg border border-border bg-card p-4 text-card-foreground"
								>
									<p className="text-sm whitespace-pre-wrap break-words">{s.text}</p>
									<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
										<span>{userLabel(s)}</span>
										<span>{formatDate(s.createdAt)}</span>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</main>
		</AdminGuard>
	);
}
