"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { telegramInit } from "@/lib/telegram";

const TelegramContext = createContext<any>(null);

interface TelegramProviderProps {
	children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
	const [telegram, setTelegram] = useState<any>(null);

	useEffect(() => {
		const tg = telegramInit();
		setTelegram(tg);
	}, []);

	return <TelegramContext.Provider value={telegram}>{children}</TelegramContext.Provider>;
}

export function useTelegram() {
	return useContext(TelegramContext);
}
