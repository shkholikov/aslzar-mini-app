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
 * Removes the handler and hides the button on unmount. Every page reached by an in-app link
 * (/profile, /branches, /suggestions, product pages) calls this; components/common/link.tsx
 * no longer touches the BackButton, because its handlers were never removed and piled up.
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
