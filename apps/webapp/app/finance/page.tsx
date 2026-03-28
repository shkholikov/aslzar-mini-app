"use client";

import { Header } from "@/components/common/header";
import { FinancialStatistics } from "./components/financial-statistics";
import { Contracts } from "./components/contracts";
import { UpcomingPayments } from "./components/upcoming-payments";
import { useUser } from "@/hooks/useUser";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/common/section-card";

export default function FinancePage() {
	const { data, loading } = useUser();

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va shartnomalaringiz" iconImage="/icons/briefcase.png" />
			<div>
				{loading ? (
					<>
						<SectionCard iconImage="/icons/statistics.png" title="Moliyaviy Statistika">
							<div className="flex flex-wrap gap-2">
								{[0, 1, 2, 3, 4].map((i) => (
									<div key={i} className="flex-1 min-w-[calc(50%-0.5rem)] rounded-4xl border-2 px-4 py-3 flex flex-col items-center gap-2">
										<Skeleton className="w-12 h-12 rounded-md" />
										<Skeleton className="h-3 w-full" />
										<Skeleton className="h-5 w-16 rounded-full" />
									</div>
								))}
							</div>
						</SectionCard>
						<SectionCard iconImage="/icons/contract.png" title="Shartnomalar">
							<div className="flex flex-col gap-2 mt-2">
								{[0, 1, 2].map((i) => (
									<div key={i} className="flex gap-4">
										<Skeleton className="h-4 flex-1" />
										<Skeleton className="h-4 w-12" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</div>
						</SectionCard>
					</>
				) : data && data.code === 0 ? (
					<>
						<FinancialStatistics data={data} />
						<UpcomingPayments contracts={data?.contract?.ids || []} />
						<Contracts contracts={data?.contract?.ids || []} />
					</>
				) : (
					<RegisterPromptCard />
				)}
			</div>
		</div>
	);
}
