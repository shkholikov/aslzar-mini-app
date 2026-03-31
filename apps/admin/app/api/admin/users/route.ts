import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin, isSuperAdmin, getAllAdminUsers, createAdminUser, type AdminRole, type AdminPermission } from "@/lib/auth";
import { VALID_PERMISSIONS } from "@/lib/auth-utils";

/**
 * GET /api/admin/users
 * Returns all admin users (superadmin only).
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!isSuperAdmin(admin)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const users = await getAllAdminUsers();
		return NextResponse.json({ users }, { status: 200 });
	} catch (error) {
		console.error("Error fetching admin users:", error);
		return NextResponse.json(
			{ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/admin/users
 * Creates a new admin user (superadmin only).
 * Body: { username, password, role, permissions? }
 */
export async function POST(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!isSuperAdmin(admin)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await request.json();
		const username = typeof body?.username === "string" ? body.username.trim() : "";
		const password = typeof body?.password === "string" ? body.password : "";
		const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : undefined;
		const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : undefined;
		const role: AdminRole = body?.role === "staff" ? "staff" : "superadmin";
		const permissions: AdminPermission[] = Array.isArray(body?.permissions)
			? body.permissions.filter((p: unknown) => VALID_PERMISSIONS.has(p as AdminPermission))
			: [];

		if (!username || !password) {
			return NextResponse.json({ error: "username va password majburiy" }, { status: 400 });
		}
		if (password.length < 6) {
			return NextResponse.json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
		}

		const user = await createAdminUser({
			username,
			password,
			firstName: firstName || undefined,
			lastName: lastName || undefined,
			role,
			permissions: role === "staff" ? permissions : undefined,
			createdBy: admin.username
		});

		return NextResponse.json({ user }, { status: 201 });
	} catch (error) {
		console.error("Error creating admin user:", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		if (message.includes("allaqachon mavjud")) {
			return NextResponse.json({ error: message }, { status: 409 });
		}
		return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
	}
}
