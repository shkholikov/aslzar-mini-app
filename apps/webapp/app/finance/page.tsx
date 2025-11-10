"use client";

import { Header } from "@/components/common/header";
import { DataTableDemo } from "@/components/datatable";
import { useUser } from "@/hooks/useUser";
import { Briefcase } from "lucide-react";

export default function FinancePage() {
	const { data, loading } = useUser();

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va balansingiz shu yerda ko‘rsatiladi." icon={Briefcase} />
			<div className="mx-2">
				<h2 className="text-base font-bold mb-2 text-gray-800">Shartnomalar</h2>
				<div className="text-sm text-gray-700">
					<p>Shartnomalaringiz va to‘lovlarni shu yerda ko‘rishingiz mumkin.</p>
				</div>
				<DataTableDemo />
			</div>
		</div>
	);
}
