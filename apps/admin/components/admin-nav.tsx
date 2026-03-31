"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Megaphone, MessageSquare, Package, Users, Newspaper, UserCog, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminContext } from "@/components/common/admin-context";
import { ALL_PERMISSIONS, type AdminPermission } from "@/lib/auth-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const tabs: { href: string; label: string; icon: React.ElementType; permission: AdminPermission | null; superadminOnly?: boolean }[] = [
	{ href: "/", label: "Foydalanuvchilar", icon: Shield, permission: "users", superadminOnly: true },
	{ href: "/employees", label: "Xodimlar", icon: Users, permission: "employees" },
	{ href: "/broadcast", label: "Broadcast", icon: Megaphone, permission: "broadcast" },
	{ href: "/news", label: "Yangiliklar", icon: Newspaper, permission: "news" },
	{ href: "/suggestions", label: "Takliflar", icon: MessageSquare, permission: "suggestions" },
	{ href: "/products", label: "Mahsulotlar", icon: Package, permission: "products" },
	{ href: "/admin-users", label: "Adminlar", icon: UserCog, permission: null, superadminOnly: true }
];

export function AdminNav() {
	const pathname = usePathname();
	const { authenticated, role, permissions, username, firstName, lastName } = useAdminContext();
	const [profileOpen, setProfileOpen] = useState(false);

	const isSuperadmin = role === "superadmin" || !role;

	const visibleTabs = tabs.filter((tab) => {
		if (!authenticated) return false;
		if (tab.superadminOnly) return isSuperadmin;
		if (tab.permission === null) return isSuperadmin;
		if (isSuperadmin) return true;
		return permissions.includes(tab.permission!);
	});

	const displayName = firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : username;

	return (
		<>
			<nav className="border-b border-border bg-card">
				<div className="container flex h-12 w-full max-w-full items-center gap-3 px-4">
					<div className="flex items-center gap-1">
						{visibleTabs.map(({ href, label, icon: Icon }) => {
							const active = pathname === href || (href !== "/" && pathname.startsWith(href));
							return (
								<Link
									key={href}
									href={href}
									className={cn(
										"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
										active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
									)}
								>
									<Icon className="h-4 w-4" />
									{label}
								</Link>
							);
						})}
					</div>
					<div className="ml-auto flex items-center gap-2 shrink-0">
						{authenticated && displayName && (
							<button
								type="button"
								onClick={() => setProfileOpen(true)}
								className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
							>
								<User className="h-3.5 w-3.5" />
								{displayName}
							</button>
						)}
						<button
							type="button"
							onClick={async () => {
								try {
									await fetch("/api/admin/logout", { method: "POST" });
									window.location.href = "/login";
								} catch {
									// ignore
								}
							}}
							className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
						>
							Chiqish
						</button>
					</div>
				</div>
			</nav>

			<Dialog open={profileOpen} onOpenChange={setProfileOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Profil ma'lumotlari</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-3 pt-1">
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">Username</span>
							<span className="text-sm font-medium">{username ?? "—"}</span>
						</div>
						{(firstName || lastName) && (
							<div className="flex flex-col gap-1">
								<span className="text-xs text-muted-foreground">Ism Familiya</span>
								<span className="text-sm font-medium">{[firstName, lastName].filter(Boolean).join(" ")}</span>
							</div>
						)}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">Rol</span>
							<Badge variant={isSuperadmin ? "default" : "secondary"} className="w-fit">
								{isSuperadmin ? "Superadmin" : "Staff"}
							</Badge>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">Ruxsatlar</span>
							{isSuperadmin ? (
								<span className="text-sm text-muted-foreground">Barcha ruxsatlar</span>
							) : permissions.length === 0 ? (
								<span className="text-sm text-muted-foreground">Ruxsat yo'q</span>
							) : (
								<div className="flex flex-wrap gap-1">
									{permissions.map((p) => (
										<Badge key={p} variant="outline" className="text-xs">
											{ALL_PERMISSIONS.find((x) => x.value === p)?.label ?? p}
										</Badge>
									))}
								</div>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
