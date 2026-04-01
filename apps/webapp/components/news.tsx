"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/common/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegram } from "@/hooks/useTelegram";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { ExternalLink } from "lucide-react";
import { goldButtonClass } from "@/components/common/button-variants";
import Image from "next/image";

interface NewsItem {
	id: string;
	title: string;
	link: string;
	pubDate: string;
	description: string;
	imageUrl: string | null;
	videoUrl: string | null;
	buttonText?: string | null;
}

function formatNewsDate(dateStr: string): string {
	if (!dateStr) return "";
	try {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString("uz-UZ", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	} catch {
		return dateStr;
	}
}

export function News() {
	const tg = useTelegram();
	const [items, setItems] = useState<NewsItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/news")
			.then((res) => res.json())
			.then((data) => {
				if (cancelled) return;
				setItems(Array.isArray(data.items) ? data.items : []);
			})
			.catch(() => {
				if (!cancelled) setItems([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const openPost = (url: string) => {
		tg?.HapticFeedback?.impactOccurred("light");
		if (url.includes("t.me/") && tg?.openTelegramLink) {
			tg.openTelegramLink(url);
		} else if (tg?.openLink) {
			tg.openLink(url);
		} else {
			window.open(url, "_blank");
		}
	};

	return (
		<SectionCard iconImage="/icons/news.png" title="Yangiliklar">
			{loading ? (
				<div className="flex flex-col gap-4">
					{[0, 1, 2].map((i) => (
						<div key={i} className="m-2 w-[calc(100%-1rem)] rounded-4xl border-2 p-4 flex flex-col gap-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/4" />
							<Skeleton className="w-full aspect-[4/5] rounded-2xl" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-5/6" />
							<Skeleton className="h-9 w-full rounded-md mt-2" />
						</div>
					))}
				</div>
			) : items.length === 0 ? (
				<p className="text-sm text-muted-foreground">Yangiliklar yo&apos;q.</p>
			) : (
				<div className="flex flex-col gap-4">
					{items.map((item) => (
						<div key={item.id} className="m-2 w-[calc(100%-1rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 p-4">
							<h3 className="font-semibold text-base leading-snug">{item.title}</h3>
							{item.pubDate && <p className="text-xs text-muted-foreground mt-1">{formatNewsDate(item.pubDate)}</p>}
							{(item.imageUrl || item.videoUrl) && (
								<div className="relative mt-3 w-full rounded-2xl overflow-hidden bg-muted/50 aspect-[4/5] shrink-0">
									{item.videoUrl ? (
										<video src={item.videoUrl} className="absolute inset-0 h-full w-full object-cover" controls playsInline />
									) : item.imageUrl ? (
										<Image
											src={item.imageUrl}
											alt={item.title ? `${item.title} — yangilik` : "Yangilik"}
											fill
											className="object-cover"
											sizes="(max-width: 768px) 94vw, 520px"
										/>
									) : null}
								</div>
							)}
							{item.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-3 leading-normal">{item.description}</p>}
							{item.link && (
								<RippleButton variant="outline" className={`mt-4 w-full gap-2 ${goldButtonClass}`} onClick={() => openPost(item.link)}>
									<ExternalLink className="size-4 shrink-0" />
									{item.buttonText || "Batafsil"}
								</RippleButton>
							)}
						</div>
					))}
				</div>
			)}
		</SectionCard>
	);
}
