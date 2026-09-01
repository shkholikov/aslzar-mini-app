"use client";
import WebApp from "@twa-dev/sdk";

export function telegramInit() {
	if (typeof window === "undefined") return null;
	const tg = WebApp;
	tg.ready();
	syncSafeAreaVars(tg);
	return tg;
}

/**
 * Publishes Telegram's safe-area insets as CSS variables.
 *
 * Telegram sets `--tg-content-safe-area-inset-*` itself from Bot API 8.0, but older clients and
 * desktop do not — and a `var()` with no fallback makes the whole declaration invalid, so
 * `padding-top` silently resolves to 0 and the page slides under Telegram's header.
 *
 * Reading the values from the SDK and writing them ourselves makes the variables present on
 * every client. `contentSafeAreaInset` is the area below Telegram's own header; `safeAreaInset`
 * is the device notch. Both are re-read on the events Telegram fires when they change.
 *
 * https://core.telegram.org/bots/webapps#contentsafeareainset
 */
function syncSafeAreaVars(tg: typeof WebApp): void {
	const root = document.documentElement;

	const apply = () => {
		const content = (tg as { contentSafeAreaInset?: Record<string, number> }).contentSafeAreaInset;
		const device = (tg as { safeAreaInset?: Record<string, number> }).safeAreaInset;

		for (const side of ["top", "bottom", "left", "right"] as const) {
			if (content && typeof content[side] === "number") {
				root.style.setProperty(`--tg-content-safe-area-inset-${side}`, `${content[side]}px`);
			}
			if (device && typeof device[side] === "number") {
				root.style.setProperty(`--tg-safe-area-inset-${side}`, `${device[side]}px`);
			}
		}
	};

	apply();

	// Rotation, fullscreen toggles and Telegram's own chrome can all move these.
	const on = (tg as { onEvent?: (e: string, cb: () => void) => void }).onEvent;
	on?.call(tg, "contentSafeAreaChanged", apply);
	on?.call(tg, "safeAreaChanged", apply);
	on?.call(tg, "viewportChanged", apply);
}
