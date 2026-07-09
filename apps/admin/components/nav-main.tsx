"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveHref, type NavItem } from "@/lib/nav-items";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from "@/components/ui/sidebar";

export function NavMain({ items }: { items: NavItem[] }) {
	const pathname = usePathname();

	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					{items.map(({ href, label, icon: Icon }) => (
						<SidebarMenuItem key={href}>
							<SidebarMenuButton asChild tooltip={label} isActive={isActiveHref(pathname, href)}>
								<Link href={href}>
									<Icon />
									<span>{label}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
