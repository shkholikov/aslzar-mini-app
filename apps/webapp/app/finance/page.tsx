"use client";

import { Header } from "@/components/common/header";
import { Message } from "./components/message";
import { FinancialStatistics } from "./components/financial-statistics";
import { Contracts } from "./components/contracts";
import { useUser } from "@/hooks/useUser";
import { Briefcase, UserRoundX } from "lucide-react";

export default function FinancePage() {
	const { data, loading } = useUser();

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va shartnomalaringiz shu yerda ko’rsatiladi." icon={Briefcase} />
			<div>
				<FinancialStatistics data={data} loading={loading} />
				<Contracts contracts={data?.contract?.ids || []} loading={loading} />

				<Message
					icon={UserRoundX}
					title="Moliyaviy ma’lumotlar topilmadi."
					description="Sizning moliyaviy ma’lumotlaringiz hozircha topilmadi. Iltimos, platformada to’liq ro’yxatdan o’tganingizga ishonch hosil qiling."
				/>
			</div>
		</div>
	);
}
