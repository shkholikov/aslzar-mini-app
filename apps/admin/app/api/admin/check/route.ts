import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin, isSuperAdmin, normalizePermissions } from "@/lib/auth";

export async function GET(request: NextRequest) {
	const admin = await getAuthenticatedAdmin(request);
	if (!admin) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}
	return NextResponse.json(
		{
			authenticated: true,
			role: isSuperAdmin(admin) ? "superadmin" : "staff",
			permissions: normalizePermissions(admin.permissions),
			username: admin.username,
			firstName: admin.firstName ?? null,
			lastName: admin.lastName ?? null
		},
		{ status: 200 }
	);
}
