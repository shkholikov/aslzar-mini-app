"use client";

import { Header } from "@/components/common/header";
import { FinancialStatistics } from "./components/financial-statistics";
import { Contracts } from "./components/contracts";
import { UpcomingPayments } from "./components/upcoming-payments";
import { useUser } from "@/hooks/useUser";
import { CallToActionItem } from "@/components/common/call-to-action-item";
import { useTelegram } from "@/hooks/useTelegram";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/common/loading";

export default function FinancePage() {
	const { data, loading } = useUser();
	const tg = useTelegram();
	const router = useRouter();

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va shartnomalaringiz shu yerda ko'rsatiladi." iconImage="/icons/briefcase.png" />
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
					<CallToActionItem
						title="Siz hali ASLZAR mijozi emassiz."
						description="Ro'yxatdan o'ting va Aslzar mijoziga aylaning!"
						buttonText="Kirish"
						onButtonClick={() => {
							router.push("/register");
							tg?.HapticFeedback?.impactOccurred("light");
						}}
					/>
				)}
			</div>
		</div>
	);
}
