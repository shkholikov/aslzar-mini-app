"use client";

import { useCallback, useState } from "react";
import { QRCode } from "@/components/ui/shadcn-io/qr-code";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";
import { useBonusToken } from "@/hooks/useBonusToken";
import { BonusCardOverlay } from "./bonus-card-overlay";
import { Maximize2, WifiOff } from "lucide-react";

/**
 * Standalone card (not a SectionCard — the eyebrow and headline live inside the panel, so a
 * SectionCard heading above would duplicate them). Takes no props: the token and its refresh
 * lifecycle both come from useBonusToken, so any page can drop it in with a single line.
 */
export function BonusCard() {
	const tg = useTelegram();
	const { token, expired } = useBonusToken();
	const [expanded, setExpanded] = useState(false);

	const scannable = Boolean(token) && !expired;

	const open = useCallback(() => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		setExpanded(true);
	}, [tg]);

	const close = useCallback(() => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		setExpanded(false);
	}, [tg]);

	return (
		<>
			<div className="mx-2 my-2">
				<div className="rounded-4xl border-2 border-[#be9941]/25 bg-gradient-to-br from-[#2e2a25] to-[#1c1a17] p-4 shadow-md">
					<div className="flex items-start gap-4">
						<div className="min-w-0 flex-1">
							<p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d4b055]">ASLZAR BONUS KARTASI</p>
							<h3 className="mt-2 text-lg font-bold leading-snug text-white">Do&apos;konda skanerlash uchun QR kod</h3>
							<p className="mt-2 text-sm leading-snug text-white/60">
								Bonuslaringizni ishlatish uchun ushbu kodni ASLZAR do&apos;konlarida xodimga ko&apos;rsating.
							</p>
						</div>

						{/* Hardcoded black-on-white: the theme's --foreground/--background would follow the
						    .dark variant and render an unscannable QR on this dark card.
						    The payload is a signed token that expires after five minutes, not the client id —
						    a screenshot of this card is worthless once it lapses. See docs/1c-bonus-token.md. */}
						<div className="flex size-[112px] shrink-0 items-center justify-center rounded-2xl bg-white p-2">
							{scannable ? (
								<QRCode className="size-24" data={token!} foreground="#000000" background="#ffffff" />
							) : (
								<WifiOff className="size-8 text-black/25" />
							)}
						</div>
					</div>

					{scannable ? (
						<RippleButton variant="outline" className={`${goldButtonClass} mt-4 w-full`} onClick={open}>
							<Maximize2 className="size-4" /> QR kodni kattalashtirish
						</RippleButton>
					) : (
						/* An enlarged dead QR is worse than none: the cashier would scan it repeatedly and
						   blame the card rather than the connection. */
						<p className="mt-4 text-center text-sm leading-snug text-white/70">
							Kod yangilanmadi. Internetga ulaning va qaytadan urinib ko&apos;ring.
						</p>
					)}
				</div>
			</div>

			{expanded && scannable ? <BonusCardOverlay token={token!} onClose={close} /> : null}
		</>
	);
}
