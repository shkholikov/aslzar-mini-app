"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";

/**
 * Enables the Telegram "Settings" gear (SettingsButton) in the Mini App's
 * 3-dots menu and routes it to /profile. Renders nothing.
 *
 * All SDK calls are optional-chained so clients without SettingsButton
 * support (pre Bot API 6.10) simply no-op — the /profile page stays
 * reachable via the home avatar and the "Boshqa" page link.
 */
export function SettingsButton() {
	const tg = useTelegram();
	const router = useRouter();

	useEffect(() => {
		if (!tg?.SettingsButton) return;

		const onClick = () => {
			tg.HapticFeedback?.impactOccurred("heavy");
			router.push("/profile");
		};

		tg.SettingsButton.show?.();
		tg.SettingsButton.onClick?.(onClick);

		return () => {
			tg.SettingsButton.offClick?.(onClick);
			tg.SettingsButton.hide?.();
		};
	}, [tg, router]);

	return null;
}
