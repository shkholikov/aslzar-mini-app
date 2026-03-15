"use client";

import { Header } from "@/components/common/header";
import { FinancialStatistics } from "./components/financial-statistics";
import { Contracts } from "./components/contracts";
import { UpcomingPayments } from "./components/upcoming-payments";
import { useUser } from "@/hooks/useUser";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { Loading } from "@/components/common/loading";

export default function FinancePage() {
	const { data, loading } = useUser();

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va shartnomalaringiz" iconImage="/icons/briefcase.png" />
			<div>
				{loading ? (
					<Loading />
				) : data && data.code === 0 ? (
					<>
						<FinancialStatistics data={data} loading={loading} />
						<UpcomingPayments contracts={data?.contract?.ids || []} loading={loading} />
						<Contracts contracts={data?.contract?.ids || []} loading={loading} />
					</>
				) : (
					<RegisterPromptCard />
				)}
			</div>
		</div>
	);
}
