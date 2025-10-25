"use client";

import { useEffect, useState } from "react";
import { telegramInit } from "../lib/telegram";
import { Loading } from "@/components/common/loading";
import { Profile } from "@/components/profile";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuDock } from "@/components/ui/shadcn-io/menu-dock";

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
								<h3>Platforma haqida qisqacha maʼlumot</h3>
								<h5>ASLZAR – Sizning sodiqlik va zamonaviy to‘lovlar markazingiz!</h5>
								<p>ASLZAR orqali hamyonbop va ishonchli to‘lovlarni amalga oshiring, doimiy keshbek va eksklyuziv takliflardan bahramand bo‘ling.</p>
								<h3>Afzalliklar</h3>
								<ul>
									<li>
										<h5>Qulay interfeys</h5>
										<p>Foydalanuvchiga qulay va tez ishlaydigan platforma.</p>
									</li>
									<li>
										<h5>Sodiqlik tizimi</h5>
										<p>To‘lovlaringizdan foyda ko‘ring va bonuslarga ega bo‘ling.</p>
									</li>
									<li>
										<h5>Xavfsizlik</h5>
										<p>Ma’lumotlaringiz yuqori darajada himoyalangan.</p>
									</li>
								</ul>
								<h5>Platformaning barcha imkoniyatlaridan foydalaning va raqamli dunyodan maksimal darajada bahra oling!</h5>
							</CardDescription>
						</CardHeader>
						<CardContent></CardContent>
						<CardFooter className="flex-col gap-2"></CardFooter>
					</Card>
					<div className="flex items-end justify-center min-h-[120px] fixed bottom-4">
						<MenuDock variant="compact" animated={false} />
					</div>
				</>
			) : (
				<Loading />
			)}
		</main>
	);
}
