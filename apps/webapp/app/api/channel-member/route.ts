import { NextRequest, NextResponse } from "next/server";
import { updateUserChannelMember } from "@/lib/db";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || "@ASLZAR_tilla";

export async function GET(request: NextRequest) {
	try {
		const userId = request.nextUrl.searchParams.get("userId");
		if (!userId) {
			return NextResponse.json({ error: "userId is required" }, { status: 400 });
		}
		if (!BOT_TOKEN) {
			return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
		}

		const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(CHANNEL_ID)}&user_id=${userId}`;
		const res = await fetch(url);
		const data = (await res.json()) as { ok?: boolean; result?: { status?: string } };

		if (!data.ok || !data.result) {
			return NextResponse.json({ isMember: false }, { status: 200 });
		}

		const status = data.result.status;
		const isMember = ["creator", "administrator", "member"].includes(status ?? "");

		// Persist so admin panel "Kanal a'zosi" column stays in sync
		await updateUserChannelMember(userId, isMember).catch((err) => {
			console.error("Failed to persist isChannelMember:", err);
		});

		return NextResponse.json({ isMember }, { status: 200 });
	} catch (error) {
		console.error("Error checking channel membership:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
