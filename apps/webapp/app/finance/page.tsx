"use client";

import { Header } from "@/components/common/header";
import { Briefcase } from "lucide-react";

export default function FinancePage() {
	return (
		<>
			<Header
				title="Moliyaviy"
				description="Moliyaviy faoliyatingiz va balansingiz shu yerda ko‘rsatiladi."
				icon={Briefcase}
			/>
		</>
	);
}
