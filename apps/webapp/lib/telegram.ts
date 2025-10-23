"use client";
import WebApp from "@twa-dev/sdk";

export function telegramInit() {
	if (typeof window === "undefined") return null;
	const tg = WebApp;
	tg.ready();
	return tg;
}
