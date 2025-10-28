"use client";

import { Header } from "@/components/common/header";
import { LayoutGrid } from "lucide-react";

export default function OtherPage() {
	return (
		<div className="pt-12">
			<Header title="Boshqa" description="Platformadagi boshqa imkoniyat va menu elementlari shu yerda ko‘rsatiladi." icon={LayoutGrid} />
		</div>
	);
}
