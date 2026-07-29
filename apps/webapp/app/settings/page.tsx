"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { BonusCard } from "@/components/common/bonus-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { useTelegram } from "@/hooks/useTelegram";

export default function SettingsPage() {
	const { data, loading } = useUser();
	const tg = useTelegram();
	const router = useRouter();

	// This page is reachable via the Telegram gear (not a <Link>), so wire the
	// BackButton here to keep return-navigation consistent regardless of entry point.
	useEffect(() => {
		if (!tg?.BackButton) return;

		const onBack = () => {
			tg.HapticFeedback?.impactOccurred("heavy");
			router.back();
			tg.BackButton.hide?.();
		};

		tg.BackButton.show?.();
		tg.BackButton.onClick?.(onBack);

		return () => {
			tg.BackButton.offClick?.(onBack);
			tg.BackButton.hide?.();
		};
	}, [tg, router]);

	const tgUser = tg?.initDataUnsafe?.user;

	return (
		<div className="pt-12">
			<Header title="Shaxsiy ma'lumotlar" description="Hisob ma'lumotlaringiz" iconImage="/icons/user-info.webp" />

			{loading ? (
				<SectionCard iconImage="/icons/user-info.webp" title="Asosiy Maʼlumotlar">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				</SectionCard>
			) : data && data.code === 0 ? (
				<>
					<SectionCard iconImage="/icons/user-info.webp" title="Asosiy Maʼlumotlar">
						<div className="flex flex-col gap-1">
							<p>
								<strong>FIO:</strong> {[data.familiya, data.imya, data.otchestvo].filter(Boolean).join(" ")}
							</p>
							<p>
								<strong>Mijoz ID:</strong> {data.clientId}
							</p>
							<p>
								<strong>Raqam:</strong> {data.phone}
							</p>
							{data.suboffice ? (
								<p>
									<strong>Filial:</strong> {data.suboffice}
								</p>
							) : null}
							{data.inn ? (
								<p>
									<strong>STIR:</strong> {data.inn}
								</p>
							) : null}
						</div>
					</SectionCard>

					<SectionCard iconImage="/icons/user.webp" title="Telegram hisobi">
						<div className="flex flex-col gap-1">
							{tgUser?.username ? (
								<p>
									<strong>Username:</strong> @{tgUser.username}
								</p>
							) : null}
							<p>
								<strong>Telegram ID:</strong> {tgUser?.id ?? "—"}
							</p>
							{tgUser?.language_code ? (
								<p>
									<strong>Til:</strong> {tgUser.language_code}
								</p>
							) : null}
						</div>
					</SectionCard>

					{/* Same gate as the home screen: ASLZAR customers only. */}
					{data.contractFirst === true && data.clientId ? <BonusCard clientId={data.clientId} /> : null}
				</>
			) : (
				<RegisterPromptCard />
			)}
		</div>
	);
}
