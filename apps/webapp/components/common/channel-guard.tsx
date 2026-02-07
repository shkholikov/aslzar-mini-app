"use client";

import { useEffect } from "react";
import { useTelegram } from "@/hooks/useTelegram";

export function ChannelGuard({ children }: { children: React.ReactNode }) {
	const tg = useTelegram();

	useEffect(() => {
		const userId = tg?.initDataUnsafe?.user?.id?.toString();
		if (!tg || !userId) return;

		let cancelled = false;

		async function checkAndCloseIfNeeded() {
			try {
				const res = await fetch(`/api/channel-member?userId=${userId}`);
				const data = (await res.json()) as { isMember?: boolean };
				if (cancelled) return;
				if (data.isMember) return;

				// Not subscribed: send subscribe request in bot chat, then close mini app
				await fetch("/api/send-subscribe-request", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId })
				});
				if (cancelled) return;
				tg.close();
			} catch {
				// On error, allow app to open
			}
		}

		checkAndCloseIfNeeded();
		return () => {
			cancelled = true;
		};
	}, [tg]);

	return <>{children}</>;
}
