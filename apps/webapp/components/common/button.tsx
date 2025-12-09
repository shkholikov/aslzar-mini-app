"use client";

import { useEffect } from "react";
import { telegramInit } from "@/lib/telegram";

export default function ButtonTest() {
	useEffect(() => {
		const tg = telegramInit();
		if (!tg) return;

		// Show Main Button
		tg.MainButton.setText("Click Me");
		tg.MainButton.show();

		// Listen to click events
		tg.MainButton.onClick(() => {
			tg.HapticFeedback.notificationOccurred("success");
			tg.MainButton.setText("Clicked ✅");
			alert("Main Button clicked!");
		});

		// Optional: show Back Button
		tg.BackButton.show();
		tg.BackButton.onClick(() => {
			alert("Back button pressed!");
		});

		return () => {
			// cleanup listeners when component unmounts
			tg.MainButton.offClick(() => console.log("offClick was clicked"));
			tg.BackButton.hide();
		};
	}, []);

	return (
		<main className="flex flex-col items-center justify-center min-h-screen">
			<p className="text-lg text-gray-700">Press the Telegram Main Button 👇</p>
		</main>
	);
}
