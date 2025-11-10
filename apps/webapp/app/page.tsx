"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/common/loading";
import { Profile } from "@/components/profile";
import { usePathname, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { Link } from "@/components/common/link";
import { Gem } from "lucide-react";

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
							<div className="my-2 bg-white rounded-lg shadow p-4">
								<h2 className="text-base font-bold mb-2 text-gray-800">Sizning Ma’lumotlaringiz</h2>
								<div className="text-sm text-gray-700">
									<p>
										<strong>To’liq ismingiz:</strong> {data.familiya} {data.imya} {data.otchestvo}
									</p>
									<p>
										<strong>Sizning Mijoz ID:</strong> {data.clientId}
									</p>
								</div>
								<hr className="my-3" />
								<h2 className="text-base font-bold mb-2 text-gray-800">Platforma Haqida</h2>
								<div className="text-sm text-gray-700">
									<p>Bu platforma orqali siz ASLZAR xizmatlaridan, shartnomasiz yoki shartnoma bilan, onlayn va xavfsiz foydalanishingiz mumkin.</p>
									<p className="mt-2">Ko’proq ma’lumot uchun rasmiy kanalimizga qo‘shiling yoki podporqa xizmatiga murojaat qiling.</p>
								</div>
							</div>

							{/* <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(data, null, 2)}</pre> */}
							<Link title="ASLZAR Rasmiy kanaliga a’zo bo‘ling." href="https://t.me/ASLZAR_tilla" icon={Gem} />
						</div>
					) : (
						<div className="p-2">
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
