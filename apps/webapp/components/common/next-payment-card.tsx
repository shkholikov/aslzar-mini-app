"use client";

import { GLASS_CARD } from "@/lib/styles";
import { useMemo } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTelegram } from "@/hooks/useTelegram";
import { useUser } from "@/hooks/useUser";
import { formatSom } from "@/lib/format";
import { format1CDate } from "@/lib/format1cDate";
import { daysLeftLabel, nextPayment } from "@/lib/payments";

/**
 * Home: the customer's next instalment, one tap from Finance. Renders nothing while the user is
 * loading, for non-customers, and when no active contract has an unpaid instalment ahead.
 */
export function NextPaymentCard() {
	const tg = useTelegram();
	const { data, loading } = useUser();
	const payment = useMemo(() => (data?.code === 0 ? nextPayment(data.contract?.ids) : null), [data]);

	if (loading || !payment) return null;

	const date = format1CDate(payment.date, { day: "numeric", month: "long" });

	return (
		<div className="mx-2 my-2">
			<NextLink
				href="/finance"
				onClick={() => tg?.HapticFeedback?.impactOccurred("heavy")}
				className={`flex items-center gap-3 px-4 py-3 active:opacity-60 transition-opacity ${GLASS_CARD}`}
			>
				<Image src="/icons/calendar.webp" alt="" width={48} height={48} className="size-12 object-contain shrink-0" />
				<div className="min-w-0 flex-1 flex flex-col gap-0.5">
					<span className="text-xs text-muted-foreground">Keyingi to&apos;lov · {date}</span>
					<span className="text-[17px] font-bold leading-tight">{formatSom(payment.left)} so&apos;m</span>
				</div>
				<Badge variant="default" className="bg-[#be9941] text-white">
					{daysLeftLabel(payment.daysLeft)}
				</Badge>
				<ChevronRight aria-hidden className="size-[18px] shrink-0 text-muted-foreground" />
			</NextLink>
		</div>
	);
}
