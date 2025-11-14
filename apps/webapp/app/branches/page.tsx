"use client";

import { Header } from "@/components/common/header";
import { useUser } from "@/hooks/useUser";
import { MapPinned, StoreIcon } from "lucide-react";

export default function SettingsPage() {
	const { data, loading: dataLoading } = useUser();

	return (
		<div className="pt-12">
			<Header title="Filiallar" description="Profil va dastur sozlamalarini shu yerda o‘zgartirishingiz mumkin." icon={StoreIcon} />
			<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
				<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
					<MapPinned className="size-5" />
					Bizning Filiallar
				</h2>
				<div className="text-sm text-gray-700 mb-2">
					<p>
						<strong>Bu yerda filiallar va boshqalar bo‘ladi...</strong>
					</p>
				</div>
				{/* <TelegramPostWidget post="ASLZAR_tilla/587723" /> */}
			</div>
		</div>
	);
}
