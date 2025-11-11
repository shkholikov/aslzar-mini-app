"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/common/loading";
import { Profile } from "@/components/profile";
import { usePathname, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { Link } from "@/components/common/link";
import { Gem, HandCoins, InfoIcon, Newspaper, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
	const pathname = usePathname();
	const router = useRouter();
	const tg = useTelegram();
	const { data, loading: dataLoading } = useUser();
	// eslint-disable-next-line
	const [user, setUser] = useState<any>(null);

	useEffect(() => {
		if (!tg) return;

		// Expand the app to full screen when opened on a mobile device
		const platform = tg.platform || "";
		const isMobile = platform === "android" || platform === "ios" || platform === "weba" || platform === "webk";
		if (isMobile) tg.requestFullscreen();

		const userData = tg.initDataUnsafe?.user;
		if (userData) {
			setUser(userData);
		}
	}, [tg, pathname, router]);

	return (
		<main className="flex flex-col items-center min-h-screen pt-12">
			{user ? (
				<>
					<Profile photo_url={user.photo_url} first_name={user.first_name} />
					{dataLoading ? (
						<Loading />
					) : data.code === 0 ? (
						<div className="m-2">
							<Link title="ASLZAR Rasmiy kanaliga a’zo bo‘ling." href="https://t.me/ASLZAR_tilla" icon={Gem} />

							<div className="my-2 border rounded-lg bg-muted/50 bg-transparent p-4">
								<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
									<InfoIcon className="size-5" />
									Platforma Haqida
								</h2>
								<div className="text-sm text-gray-700 mb-2">
									<p>
										Bu platforma orqali siz <strong>ASLZAR💎</strong> xizmatlaridan, shartnomasiz yoki shartnoma bilan, onlayn va xavfsiz
										foydalanishingiz mumkin.
									</p>
								</div>
								<Separator className="my-4" />

								<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
									<User className="size-5" />
									Asosiy Ma’lumotlar
								</h2>
								<div className="text-sm text-gray-700 mb-2">
									<p>
										<strong>FIO:</strong> {data.familiya} {data.imya} {data.otchestvo}
									</p>
									<p>
										<strong>Mijoz ID:</strong> {data.clientId}
									</p>
									<p>
										<strong>Raqam:</strong> {data.phone}
									</p>
									<p>
										<strong>INN:</strong> {data.INN || "noma'lum"}
									</p>
									<p>
										<strong>Passport:</strong> {data.Passport || "noma'lum"}
									</p>
								</div>
								<Separator className="my-4" />

								<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
									<HandCoins className="size-5" />
									Moliyaviy Ma’lumotlar
								</h2>
								<div className="text-sm text-gray-700 mb-2">
									<p>
										<strong>Kontraktlar:</strong> {data.contract.ids.length}
									</p>
									<p>
										<strong>Qarz:</strong> {data.debt}
									</p>
									<p>
										<strong>Kechikkan to'lovlar:</strong> {data.latePayment}
									</p>
									<p>
										<strong>INN:</strong> {data.INN || "noma'lum"}
									</p>
									<p>
										<strong>Passport:</strong> {data.Passport || "noma'lum"}
									</p>
								</div>
							</div>

							{/* <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(data, null, 2)}</pre> */}

							<div className="my-2 border rounded-lg bg-muted/50 bg-transparent p-4">
								<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
									<Newspaper className="size-5" />
									Yangiliklar
								</h2>
								<div className="text-sm text-gray-700 mb-2">
									<p>Bu yerga telegram kanaldagi so'nggi postlarni qo'shsak bo'ladi...</p>
								</div>
								{/* <TelegramPostWidget post="ASLZAR_tilla/587723" /> */}
							</div>
						</div>
					) : (
						<div className="w-full p-2">
							<Link title="ASLZAR Rasmiy kanaliga a’zo bo‘ling." href="https://t.me/ASLZAR_tilla" icon={Gem} />
						</div>
					)}
				</>
			) : (
				<Loading />
			)}
		</main>
	);
}
