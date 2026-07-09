"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	// The login page is a standalone centered form — render it without the sidebar chrome.
	if (pathname === "/login") {
		return <>{children}</>;
	}

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)"
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset className="min-w-0">
				<SiteHeader />
				<div className="flex min-w-0 flex-1 flex-col">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
