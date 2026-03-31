import { NextResponse, type NextRequest } from "next/server";
import { createNewsItem, getNewsItems } from "@/lib/db";
import { getAuthenticatedAdmin, hasPermission } from "@/lib/auth";

export async function GET(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "news")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		const items = await getNewsItems();
		return NextResponse.json({ items }, { status: 200 });
	} catch (error) {
		console.error("Error fetching news items:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "news")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await request.json();
		const title = typeof body?.title === "string" ? body.title.trim() : "";
		const description = typeof body?.description === "string" ? body.description.trim() : "";
		if (!title) {
			return NextResponse.json({ error: "title is required" }, { status: 400 });
		}
		if (!description) {
			return NextResponse.json({ error: "description is required" }, { status: 400 });
		}

		const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : undefined;
		const mediaType = body?.mediaType === "photo" || body?.mediaType === "video" ? body.mediaType : undefined;
		if ((mediaUrl && !mediaType) || (!mediaUrl && mediaType)) {
			return NextResponse.json({ error: "mediaUrl and mediaType must both be provided" }, { status: 400 });
		}
		const media = mediaUrl && mediaType ? { mediaUrl, mediaType } : undefined;

		const buttonText = typeof body?.buttonText === "string" ? body.buttonText.trim() : undefined;
		const buttonUrl = typeof body?.buttonUrl === "string" ? body.buttonUrl.trim() : undefined;
		if ((buttonText && !buttonUrl) || (!buttonText && buttonUrl)) {
			return NextResponse.json({ error: "buttonText and buttonUrl must both be provided" }, { status: 400 });
		}
		const button = buttonText && buttonUrl ? { buttonText, buttonUrl } : undefined;

		const item = await createNewsItem({ title, description, media, button });
		return NextResponse.json({ item }, { status: 201 });
	} catch (error) {
		console.error("Error creating news item:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
