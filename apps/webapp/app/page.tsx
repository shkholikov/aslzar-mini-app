"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { telegramInit } from "../lib/telegram";

export default function HomePage() {
	const [user, setUser] = useState<any>(null);

	useEffect(() => {
		const tg = telegramInit();
		if (!tg) return;

		const userData = tg.initDataUnsafe?.user;
		if (userData) setUser(userData);
	}, []);

	return (
		<main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
			{user ? (
				<>
					{user.photo_url && (
						<Image src={user.photo_url} width={96} height={96} alt={user.first_name} className="w-24 h-24 rounded-full mb-4 border" />
					)}
					<h1 className="text-xl text-gray-800 font-semibold">Salom, {user.first_name}! 👋</h1>
					<p className="text-gray-600 mt-2 text-center max-w-sm">
						ASLZAR platformasiga xush kelibsiz! Bu yerda siz barcha shartnomalaringizni, to‘lovlaringizni va bonuslaringizni boshqarishingiz mumkin.
					</p>
				</>
			) : (
				<p>Yuklanmoqda...</p>
			)}
		</main>
	);
}
