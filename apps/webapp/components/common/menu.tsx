"use client";
import { navigationItems } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { MenuDock } from "../ui/shadcn-io/menu-dock";
import { useTelegram } from "@/hooks/useTelegram";

export function Menu() {
	const router = useRouter();
    const tg = useTelegram();

	const navItems = navigationItems.map((item) => ({
		...item,
		onClick: () => {
          tg?.HapticFeedback?.impactOccurred("light");
          router.push(item.path);
      }
	}));
	return (
		<div className="flex items-end justify-center min-h-[120px] fixed bottom-6">
			<MenuDock items={navItems} variant="compact" animated={false} />
		</div>
	);
}
