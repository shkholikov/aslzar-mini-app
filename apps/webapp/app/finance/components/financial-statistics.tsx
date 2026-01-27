import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/common/section-card";
import { Loading } from "@/components/common/loading";
import Image from "next/image";

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
		<SectionCard iconImage="/icons/statistics.png" title="Moliyaviy Statistika">
			<div className="flex flex-wrap gap-2">
				<div className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-4 py-3 flex flex-col items-center gap-1">
					<Image src="/icons/contract.png" alt="Faol shartnomalar" width={50} height={50} className="object-contain" />
					<div className="text-xs font-semibold text-center">Faol shartnomalar:</div>
					<Badge variant="destructive" className="bg-[#be9941] text-white">
						{data?.contract?.active} ta
					</Badge>
				</div>
				<div className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-4 py-3 flex flex-col items-center gap-1">
					<Image src="/icons/bonus.png" alt="Bonuslar" width={50} height={50} className="object-contain" />
					<div className="text-xs font-semibold text-center">Bonuslar miqdori:</div>
					<Badge variant="default" className="bg-[#be9941] text-white">
						{data?.bonusOstatok} so&apos;m
					</Badge>
				</div>
				<div className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-4 py-3 flex flex-col items-center gap-1">
					<Image src="/icons/calculator.png" alt="Qarzdorlik" width={50} height={50} className="object-contain" />
					<div className="text-xs font-semibold text-center">Umumiy qarzdorlik summasi:</div>
					<Badge variant="default" className="bg-[#be9941] text-white">
						{data?.debt} so&apos;m
					</Badge>
				</div>
				<div className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-4 py-3 flex flex-col items-center gap-1">
					<Image src="/icons/calendar.png" alt="Joriy oy qarzdorlik" width={50} height={50} className="object-contain" />
					<div className="text-xs font-semibold text-center">Joriy oy bo&apos;yicha qarzdorlik:</div>
					<Badge variant="default" className="bg-[#be9941] text-white">
						{data?.remain} so&apos;m
					</Badge>
				</div>
				<div className="flex-1 min-w-[calc(50%-0.5rem)] backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2 px-4 py-3 flex flex-col items-center gap-1">
					<Image src="/icons/money.png" alt="Kechikkan to'lovlar" width={50} height={50} className="object-contain" />
					<div className="text-xs font-semibold text-center">Kechikkan to&apos;lovlar summasi:</div>
					<Badge variant="default" className="bg-[#be9941] text-white">
						{data?.latePayment} so&apos;m
					</Badge>
				</div>
			</div>
		</SectionCard>
	);
}
