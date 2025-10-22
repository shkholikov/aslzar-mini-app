"use client";

import { useEffect } from "react";
import { init, backButton } from "@telegram-apps/sdk-react";

/**
 * Initializes the Telegram Mini Apps SDK on the client side.
 * Should be rendered once near the root of your app (e.g. inside <body> in RootLayout).
 */
export function TelegramInit() {
	useEffect(() => {
		// Initialize the Telegram Mini App SDK
		init();

		// Mount and configure the Telegram back button
		backButton.mount();
		backButton.show();

		backButton.onClick(() => {
			console.log("Telegram back button clicked");
			// Example integration:
			// import { useRouter } from "next/navigation"
			// router.back();
		});

		// Clean up on component unmount
		return () => {
			backButton.unmount();
		};
	}, []);

	return null;
}
