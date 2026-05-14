import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin, hasPermission } from "@/lib/auth";
import { parseMediaBody, parseButtonBody, checkAlbumButtonConflict } from "@/lib/broadcast-validation";
import { sendTestBroadcast, TelegramApiError } from "@/lib/telegram";

/**
 * POST /api/broadcast/test
 * Sends the current composition to a single Telegram chat ID immediately for preview.
 * Does NOT create a broadcast_jobs document. Mirrors POST /api/broadcast's validation.
 */
export async function POST(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "broadcast")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = (await request.json()) as unknown;
		const b = (body ?? {}) as Record<string, unknown>;

		const rawChatId = b.chatId;
		const chatId = typeof rawChatId === "number" ? rawChatId : typeof rawChatId === "string" ? Number(rawChatId) : NaN;
		if (!Number.isFinite(chatId) || !Number.isInteger(chatId)) {
			return NextResponse.json({ error: "chatId is required and must be an integer" }, { status: 400 });
		}

		const message = typeof b.message === "string" ? b.message.trim() : "";
		if (!message) {
			return NextResponse.json({ error: "message is required and must be a non-empty string" }, { status: 400 });
		}

		const mediaResult = parseMediaBody(b);
		if (!mediaResult.ok) {
			return NextResponse.json({ error: mediaResult.error }, { status: 400 });
		}
		const media = mediaResult.value ?? [];

		const buttonResult = parseButtonBody(b);
		if (!buttonResult.ok) {
			return NextResponse.json({ error: buttonResult.error }, { status: 400 });
		}
		const button = buttonResult.value;

		const conflict = checkAlbumButtonConflict(media.length > 0 ? media : undefined, button);
		if (conflict) {
			return NextResponse.json({ error: conflict }, { status: 400 });
		}

		try {
			await sendTestBroadcast({ chatId, message, media, button });
		} catch (err) {
			if (err instanceof TelegramApiError) {
				return NextResponse.json({ error: err.description }, { status: 400 });
			}
			throw err;
		}

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Error sending test broadcast:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
