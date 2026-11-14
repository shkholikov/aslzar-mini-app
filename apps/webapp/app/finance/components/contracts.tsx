"use client";

import { GLASS_CARD } from "@/lib/styles";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Gem } from "lucide-react";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { SectionCard } from "@/components/common/section-card";
import { ListGroup, type ListGroupRow } from "@/components/common/list-group";
import { Chip } from "@/components/common/chip";
import { useTelegram } from "@/hooks/useTelegram";
import { format1CDate } from "@/lib/format1cDate";
import { formatSom } from "@/lib/format";
import { contractStatusLabel, isActiveContract } from "@/lib/contract-status";
import { contractIdOf, contractProgress, type Contract1C } from "@/lib/payments";

interface ContractsProps {
	contracts: Contract1C[];
}

type Tab = "active" | "closed";

/** Active contracts first, then newest first — what the customer is paying now leads the list. */
function sortContracts(contracts: Contract1C[]): Contract1C[] {
	return [...contracts].sort((a, b) => {
		const aActive = isActiveContract(a.status);
		const bActive = isActiveContract(b.status);
		if (aActive !== bActive) return aActive ? -1 : 1;
		return (b.date ?? "").localeCompare(a.date ?? "");
	});
}

export function Contracts({ contracts }: ContractsProps) {
	const tg = useTelegram();
	const router = useRouter();

	const sorted = React.useMemo(() => sortContracts(contracts), [contracts]);
	const active = sorted.filter((c) => isActiveContract(c.status));
	const closed = sorted.filter((c) => !isActiveContract(c.status));

	// Open on «Faol» unless there is nothing active; a choice the customer made sticks.
	const [picked, setPicked] = React.useState<Tab | null>(null);
	// A pick whose side has since emptied (useUser revalidates) is ignored: the chips are hidden
	// then, so the customer could not switch back.
	const usable = picked === "active" ? active.length > 0 : picked === "closed" ? closed.length > 0 : false;
	const tab: Tab = usable && picked ? picked : active.length > 0 || closed.length === 0 ? "active" : "closed";
	const shown = tab === "active" ? active : closed;

	const pick = (next: Tab) => () => {
		tg?.HapticFeedback?.impactOccurred("light");
		setPicked(next);
	};

	const rows: ListGroupRow[] = shown.map((contract, idx) => {
		const isActive = isActiveContract(contract.status);
		const progress = contractProgress(contract);
		const percent = progress.steps > 0 ? Math.round((progress.paidSteps / progress.steps) * 100) : 0;
		const meta = [contract.date ? format1CDate(contract.date) : null, contract.months ? `${contract.months} oy` : null]
			.filter(Boolean)
			.join(" · ");

		return {
			id: String(contractIdOf(contract) ?? idx),
			title: (
				<span className={`flex w-full flex-col gap-1.5 ${isActive ? "" : "opacity-60"}`}>
					<span className="flex justify-between gap-2">
						<span>{contractIdOf(contract)}</span>
						<span>{formatSom(contract.sum ?? 0)} so&apos;m</span>
					</span>
					{isActive && progress.steps > 0 && (
						<span
							className="block h-1.5 rounded-full bg-black/10 overflow-hidden"
							role="img"
							aria-label={`${progress.steps} ta to'lovdan ${progress.paidSteps} tasi to'langan`}
						>
							<span className="block h-full rounded-full bg-[#be9941]" style={{ width: `${percent}%` }} />
						</span>
					)}
					<span className="flex justify-between gap-2 text-xs font-normal text-muted-foreground">
						<span>{meta}</span>
						<span>
							{isActive
								? progress.steps > 0
									? `${progress.paidSteps} / ${progress.steps} to'lov`
									: contractStatusLabel(contract.status)
								: contractStatusLabel(contract.status)}
						</span>
					</span>
				</span>
			)
		};
	});

	return (
		<SectionCard iconImage="/icons/contract.webp" title="Shartnomalar" bare>
			{/* A filter with an empty side filters nothing; the default tab already picks the
			    non-empty group, so the chips only appear when there is a real choice. */}
			{active.length > 0 && closed.length > 0 && (
				<div className="flex gap-2 mb-2">
					<Chip active={tab === "active"} onClick={pick("active")}>
						Faol · {active.length}
					</Chip>
					<Chip active={tab === "closed"} onClick={pick("closed")}>
						Yopilgan · {closed.length}
					</Chip>
				</div>
			)}
			{rows.length > 0 ? (
				<ListGroup rows={rows} className="m-0" />
			) : (
				// No contracts yet: turn the empty section into a nudge to the catalogue, same card
				// as ReferralLockedCard on /referral.
				<div className={`p-4 ${GLASS_CARD}`}>
					<p className="text-muted-foreground text-sm mb-4">
						Sizda hozircha shartnoma yo&apos;q. Katalogdan o&apos;zingizga yoqqan buyumni tanlang va birinchi xaridingizni qiling!
					</p>
					<RippleButton
						variant="outline"
						size="default"
						className={`w-full ${goldButtonClass}`}
						onClick={() => {
							tg?.HapticFeedback?.impactOccurred("heavy");
							router.push("/catalog");
						}}
					>
						<Gem className="size-4 shrink-0" />
						Katalogni ko&apos;rish
					</RippleButton>
				</div>
			)}
		</SectionCard>
	);
}
