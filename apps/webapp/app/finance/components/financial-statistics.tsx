import { GLASS_CARD } from "@/lib/styles";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatSom } from "@/lib/format";
import { financeSummary, type Contract1C } from "@/lib/payments";
import { cn } from "@/lib/utils";

interface FinancialStatisticsProps {
	data: {
		contract?: { ids?: Contract1C[] };
		bonusOstatok?: number;
	};
}

const GLASS = GLASS_CARD;

/**
 * Lead card with what is still owed and how much of it is paid, then four tiles.
 *
 * Every figure is derived from the contracts (lib/payments.ts), not from 1C's account-level
 * `debt` / `remain` / `latePayment` / `contract.active`: 1C leaves those at 0 for every customer
 * (docs/1c-contract-status.md).
 */
export function FinancialStatistics({ data }: FinancialStatisticsProps) {
	const summary = financeSummary(data?.contract?.ids);
	const percent = summary.total > 0 ? Math.min(100, Math.round((summary.paid / summary.total) * 100)) : 0;

	return (
		<>
			<div className="mx-2 my-2">
				<div className={cn(GLASS, "p-4 flex flex-col gap-2.5")}>
					<div className="flex items-center gap-3">
						<Image src="/icons/calculator.webp" alt="" width={50} height={50} sizes="50px" className="object-contain shrink-0" />
						<div className="min-w-0 flex flex-col gap-0.5">
							<span className="text-xs text-muted-foreground">Umumiy qarzdorlik</span>
							<span className="text-2xl font-bold leading-tight">{formatSom(summary.debt)} so&apos;m</span>
						</div>
					</div>
					{summary.total > 0 && (
						<>
							<div
								className="h-1.5 rounded-full bg-black/10 overflow-hidden"
								role="img"
								aria-label={`${formatSom(summary.total)} so'mdan ${formatSom(summary.paid)} so'm to'langan`}
							>
								<span className="block h-full rounded-full bg-[#be9941]" style={{ width: `${percent}%` }} />
							</div>
							<div className="flex justify-between gap-2 text-xs text-muted-foreground">
								<span>To&apos;langan: {formatSom(summary.paid)} so&apos;m</span>
								<span>Jami: {formatSom(summary.total)} so&apos;m</span>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="mx-2 my-2 grid grid-cols-2 gap-2">
				<Tile icon="/icons/calendar.webp" label="Shu oy to'lanadi" value={`${formatSom(summary.thisMonth)} so'm`} />
				<Tile
					icon="/icons/money.webp"
					label="Kechikkan to'lovlar"
					value={summary.overdue > 0 ? `${formatSom(summary.overdue)} so'm` : "Yo'q"}
					muted={summary.overdue <= 0}
				/>
				<Tile icon="/icons/contract.webp" label="Faol shartnomalar" value={`${summary.activeCount} ta`} />
				<Tile icon="/icons/bonus.webp" label="Bonuslar" value={`${formatSom(data?.bonusOstatok ?? 0)} so'm`} />
			</div>
		</>
	);
}

function Tile({ icon, label, value, muted = false }: { icon: string; label: string; value: string; muted?: boolean }) {
	return (
		<div className={cn(GLASS, "px-4 py-3 flex flex-col items-center gap-1 text-center")}>
			<Image src={icon} alt="" width={50} height={50} sizes="50px" className="object-contain" />
			<div className="text-xs font-semibold">{label}</div>
			<Badge variant="default" className={muted ? "bg-muted text-foreground" : "bg-[#be9941] text-white"}>
				{value}
			</Badge>
		</div>
	);
}
