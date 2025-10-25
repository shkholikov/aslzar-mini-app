"use client";

import { useEffect, useState } from "react";
import { telegramInit } from "../lib/telegram";
import { Loading } from "@/components/common/loading";
import { Profile } from "@/components/profile";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
	// eslint-disable-next-line
	const [user, setUser] = useState<any>(null);
	const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

	useEffect(() => {
		const tg = telegramInit();
		if (!tg) return;

		// tg.requestFullscreen();
		//set client safe area to display items correctly
		const { top, bottom, left, right } = tg.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
		setSafeArea({ top, bottom, left, right });

		const userData = tg.initDataUnsafe?.user;
		if (userData) setUser(userData);

		console.log(tg.safeAreaInset);
	}, []);

	return (
		<main
			className="flex flex-col items-center min-h-screen bg-gray-50"
			style={{
				paddingTop: safeArea.top + 50,
				paddingBottom: safeArea.bottom,
				paddingLeft: safeArea.left,
				paddingRight: safeArea.right
			}}
		>
			{user ? (
				<>
					<Profile photo_url={user.photo_url} first_name={user.first_name} />
					<Card className="w-full max-w-sm mt-8">
						<CardHeader>
							<CardTitle>ASLZAR Platformasi</CardTitle>
							<CardDescription>
								ASLZAR — zamonaviy to‘lovlar, cashback va sodiqlik tizimi uchun yaratilgan platforma. Bu yerda qulaylik va imkoniyatlar sizni
								kutmoqda!
							</CardDescription>
						</CardHeader>
						<CardContent></CardContent>
						<CardFooter className="flex-col gap-2"></CardFooter>
					</Card>
				</>
			) : (
				<Loading />
			)}
		</main>
	);
}
