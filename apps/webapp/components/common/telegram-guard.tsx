"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";

export function TelegramGuard({ children }: { children: React.ReactNode }) {
	const tg = useTelegram();
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		// Don't redirect if already on telegram-required page
		if (pathname === "/telegram-required") {
			return;
		}

		// Only redirect if Telegram is initialized but initData is missing
		if (tg !== null && !tg.initDataUnsafe?.user?.id) {
			router.replace("/telegram-required");
		}
	}, [tg, pathname, router]);

	return <>{children}</>;
}
