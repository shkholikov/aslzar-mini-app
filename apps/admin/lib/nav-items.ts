import type { LucideIcon } from "lucide-react";
import { Shield, Megaphone, MessageSquare, Users, Newspaper, UserCog, Plug, LayoutDashboard, Share2 } from "lucide-react";
import type { AdminPermission, AdminRole } from "@/lib/auth-utils";

export interface NavItem {
	href: string;
	label: string;
	icon: LucideIcon;
	permission: AdminPermission | null;
	superadminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard, permission: null },
	{ href: "/users", label: "Foydalanuvchilar", icon: Shield, permission: "users" },
	{ href: "/referral", label: "Referal", icon: Share2, permission: "referral" },
	{ href: "/employees", label: "Xodimlar", icon: Users, permission: "employees" },
	{ href: "/broadcast", label: "Broadcast", icon: Megaphone, permission: "broadcast" },
	{ href: "/news", label: "Yangiliklar", icon: Newspaper, permission: "news" },
	{ href: "/suggestions", label: "Takliflar", icon: MessageSquare, permission: "suggestions" },
	{ href: "/admin-users", label: "Adminlar", icon: UserCog, permission: null, superadminOnly: true },
	{ href: "/integrations", label: "Integratsiyalar", icon: Plug, permission: "integrations" }
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
		if (item.permission === null) return true; // open to every admin (Dashboard)
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
