/**
 * Pure client-safe auth utilities (no server imports).
 * These can be imported in both server and client components.
 */

export type AdminRole = "superadmin" | "staff";
export type AdminPermission = "users" | "referral" | "employees" | "broadcast" | "news" | "suggestions" | "integrations";

export interface AdminUserBase {
	username: string;
	firstName?: string;
	lastName?: string;
	role?: AdminRole;
	permissions?: AdminPermission[];
}

/**
 * One permission per sidebar page. Dashboard needs none (every admin sees it) and Adminlar is
 * superadmin-only, so neither is listed.
 */
export const ALL_PERMISSIONS: { value: AdminPermission; label: string }[] = [
	{ value: "users", label: "Foydalanuvchilar" },
	{ value: "referral", label: "Referal" },
	{ value: "employees", label: "Xodimlar" },
	{ value: "broadcast", label: "Broadcast" },
	{ value: "news", label: "Yangiliklar" },
	{ value: "suggestions", label: "Takliflar" },
	{ value: "integrations", label: "Integratsiyalar" }
];

export const VALID_PERMISSIONS = new Set<AdminPermission>(ALL_PERMISSIONS.map((p) => p.value));

/**
 * Keeps only permissions that still exist. Stored admins can carry retired keys (e.g. "products"
 * from the old product editor); they are dropped here rather than migrated in the database.
 */
export function normalizePermissions(list: unknown): AdminPermission[] {
	if (!Array.isArray(list)) return [];
	return list.filter((p): p is AdminPermission => VALID_PERMISSIONS.has(p as AdminPermission));
}

export function isSuperAdmin(admin: AdminUserBase): boolean {
	return !admin.role || admin.role === "superadmin";
}

export function hasPermission(admin: AdminUserBase, permission: AdminPermission): boolean {
	if (isSuperAdmin(admin)) return true;
	return (admin.permissions ?? []).includes(permission);
}

/** Where an admin lands after login or after being turned away from a page: the Dashboard, open to all. */
export function getFirstAllowedPath(): string {
	return "/";
}
