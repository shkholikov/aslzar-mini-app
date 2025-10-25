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
					<Card className="w-full max-w-sm mt-8 mb-16">
						<CardHeader>
							<CardTitle>ASLZAR Platformasi</CardTitle>
							<CardDescription>
								<div className="space-y-4">
									<div>
										<h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0">Platforma haqida batafsil maʼlumot</h2>
										<p className="leading-7 text-muted-foreground mt-2">
											<strong>ASLZAR</strong> — Sizning sodiqlik va zamonaviy to‘lovlar markazingiz! Platformamiz orqali ishonchli, tez va xavfsiz
											to‘lovlar amalga oshirasiz. Har bir tranzaksiyada doimiy <span className="font-medium text-blue-600">keshbek</span> va
											<em> eksklyuziv takliflar</em> sizni kutmoqda. ASLZAR nafaqat sodiqlik tizimi, balki zamonaviy moliyaviy boshqaruvni ham oson va
											qulay qiladi.
										</p>
									</div>
									<div>
										<h3 className="scroll-m-20 text-xl font-semibold tracking-tight">Platformaning asosiy afzalliklari</h3>
										<ul className="my-4 ml-6 list-disc space-y-3">
											<li>
												<div>
													<h4 className="scroll-m-20 text-lg font-semibold tracking-tight">Qulay interfeys va tezkor ishlash</h4>
													<p className="text-muted-foreground text-sm mt-0.5">
														Minimalist va funksional dizayn tufayli platforma istalgan qurilmada juda qulay ishlaydi. Foydalanuvchilarga intuitiv
														boshqaruv va tez ro‘yxatdan o‘tish jarayoni taqdim etiladi.
													</p>
												</div>
											</li>
											<li>
												<div>
													<h4 className="scroll-m-20 text-lg font-semibold tracking-tight">Innovatsion sodiqlik tizimi</h4>
													<p className="text-muted-foreground text-sm mt-0.5">
														Qilgan to‘lovlaringiz uchun avtomatik keshbek va bonuslarni qo‘lga kiriting. Maxsus darajalar va sodiqlik g‘ildiragi
														orqali yana-da ko‘proq imtiyozlarga ega bo‘ling.
													</p>
												</div>
											</li>
											<li>
												<div>
													<h4 className="scroll-m-20 text-lg font-semibold tracking-tight">Yuqori darajadagi xavfsizlik</h4>
													<p className="text-muted-foreground text-sm mt-0.5">
														Ma’lumotlaringiz zamonaviy shifrlash texnologiyalari orqali himoyalanadi. Har bir tranzaksiya xavfsiz va kafolatlangan
														tarzda amalga oshiriladi.
													</p>
												</div>
											</li>
											<li>
												<div>
													<h4 className="scroll-m-20 text-lg font-semibold tracking-tight">Mijozlarni qo'llab-quvvatlash</h4>
													<p className="text-muted-foreground text-sm mt-0.5">
														Har qanday muammolar yuzaga kelganda, 24/7 ishlab turadigan yordam xizmati orqali yechim topasiz.
													</p>
												</div>
											</li>
										</ul>
									</div>
									<div>
										<blockquote className="mt-4 border-l-2 pl-4 italic text-gray-700">
											Platformaning barcha imkoniyatlaridan foydalaning va raqamli dunyodan maksimal darajada bahramand bo‘ling! ASLZAR — sodiqlik va
											ishonch maskani.
										</blockquote>
									</div>
								</div>
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
