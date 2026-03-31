import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin, isSuperAdmin, updateAdminUser, deleteAdminUser, type AdminRole, type AdminPermission } from "@/lib/auth";
import { VALID_PERMISSIONS } from "@/lib/auth-utils";

interface RouteParams {
	params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/users/[id]
 * Updates role and/or permissions of an admin user (superadmin only).
 * Body: { role?, permissions? }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!isSuperAdmin(admin)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		const body = await request.json();
		const role: AdminRole | undefined = body?.role === "staff" || body?.role === "superadmin" ? body.role : undefined;
		const permissions: AdminPermission[] | undefined = Array.isArray(body?.permissions)
			? body.permissions.filter((p: unknown) => VALID_PERMISSIONS.has(p as AdminPermission))
			: undefined;

		const updated = await updateAdminUser(id, { role, permissions });
		if (!updated) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error updating admin user:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}

/**
 * DELETE /api/admin/users/[id]
 * Deletes an admin user (superadmin only). Cannot delete self.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!isSuperAdmin(admin)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		// Prevent self-deletion by comparing _id
		if (admin._id && admin._id.toString() === id) {
			return NextResponse.json({ error: "O'zingizni o'chira olmaysiz" }, { status: 400 });
		}

		const deleted = await deleteAdminUser(id);
		if (!deleted) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error deleting admin user:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}
