"use client";

import { GLASS_CARD } from "@/lib/styles";
import { Header } from "@/components/common/header";
import { FinancialStatistics } from "./components/financial-statistics";
import { Contracts } from "./components/contracts";
import { UpcomingPayments } from "./components/upcoming-payments";
import { useUser } from "@/hooks/useUser";
import { RegisterPromptCard } from "@/components/common/register-prompt-card";
import { UserLoadError } from "@/components/common/user-load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/common/section-card";
import { ProductCarousel } from "@/components/common/product-carousel";

const GLASS = GLASS_CARD;

export default function FinancePage() {
	const { data, loading, error } = useUser();
	// useUser maps 404 (not a customer) to data: null with no error, so error without data is a failed
	// call: show a retry, never the register card (incidents.md, 2026-11-17). Same rule as Home.
	const failed = !loading && !data && Boolean(error);

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va shartnomalaringiz" iconImage="/icons/briefcase.webp" />
			<div>
				{loading ? (
					<>
						<div className="mx-2 my-2">
							<div className={`${GLASS} p-4 flex flex-col gap-2.5`}>
								<div className="flex items-center gap-3">
									<Skeleton className="size-[50px] rounded-xl shrink-0" />
									<div className="flex-1 flex flex-col gap-2">
										<Skeleton className="h-3 w-28" />
										<Skeleton className="h-6 w-44" />
									</div>
								</div>
								<Skeleton className="h-1.5 w-full rounded-full" />
								<div className="flex justify-between">
									<Skeleton className="h-3 w-28" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
						</div>
						<div className="mx-2 my-2 grid grid-cols-2 gap-2">
							{[0, 1, 2, 3].map((i) => (
								<div key={i} className={`${GLASS} px-4 py-3 flex flex-col items-center gap-2`}>
									<Skeleton className="size-[50px] rounded-xl" />
									<Skeleton className="h-3 w-3/4" />
									<Skeleton className="h-5 w-16 rounded-full" />
								</div>
							))}
						</div>
						<SectionCard iconImage="/icons/contract.webp" title="Shartnomalar" bare>
							<div className={`${GLASS} overflow-hidden`}>
								{[0, 1].map((i) => (
									<div key={i} className="px-4 py-3 flex flex-col gap-2 border-t border-border/80 first:border-t-0">
										<div className="flex justify-between">
											<Skeleton className="h-4 w-28" />
											<Skeleton className="h-4 w-24" />
										</div>
										<Skeleton className="h-1.5 w-full rounded-full" />
										<div className="flex justify-between">
											<Skeleton className="h-3 w-24" />
											<Skeleton className="h-3 w-16" />
										</div>
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
						<ProductCarousel />
					</>
				) : failed ? (
					<UserLoadError />
				) : (
					<RegisterPromptCard />
				)}
			</div>
		</div>
	);
}
