"use client";

import { useEffect } from "react";
import { init, backButton } from "@telegram-apps/sdk-react";

/**
 * Initializes the Telegram Mini Apps SDK on client side.
 * Call this once near the root of your app.
 */
export function TelegramInit() {
	useEffect(() => {
		// Initialize the SDK once the component mounts
		init();

		// Mount the back button feature so it syncs with Telegram UI
		backButton.mount();

		// Optionally configure it:
		backButton.show();
		backButton.onClick(() => {
			console.log("Back button clicked inside Telegram WebApp");
			// You could integrate Next.js router.back() here
		});

		// Cleanup on unmount
		return () => {
			backButton.unmount();
		};
	}, []);

	// This component doesn't render anything visible
	return null;
}
