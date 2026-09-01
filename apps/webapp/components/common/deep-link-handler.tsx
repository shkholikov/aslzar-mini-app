"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";

/** 1C product ids look like `00-0007766`. Anything else is not ours to route. */
const PRODUCT_ID = /^\d{2}-\d{4,12}$/;

/**
 * Opens the product a shared link points at.
 *
 * A story shared from a product page carries `?startapp=<productId>`, which Telegram hands us as
 * `initDataUnsafe.start_param`. Without this the link opens the app on the home screen and the
 * person who tapped it never sees the ring they were shown.
 *
 * Note `start_param` (from `startapp=`) is a different channel from the bot's `/start <payload>`
 * used for referrals, so the two cannot collide.
 *
 * Renders nothing.
 */
export function DeepLinkHandler() {
	const tg = useTelegram();
	const router = useRouter();
	const handled = useRef(false);

	useEffect(() => {
		if (handled.current || !tg) return;

		const param = (tg as { initDataUnsafe?: { start_param?: string } }).initDataUnsafe?.start_param;
		if (!param || !PRODUCT_ID.test(param)) return;

		handled.current = true;
		router.replace(`/catalog/${encodeURIComponent(param)}`);
	}, [tg, router]);

	return null;
}
