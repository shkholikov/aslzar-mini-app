import { NextResponse, type NextRequest } from "next/server";
import { findAdminByUsername, verifyPassword, setAdminSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const username = typeof body?.username === "string" ? body.username.trim() : "";
		const password = typeof body?.password === "string" ? body.password : "";

		if (!username || !password) {
			return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
		}

		const user = await findAdminByUsername(username);
		if (!user || !user.passwordHash) {
			return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
		}

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) {
			return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
		}

		await setAdminSessionCookie(String(user._id ?? user.username));

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Error in admin login:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
