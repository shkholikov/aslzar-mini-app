import { NextResponse } from "next/server";
import { getChannelPosts } from "@/lib/db";

const MAX_ITEMS = 10;

/** Build Telegram file URL from file_path (from getFile). */
function telegramFileUrl(filePath: string): string {
	const token = process.env.BOT_TOKEN;
	if (!token) return "";
	return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

/**
 * GET /api/news
 * Returns latest posts from the Telegram channel (stored in MongoDB by the bot on channel_post).
 */
export async function GET() {
	try {
		const posts = await getChannelPosts(MAX_ITEMS);
		const items = posts.map((p) => {
			const title = (p.text?.slice(0, 100).split("\n")[0] || "").trim() || "Yangilik";
			const link =
				p.channelUsername && p.channelUsername !== "channel"
					? `https://t.me/${p.channelUsername}/${p.messageId}`
					: "";
			return {
				title,
				link,
				pubDate: p.date ? new Date(p.date).toISOString() : "",
				description: (p.text ?? "").slice(0, 300),
				imageUrl: p.photoFilePath ? telegramFileUrl(p.photoFilePath) : null,
				videoUrl: p.videoFilePath ? telegramFileUrl(p.videoFilePath) : null,
			};
		});
		return NextResponse.json({ items });
	} catch (err) {
		console.error("[news] Channel posts fetch error:", err);
		return NextResponse.json({ error: "Failed to fetch news", items: [] }, { status: 200 });
	}
}
