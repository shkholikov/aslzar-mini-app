"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "./useTelegram";

/**
 * Shows Telegram's own BackButton while a page is mounted, and goes back when it is tapped.
 *
 * On iOS Telegram draws this as an ✕ rather than a chevron — that is their chrome and there is
 * no API to restyle it.
 *
 * Modelled on app/settings/page.tsx, which is the correct version: it removes the handler and
 * hides the button on unmount. The copy inside components/common/link.tsx does not — it
 * registers a new onClick on every click and never calls offClick, so handlers accumulate.
 */
export function useTelegramBackButton(enabled = true): void {
	const tg = useTelegram();
	const router = useRouter();

	useEffect(() => {
		if (!enabled || !tg?.BackButton) return;

		const onBack = () => {
			tg.HapticFeedback?.impactOccurred("heavy");
			router.back();
		};

		tg.BackButton.show?.();
		tg.BackButton.onClick?.(onBack);

		return () => {
			tg.BackButton.offClick?.(onBack);
			tg.BackButton.hide?.();
		};
	}, [enabled, tg, router]);
}
