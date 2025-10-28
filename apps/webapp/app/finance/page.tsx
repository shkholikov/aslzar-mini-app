"use client";

import { Header } from "@/components/common/header";
import { Briefcase } from "lucide-react";

export default function FinancePage() {
	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va balansingiz shu yerda ko‘rsatiladi." icon={Briefcase} />
		</div>
	);
}
