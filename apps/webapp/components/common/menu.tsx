"use client";
import { navigationItems } from "@/lib/navigation";
import { useRouter, usePathname } from "next/navigation";
import { MenuDock } from "@/components/ui/shadcn-io/menu-dock";
import { useTelegram } from "@/hooks/useTelegram";

export function Menu() {
	const router = useRouter();
	const pathname = usePathname();
	const tg = useTelegram();

	const activeIndex = navigationItems.findIndex((item) => item.path === pathname);

	const navItems = navigationItems.map((item) => ({
		...item,
		onClick: () => {
			tg?.HapticFeedback?.impactOccurred("heavy");
			router.push(item.path);
		}
	}));

	return (
		<div className="flex items-end justify-center min-h-[120px] fixed bottom-6">
			<MenuDock items={navItems} animated={false} variant="compact" activeIndex={activeIndex === -1 ? 0 : activeIndex} />
		</div>
	);
}
