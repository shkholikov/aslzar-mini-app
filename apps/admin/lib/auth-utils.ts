/**
 * Pure client-safe auth utilities (no server imports).
 * These can be imported in both server and client components.
 */

export type AdminRole = "superadmin" | "staff";
export type AdminPermission = "employees" | "products" | "news" | "broadcast" | "suggestions" | "users";

export interface AdminUserBase {
	username: string;
	firstName?: string;
	lastName?: string;
	role?: AdminRole;
	permissions?: AdminPermission[];
}

export const ALL_PERMISSIONS: { value: AdminPermission; label: string }[] = [
	{ value: "users", label: "Foydalanuvchilar" },
	{ value: "employees", label: "Xodimlar" },
	{ value: "broadcast", label: "Broadcast" },
	{ value: "news", label: "Yangiliklar" },
	{ value: "suggestions", label: "Takliflar" },
	{ value: "products", label: "Mahsulotlar" }
];

export const VALID_PERMISSIONS = new Set<AdminPermission>(ALL_PERMISSIONS.map((p) => p.value));

/** Maps AdminPermission to the first page that permission grants access to */
const PERMISSION_PATH_MAP: Record<AdminPermission, string> = {
	users: "/",
	employees: "/employees",
	products: "/products",
	news: "/news",
	broadcast: "/broadcast",
	suggestions: "/suggestions"
};

export function isSuperAdmin(admin: AdminUserBase): boolean {
	return !admin.role || admin.role === "superadmin";
}

export function hasPermission(admin: AdminUserBase, permission: AdminPermission): boolean {
	if (isSuperAdmin(admin)) return true;
	return (admin.permissions ?? []).includes(permission);
}

/** Returns the first page this admin is allowed to access. Superadmins go to "/". */
export function getFirstAllowedPath(admin: AdminUserBase): string {
	if (isSuperAdmin(admin)) return "/";
	const permissions = admin.permissions ?? [];
	for (const perm of Object.keys(PERMISSION_PATH_MAP) as AdminPermission[]) {
		if (permissions.includes(perm)) return PERMISSION_PATH_MAP[perm];
	}
	return "/login"; // no permissions at all
}
