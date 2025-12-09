"use client";

import { Header } from "@/components/common/header";
import { Loading } from "@/components/common/loading";
import { Message } from "./components/message";
import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from "@/hooks/useUser";
import {
	BookX,
	Briefcase,
	Calendar1,
	CalendarClockIcon,
	ChartAreaIcon,
	FileCheckIcon,
	HandCoinsIcon,
	ReceiptText,
	ReceiptTextIcon,
	UserRoundX
} from "lucide-react";

export default function FinancePage() {
	const { data, loading } = useUser();

	return (
		<div className="pt-12">
			<Header title="Moliyaviy" description="Moliyaviy faoliyatingiz va shartnomalaringiz shu yerda ko’rsatiladi." icon={Briefcase} />
			<div className="mx-2">
				{loading ? (
					<div className="flex flex-col items-center">
						<Loading />
					</div>
				) : data.code === 0 ? (
					<>
						<div className="my-2 border rounded-lg bg-muted/50 bg-transparent p-4">
							<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
								<ChartAreaIcon className="size-5" />
								Moliyaviy Statistika
							</h2>

							<ItemGroup>
								<Item>
									<ItemMedia variant="icon">
										<ReceiptTextIcon />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Faol shartnomalar soni</ItemTitle>
									</ItemContent>
									<ItemContent>
										<ItemDescription>
											<Badge variant="default">{data?.contract?.active} ta</Badge>
										</ItemDescription>
									</ItemContent>
								</Item>
								<ItemSeparator />
								<Item>
									<ItemMedia variant="icon">
										<FileCheckIcon />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Yopilgan shartnomalar soni</ItemTitle>
									</ItemContent>
									<ItemContent>
										<ItemDescription>
											<Badge variant="default">{data?.contract?.ended} ta</Badge>
										</ItemDescription>
									</ItemContent>
								</Item>
								<Item>
									<ItemMedia variant="icon">
										<BookX />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Qaytgan shartnomalar soni</ItemTitle>
									</ItemContent>
									<ItemContent>
										<ItemDescription>
											<Badge variant="default">{data?.contract?.returned} ta</Badge>
										</ItemDescription>
									</ItemContent>
								</Item>
								<ItemSeparator />
								<Item>
									<ItemMedia variant="icon">
										<HandCoinsIcon />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Umumiy qarzdorlik summasi</ItemTitle>
									</ItemContent>
									<ItemContent>
										<ItemDescription>
											<Badge variant="default">{data?.debt} so’m</Badge>
										</ItemDescription>
									</ItemContent>
								</Item>
								<ItemSeparator />
								<Item>
									<ItemMedia variant="icon">
										<Calendar1 />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Joriy oy bo’yicha qarzdorlik</ItemTitle>
									</ItemContent>
									<ItemContent>
										<ItemDescription>
											<Badge variant="default">{data?.remain} so’m</Badge>
										</ItemDescription>
									</ItemContent>
								</Item>
								<ItemSeparator />
								<Item>
									<ItemMedia variant="icon">
										<CalendarClockIcon />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Kechikkan to’lovlar summasi</ItemTitle>
									</ItemContent>
									<ItemContent>
										<ItemDescription>
											<Badge variant="default">{data?.latePayment} so’m</Badge>
										</ItemDescription>
									</ItemContent>
								</Item>
							</ItemGroup>
						</div>

						<div className="my-2 border rounded-lg bg-muted/50 bg-transparent p-4">
							<h2 className="flex items-center gap-2 font-semibold text-xl">
								<ReceiptText className="size-5" />
								Shartnomalar
							</h2>

							<div className="mt-2">
								<Table>
									<TableCaption>Sizning hamma aktiv shartnomalaringiz.</TableCaption>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[100px]">Summa</TableHead>
											<TableHead>Oylik to’lov</TableHead>
											<TableHead>Muddati</TableHead>
											<TableHead>Sana</TableHead>
											<TableHead>Qoldiq</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{
											// eslint-disable-next-line
											data?.contract?.ids.map((contract: any, idx: number) => (
												<TableRow key={idx}>
													<TableCell className="font-medium">{contract.sum}</TableCell>
													<TableCell>{contract.vznos}</TableCell>
													<TableCell>{contract.months} oy</TableCell>
													<TableCell>{new Date(contract.date).toLocaleDateString("uz-UZ")}</TableCell>
													<TableCell>{contract.vznos}</TableCell>
												</TableRow>
											))
										}
									</TableBody>
								</Table>
							</div>
						</div>
					</>
				) : (
					<Message
						icon={UserRoundX}
						title="Moliyaviy ma’lumotlar topilmadi."
						description="Sizning moliyaviy ma’lumotlaringiz hozircha topilmadi. Iltimos, platformada to’liq ro’yxatdan o’tganingizga ishonch hosil qiling."
					/>
				)}
			</div>
		</div>
	);
}
