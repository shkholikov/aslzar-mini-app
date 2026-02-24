"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/common/section-card";
import { Loading } from "@/components/common/loading";
import { useTelegram } from "@/hooks/useTelegram";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { ExternalLink } from "lucide-react";
import { goldButtonClass } from "@/components/common/button-variants";

interface NewsItem {
	title: string;
	link: string;
	pubDate: string;
	description: string;
	imageUrl: string | null;
	videoUrl: string | null;
}

function formatNewsDate(dateStr: string): string {
	if (!dateStr) return "";
	try {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "short", day: "numeric" });
	} catch {
		return dateStr;
	}
}

export function News() {
	const tg = useTelegram();
	const [latest, setLatest] = useState<NewsItem | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/news")
			.then((res) => res.json())
			.then((data) => {
				if (cancelled) return;
				const items = Array.isArray(data.items) ? data.items : [];
				if (items.length > 0) setLatest(items[0]);
			})
			.catch(() => {
				if (!cancelled) setLatest(null);
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
		// Open inside Telegram (channel/post) instead of external browser
		if (tg?.openTelegramLink) {
			tg.openTelegramLink(url);
		} else {
			window.open(url, "_blank");
		}
	};

	if (loading) {
		return (
			<SectionCard iconImage="/icons/news.png" title="Yangiliklar">
				<Loading />
			</SectionCard>
		);
	}

	if (!latest) {
		return (
			<SectionCard iconImage="/icons/news.png" title="Yangiliklar">
				<p className="text-sm text-muted-foreground">Yangiliklar yo‘q.</p>
			</SectionCard>
		);
	}

	return (
		<SectionCard iconImage="/icons/news.png" title="Yangiliklar">
			<div className="m-2 w-[calc(100%-1rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 p-4">
				<h3 className="font-semibold text-base leading-snug">{latest.title}</h3>
				{latest.pubDate && (
					<p className="text-xs text-muted-foreground mt-1">{formatNewsDate(latest.pubDate)}</p>
				)}
				{(latest.imageUrl || latest.videoUrl) && (
					<div className="mt-3 w-full rounded-2xl overflow-hidden bg-muted/50 aspect-video shrink-0">
						{latest.videoUrl ? (
							<video
								src={latest.videoUrl}
								className="w-full h-full object-cover"
								controls={false}
								playsInline
								preload="metadata"
							/>
						) : latest.imageUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={latest.imageUrl}
								alt=""
								className="w-full h-full object-cover"
							/>
						) : null}
					</div>
				)}
				{latest.description && (
					<p className="mt-3 text-sm text-muted-foreground line-clamp-3 leading-normal">
						{latest.description}
					</p>
				)}
				{latest.link && (
					<RippleButton
						variant="outline"
						className={`mt-4 w-full gap-2 ${goldButtonClass}`}
						onClick={() => openPost(latest.link)}
					>
						<ExternalLink className="size-4 shrink-0" />
						Kanalda ochish
					</RippleButton>
				)}
			</div>
		</SectionCard>
	);
}
