"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
}

export default function HomePage() {
	const [user, setUser] = useState<TelegramUser | null>(null);

	useEffect(() => {
		const tg = (window as any).Telegram?.WebApp;
		tg?.expand(); // makes the Mini App full screen
		const telegramUser = tg?.initDataUnsafe?.user;
		if (telegramUser) setUser(telegramUser);
	}, []);

	return (
		<main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
			{user ? (
				<>
					<Image src={user.photo_url || ""} width={96} height={96} alt={user.first_name} className="w-24 h-24 rounded-full mb-4 border" />
					<h1 className="text-xl font-semibold">Salom, {user.first_name}! 👋</h1>
					<p className="text-gray-600 mt-2 text-center">
						ASLZAR platformasiga xush kelibsiz! Bu yerda siz barcha shartnomalaringizni, to‘lovlaringizni va bonuslaringizni boshqarishingiz mumkin.
					</p>
				</>
			) : (
				<p>Yuklanmoqda...</p>
			)}
		</main>
	);
}
