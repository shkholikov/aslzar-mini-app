"use client";

import { Header } from "@/components/common/header";
import { Loading } from "@/components/common/loading";
import { Message } from "@/components/common/message";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from "@/hooks/useUser";
import { Briefcase, HandCoins, ReceiptText, UserRoundX } from "lucide-react";

// TEST DATA: you can change or remove these later
type ContractTest = {
	amount: number;
	monthly: number;
	duration: string;
	paymentDate: string;
	remain: number;
};

const contractsTestData: ContractTest[] = [
	{
		amount: 5000000,
		monthly: 834000,
		duration: "6 oy",
		paymentDate: "2024-06-24",
		remain: 2000000
	},
	{
		amount: 3250000,
		monthly: 541667,
		duration: "6 oy",
		paymentDate: "2024-07-24",
		remain: 500000
	},
	{
		amount: 10500000,
		monthly: 1750000,
		duration: "6 oy",
		paymentDate: "2024-08-20",
		remain: 8000000
	},
	{
		amount: 7300000,
		monthly: 1042857,
		duration: "7 oy",
		paymentDate: "2024-09-15",
		remain: 3000000
	},
	{
		amount: 2750000,
		monthly: 458333,
		duration: "6 oy",
		paymentDate: "2024-10-01",
		remain: 1250000
	}
];

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

						<div className="my-2 border rounded-lg bg-muted/50 bg-transparent p-4">
							<h2 className="flex items-center gap-2 font-semibold text-xl">
								<ReceiptText className="size-5" />
								Shartnomalar
							</h2>

							<>
								<Table>
									<TableCaption>Sizning hamma aktiv shartnomalaringiz.</TableCaption>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[100px]">Summa</TableHead>
											<TableHead>Oylik to'lov</TableHead>
											<TableHead>Muddati</TableHead>
											<TableHead>To'lov sanasi</TableHead>
											<TableHead>Qoldiq</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{contractsTestData.map((contract, idx) => (
											<TableRow key={idx}>
												<TableCell className="font-medium">{contract.amount}</TableCell>
												<TableCell>{contract.monthly}</TableCell>
												<TableCell>{contract.duration}</TableCell>
												<TableCell>{contract.paymentDate}</TableCell>
												<TableCell>{contract.remain}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</>
						</div>
					</>
				) : (
					<Message
						icon={UserRoundX}
						title="Moliyaviy ma'lumotlar topilmadi."
						description="Sizning moliyaviy ma'lumotlaringiz hozircha topilmadi. Iltimos, platformada to'liq ro'yxatdan o'tganingizga ishonch hosil qiling."
					/>
				)}
			</div>
		</div>
	);
}
