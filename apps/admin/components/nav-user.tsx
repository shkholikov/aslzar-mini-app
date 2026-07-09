"use client";

import { useState } from "react";
import { MoreVertical, UserCircle, LogOut } from "lucide-react";
import { useAdminContext } from "@/components/common/admin-context";
import { ALL_PERMISSIONS } from "@/lib/auth-utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "AD";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NavUser() {
	const { isMobile } = useSidebar();
	const { authenticated, role, permissions, username, firstName, lastName } = useAdminContext();
	const [profileOpen, setProfileOpen] = useState(false);

	const isSuperadmin = role === "superadmin" || !role;
	const displayName = firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : username ?? "Admin";
	const roleLabel = isSuperadmin ? "Superadmin" : "Staff";

	async function handleLogout() {
		try {
			await fetch("/api/admin/logout", { method: "POST" });
			window.location.href = "/login";
		} catch {
			// ignore
		}
	}

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<Avatar className="size-8 rounded-lg">
									<AvatarFallback className="rounded-lg">{initials(displayName)}</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{displayName}</span>
									<span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
								</div>
								<MoreVertical className="ml-auto size-4" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="size-8 rounded-lg">
										<AvatarFallback className="rounded-lg">{initials(displayName)}</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">{displayName}</span>
										<span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
									</div>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem onSelect={() => setProfileOpen(true)}>
									<UserCircle />
									Profil
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={handleLogout}>
								<LogOut />
								Chiqish
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>

			<Dialog open={profileOpen} onOpenChange={setProfileOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Profil ma&apos;lumotlari</DialogTitle>
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
								{roleLabel}
							</Badge>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">Ruxsatlar</span>
							{isSuperadmin ? (
								<span className="text-sm text-muted-foreground">Barcha ruxsatlar</span>
							) : !authenticated || permissions.length === 0 ? (
								<span className="text-sm text-muted-foreground">Ruxsat yo&apos;q</span>
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
