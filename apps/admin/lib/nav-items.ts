import type { LucideIcon } from "lucide-react";
import { Shield, Megaphone, MessageSquare, Package, Users, Newspaper, UserCog, Plug, LayoutDashboard } from "lucide-react";
import type { AdminPermission, AdminRole } from "@/lib/auth-utils";

export interface NavItem {
	href: string;
	label: string;
	icon: LucideIcon;
	permission: AdminPermission | null;
	superadminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "users", superadminOnly: true },
	{ href: "/users", label: "Foydalanuvchilar", icon: Shield, permission: "users", superadminOnly: true },
	{ href: "/employees", label: "Xodimlar", icon: Users, permission: "employees" },
	{ href: "/broadcast", label: "Broadcast", icon: Megaphone, permission: "broadcast" },
	{ href: "/news", label: "Yangiliklar", icon: Newspaper, permission: "news" },
	{ href: "/suggestions", label: "Takliflar", icon: MessageSquare, permission: "suggestions" },
	{ href: "/products", label: "Mahsulotlar", icon: Package, permission: "products" },
	{ href: "/admin-users", label: "Adminlar", icon: UserCog, permission: null, superadminOnly: true },
	{ href: "/integrations", label: "Integratsiyalar", icon: Plug, permission: null, superadminOnly: true }
];

interface NavAccess {
	authenticated: boolean;
	role: AdminRole | null;
	permissions: AdminPermission[];
}

/** Filters NAV_ITEMS down to what the current admin is allowed to see. */
export function visibleNavItems({ authenticated, role, permissions }: NavAccess): NavItem[] {
	const isSuperadmin = role === "superadmin" || !role;
	return NAV_ITEMS.filter((item) => {
		if (!authenticated) return false;
		if (item.superadminOnly) return isSuperadmin;
		if (item.permission === null) return isSuperadmin;
		if (isSuperadmin) return true;
		return permissions.includes(item.permission);
	});
}

/** True when `pathname` is the active route for `href` (exact for "/", prefix otherwise). */
export function isActiveHref(pathname: string, href: string): boolean {
	return pathname === href || (href !== "/" && pathname.startsWith(href));
}

/** Resolves the page title for the current pathname from the nav list. */
export function navTitle(pathname: string): string {
	const match = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length).find((item) => isActiveHref(pathname, item.href));
	return match?.label ?? "Admin";
}
