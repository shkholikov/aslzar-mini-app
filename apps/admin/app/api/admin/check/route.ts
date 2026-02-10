import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
	const ok = await isAuthenticatedRequest(request);
	if (!ok) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}
	return NextResponse.json({ authenticated: true }, { status: 200 });
}

