"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useAdminContext } from "@/components/common/admin-context";
import { visibleNavItems } from "@/lib/nav-items";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from "@/components/ui/sidebar";
import pkg from "../package.json";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { authenticated, role, permissions } = useAdminContext();
	const items = visibleNavItems({ authenticated, role, permissions });

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
							<Link href="/">
								<Image src="/images/aslzar-logo.png" alt="ASLZAR" width={24} height={24} className="size-6 rounded-sm object-contain" />
								<span className="text-base font-semibold">ASLZAR Bot Admin</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={items} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
				<p className="px-2 pb-1 text-center text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">v{pkg.version}</p>
			</SidebarFooter>
		</Sidebar>
	);
}
