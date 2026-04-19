"use client";
import { navigationItems } from "@/lib/navigation";
import { useRouter, usePathname } from "next/navigation";
import { MenuDock } from "@/components/ui/shadcn-io/menu-dock";
import { useTelegram } from "@/hooks/useTelegram";

/** Sub-routes that should keep a top-level tab highlighted in the dock. */
const SUB_ROUTE_PARENTS: Record<string, string> = {
	"/branches": "/other",
	"/suggestions": "/other",
	"/register": "/"
};

export function Menu() {
	const router = useRouter();
	const pathname = usePathname();
	const tg = useTelegram();

	const effectivePath = SUB_ROUTE_PARENTS[pathname] ?? pathname;
	const activeIndex = navigationItems.findIndex((item) => item.path === effectivePath);

	const navItems = navigationItems.map((item) => ({
		...item,
		onClick: () => {
			tg?.HapticFeedback?.impactOccurred("heavy");
			router.push(item.path);
		}
	}));

	return (
		<div className="flex items-end justify-center min-h-[120px] fixed bottom-6 pointer-events-none">
			<div className="pointer-events-auto">
				<MenuDock items={navItems} animated={false} variant="compact" activeIndex={activeIndex === -1 ? 0 : activeIndex} />
			</div>
		</div>
	);
}
