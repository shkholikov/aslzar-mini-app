import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { SectionCard } from "@/components/common/section-card";
import { BookX, Calendar1, CalendarClockIcon, ChartAreaIcon, HandCoinsIcon, ReceiptTextIcon } from "lucide-react";
import { Loading } from "@/components/common/loading";
import { cn } from "@/lib/utils";

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
		bonusOstatok?: number;
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
							<Badge variant="destructive" className="bg-blue-500">
								{data?.contract?.active} ta
							</Badge>
						</ItemDescription>
					</ItemContent>
				</Item>
				<ItemSeparator />
				<Item>
					<ItemMedia variant="icon">
						<BookX />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Bonuslar miqdori</ItemTitle>
					</ItemContent>
					<ItemContent>
						<ItemDescription>
							<Badge variant="default" className="bg-blue-500">
								{data?.bonusOstatok} so&apos;m
							</Badge>
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
							<Badge variant="default" className={cn(data?.debt && data?.debt > 0 ? "bg-amber-400" : "bg-blue-500")}>
								{data?.debt} so&apos;m
							</Badge>
						</ItemDescription>
					</ItemContent>
				</Item>
				<ItemSeparator />
				<Item>
					<ItemMedia variant="icon">
						<Calendar1 />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Joriy oy bo&apos;yicha qarzdorlik</ItemTitle>
					</ItemContent>
					<ItemContent>
						<ItemDescription>
							<Badge variant="default" className={cn(data?.remain && data?.remain > 0 ? "bg-amber-400" : "bg-blue-500")}>
								{data?.remain} so&apos;m
							</Badge>
						</ItemDescription>
					</ItemContent>
				</Item>
				<ItemSeparator />
				<Item>
					<ItemMedia variant="icon">
						<CalendarClockIcon />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Kechikkan to&apos;lovlar summasi</ItemTitle>
					</ItemContent>
					<ItemContent>
						<ItemDescription>
							<Badge variant="default" className={cn(data?.latePayment && data?.latePayment > 0 ? "bg-amber-400" : "bg-blue-500")}>
								{data?.latePayment} so&apos;m
							</Badge>
						</ItemDescription>
					</ItemContent>
				</Item>
			</ItemGroup>
		</SectionCard>
	);
}
