"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { CallToActionItem } from "@/components/common/call-to-action-item";
import { InfoIcon } from "lucide-react";

const BOT_LINK = process.env.NEXT_PUBLIC_BOT_TELEGRAM_LINK || "https://t.me/aslzardevbot";

export default function TelegramRequiredPage() {
	const tg = useTelegram();
	const router = useRouter();

	useEffect(() => {
		// Check if initData becomes available (user opened in Telegram)
		if (tg?.initDataUnsafe?.user?.id) {
			router.replace("/");
		}
	}, [tg, router]);

	return (
		<main className="flex flex-col items-center justify-center min-h-screen pt-12 px-4">
			<CallToActionItem
				icon={InfoIcon}
				title="Aslzar Telegram Boti"
				description="Ushbu ilovadan foydalanish uchun Telegram orqali kirishingiz kerak. Bot orqali kirish uchun pastdagi tugmani bosing."
				buttonText="Telegramda ochish"
				onButtonClick={() => {
					if (tg?.openTelegramLink) {
						tg.openTelegramLink(BOT_LINK);
					} else {
						window.location.href = BOT_LINK;
					}
				}}
			/>
		</main>
	);
}
