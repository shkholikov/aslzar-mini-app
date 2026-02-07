import { NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser();
const MAX_ITEMS = 10;

/**
 * GET /api/news
 * Fetches posts from your Telegram channel via RSS and returns them as JSON.
 * Set NEWS_RSS_URL in .env to your channel's RSS feed (e.g. from https://rss.app – create a feed from your t.me/channel link).
 */
export async function GET() {
	const rssUrl = process.env.NEWS_RSS_URL;
	if (!rssUrl) {
		return NextResponse.json(
			{ error: "NEWS_RSS_URL is not configured", items: [] },
			{ status: 200 }
		);
	}

	try {
		const feed = await parser.parseURL(rssUrl);
		const items = (feed.items ?? [])
			.slice(0, MAX_ITEMS)
			.map((item) => {
				const content = item.content ?? item.contentSnippet ?? "";
				const description = stripHtml(content).slice(0, 300);
				const enclosure = item.enclosure;
				const imageUrl = enclosure?.type?.startsWith("image/")
					? enclosure.url
					: extractFirstImageUrl(content);
				const videoUrl = enclosure?.type?.startsWith("video/") ? enclosure.url : null;
				return {
					title: item.title ?? "",
					link: item.link ?? item.guid ?? "",
					pubDate: item.pubDate ?? "",
					description: description || "",
					imageUrl: imageUrl || null,
					videoUrl: videoUrl || null,
				};
			});

		return NextResponse.json({ items });
	} catch (err) {
		console.error("[news] RSS fetch error:", err);
		return NextResponse.json(
			{ error: "Failed to fetch news", items: [] },
			{ status: 200 }
		);
	}
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function extractFirstImageUrl(html: string): string | null {
	const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
	return match ? match[1] : null;
}
