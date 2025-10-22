"use client";

import { useLaunchParams } from "@telegram-apps/sdk-react";
import Image from "next/image";

export default function HomePage() {
	const launchParams = useLaunchParams();
	const user = launchParams?.tgWebAppData?.user;

	return (
		<main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
			{user ? (
				<>
					{user.photo_url && (
						<Image src={user.photo_url} width={96} height={96} alt={user.first_name} className="w-24 h-24 rounded-full mb-4 border" />
					)}
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
