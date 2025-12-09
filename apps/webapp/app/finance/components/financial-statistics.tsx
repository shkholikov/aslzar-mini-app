import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { SectionCard } from "@/components/common/section-card";
import { BookX, Calendar1, CalendarClockIcon, ChartAreaIcon, FileCheckIcon, HandCoinsIcon, ReceiptTextIcon } from "lucide-react";
import { Loading } from "@/components/common/loading";

interface FinancialStatisticsProps {
	data: {
		contract?: {
			active: number;
			ended: number;
			returned: number;
		};
		debt?: number;
		remain?: number;
		latePayment?: number;
	};
	loading: boolean;
}

export function FinancialStatistics({ data, loading }: FinancialStatisticsProps) {
	if (loading) return <Loading />;

	return (
		<SectionCard icon={ChartAreaIcon} title="Moliyaviy Statistika">
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
							<Badge variant="default">{data?.debt} so'm</Badge>
						</ItemDescription>
					</ItemContent>
				</Item>
				<ItemSeparator />
				<Item>
					<ItemMedia variant="icon">
						<Calendar1 />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Joriy oy bo'yicha qarzdorlik</ItemTitle>
					</ItemContent>
					<ItemContent>
						<ItemDescription>
							<Badge variant="default">{data?.remain} so'm</Badge>
						</ItemDescription>
					</ItemContent>
				</Item>
				<ItemSeparator />
				<Item>
					<ItemMedia variant="icon">
						<CalendarClockIcon />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Kechikkan to'lovlar summasi</ItemTitle>
					</ItemContent>
					<ItemContent>
						<ItemDescription>
							<Badge variant="default">{data?.latePayment} so'm</Badge>
						</ItemDescription>
					</ItemContent>
				</Item>
			</ItemGroup>
		</SectionCard>
	);
}
