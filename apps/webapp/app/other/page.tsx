"use client";

import { Header } from "@/components/common/header";
import { LayoutGrid, MapPinned } from "lucide-react";

export default function OtherPage() {
	return (
		<div className="pt-12">
			<Header title="Boshqa" description="Platformadagi boshqa imkoniyat va menu elementlari shu yerda ko‘rsatiladi." icon={LayoutGrid} />
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
