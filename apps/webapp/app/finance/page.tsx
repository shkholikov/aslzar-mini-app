"use client";

import { Header } from "@/components/common/header";
import { Loading } from "@/components/common/loading";
import { DataTableDemo } from "@/components/datatable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser } from "@/hooks/useUser";
import { BadgeInfo, Briefcase, HandCoins, ReceiptText } from "lucide-react";

export default function FinancePage() {
	const { data, loading } = useUser();
	console.log(data);

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va shartnomalaringiz shu yerda ko‘rsatiladi." icon={Briefcase} />
			<div className="mx-2">
				{loading ? (
					<div className="flex flex-col items-center">
						<Loading />
					</div>
				) : data.code === 0 ? (
					<>
						<div className="my-2 border rounded-lg bg-muted/50 bg-transparent p-4">
							<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
								<HandCoins className="size-5" />
								Moliyaviy Ma’lumotlar
							</h2>
							<div className="text-sm text-gray-700 mb-2">
								<p>
									<strong>Kontraktlar:</strong> {data.contract.ids.length}
								</p>
								<p>
									<strong>Qarz:</strong> {data.debt}
								</p>
								<p>
									<strong>Qolgan to&apos;lov:</strong> {data.remain}
								</p>
								<p>
									<strong>Kechikkan to&apos;lov:</strong> {data.latePayment}
								</p>
								<p>
									<strong>Bonuslar:</strong> {data.bonusOstatok}
								</p>
							</div>
							{/* <TelegramPostWidget post="ASLZAR_tilla/587723" /> */}
						</div>
						<h2 className="flex items-center gap-2 font-semibold text-xl mt-4">
							<ReceiptText className="size-5" />
							Kontraktlar:
						</h2>
						<DataTableDemo />
					</>
				) : (
					<Alert>
						<BadgeInfo />
						<AlertTitle>Moliyaviy ma&apos;lumotlar topilmadi.</AlertTitle>
						<AlertDescription>
							Sizning moliyaviy ma&apos;lumotlaringiz hozircha topilmadi. Iltimos, platformada to&apos;liq ro&apos;yxatdan o&apos;tganingizga ishonch
							hosil qiling.
						</AlertDescription>
					</Alert>
				)}
			</div>
		</div>
	);
}
