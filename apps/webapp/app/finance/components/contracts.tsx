"use client";

import * as React from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";
import { format1CDate } from "@/lib/format1cDate";
import { contractStatusLabel, isActiveContract } from "@/lib/contract-status";

const PAGE_SIZE = 5;

interface Pay {
	id: number;
	sum: number;
	comment: string;
	date: string;
}

interface Contract {
	id?: string;
	status?: string;
	sum: number;
	skidka: number;
	vznos: number;
	months: number;
	date: string;
	pays?: Pay[];
}

interface ContractsProps {
	contracts: Contract[];
}

/** Active contracts first, then newest first — what the customer is paying now leads the list. */
function sortContracts(contracts: Contract[]): Contract[] {
	return [...contracts].sort((a, b) => {
		const aActive = isActiveContract(a.status);
		const bActive = isActiveContract(b.status);
		if (aActive !== bActive) return aActive ? -1 : 1;
		return (b.date ?? "").localeCompare(a.date ?? "");
	});
}

export function Contracts({ contracts }: ContractsProps) {
	const tg = useTelegram();
	const [page, setPage] = React.useState(1);

	const sorted = React.useMemo(() => sortContracts(contracts), [contracts]);
	const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

	// `useUser()` revalidates, so the list can shrink under a page the customer is already on.
	React.useEffect(() => {
		setPage((p) => Math.min(Math.max(1, p), Math.max(1, totalPages)));
	}, [totalPages]);

	const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const goToPrev = () => {
		tg?.HapticFeedback?.impactOccurred("medium");
		setPage((p) => Math.max(1, p - 1));
	};

	const goToNext = () => {
		tg?.HapticFeedback?.impactOccurred("medium");
		setPage((p) => Math.min(totalPages, p + 1));
	};

	return (
		<SectionCard iconImage="/icons/contract.webp" title="Shartnomalar">
			<div className="mt-2">
				<Table>
					<TableCaption>Sizning barcha shartnomalaringiz.</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[100px]">Summa</TableHead>
							<TableHead>Muddati</TableHead>
							<TableHead>Sana</TableHead>
							<TableHead>Holati</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginated.length === 0 && (
							<TableRow>
								<TableCell colSpan={4} className="text-center text-muted-foreground">
									Shartnomalar yo&apos;q
								</TableCell>
							</TableRow>
						)}
						{paginated.map((contract, idx) => {
							const active = isActiveContract(contract.status);
							return (
								<TableRow key={contract.id ?? idx} className={active ? undefined : "opacity-60"}>
									<TableCell className="font-medium">{(contract.sum ?? 0).toLocaleString("uz-UZ")} so&apos;m</TableCell>
									<TableCell>{contract.months} oy</TableCell>
									<TableCell>{format1CDate(contract.date)}</TableCell>
									<TableCell>
										<Badge
											variant={active ? "default" : "secondary"}
											className={active ? "bg-[#be9941] text-white" : "bg-muted text-muted-foreground"}
										>
											{contractStatusLabel(contract.status)}
										</Badge>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>

				{totalPages > 1 && (
					<div className="flex items-center justify-between mt-4">
						<RippleButton variant="outline" className={goldButtonClass} onClick={goToPrev} disabled={page === 1}>
							← Oldingi
						</RippleButton>
						<span className="text-sm text-muted-foreground">
							{page} / {totalPages}
						</span>
						<RippleButton variant="outline" className={goldButtonClass} onClick={goToNext} disabled={page === totalPages}>
							Keyingi →
						</RippleButton>
					</div>
				)}
			</div>
		</SectionCard>
	);
}
