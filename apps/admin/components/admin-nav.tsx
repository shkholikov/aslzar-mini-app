"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Megaphone, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
	{ href: "/", label: "Foydalanuvchilar", icon: Shield },
	{ href: "/broadcast", label: "Broadcast", icon: Megaphone },
	{ href: "/suggestions", label: "Takliflar", icon: MessageSquare }
];

export function AdminNav() {
	const pathname = usePathname();

	return (
		<nav className="border-b border-border bg-card">
			<div className="container flex h-12 items-center justify-between gap-3 px-4">
				<div className="flex items-center gap-1">
					{tabs.map(({ href, label, icon: Icon }) => {
						const active = pathname === href || (href !== "/" && pathname.startsWith(href));
						return (
							<Link
								key={href}
								href={href}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
									active
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								)}
							>
								<Icon className="h-4 w-4" />
								{label}
							</Link>
						);
					})}
				</div>

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
		</nav>
	);
}
