import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth";

export async function POST(_request: NextRequest) {
	try {
		await clearAdminSessionCookie();
		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Error in admin logout:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

