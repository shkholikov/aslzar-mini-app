import { NextResponse } from "next/server";
import { getNewsItems } from "@/lib/db";

export async function GET() {
	try {
		const posts = await getNewsItems(5);
		const items = posts.map((p) => ({
			id: String(p._id),
			title: p.title,
			link: p.buttonUrl || "",
			pubDate: p.createdAt ? p.createdAt.toISOString() : "",
			description: p.description,
			imageUrl: p.mediaType === "photo" ? (p.mediaUrl ?? null) : null,
			videoUrl: p.mediaType === "video" ? (p.mediaUrl ?? null) : null,
			buttonText: p.buttonText ?? null
		}));
		return NextResponse.json({ items });
	} catch (err) {
		console.error("[news] News items fetch error:", err);
		return NextResponse.json({ error: "Failed to fetch news", items: [] }, { status: 200 });
	}
}
