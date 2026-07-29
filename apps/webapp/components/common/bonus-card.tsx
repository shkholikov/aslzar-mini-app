"use client";

import { useCallback, useState } from "react";
import { QRCode } from "@/components/ui/shadcn-io/qr-code";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";
import { BonusCardOverlay } from "./bonus-card-overlay";
import { Maximize2 } from "lucide-react";

interface BonusCardProps {
	/** Raw 1C client id (e.g. "00-00073809") — encoded verbatim, that's what the in-store scanner reads. */
	clientId: string;
}

/**
 * Standalone card (not a SectionCard — the eyebrow and headline live inside the panel, so a
 * SectionCard heading above would duplicate them). Owns its own fullscreen state so any page can
 * drop it in with a single line.
 */
export function BonusCard({ clientId }: BonusCardProps) {
	const tg = useTelegram();
	const [expanded, setExpanded] = useState(false);

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

						<div className="flex shrink-0 flex-col items-center gap-1">
							{/* Hardcoded black-on-white: the theme's --foreground/--background would follow the
							    .dark variant and render an unscannable QR on this dark card. */}
							<div className="rounded-2xl bg-white p-2">
								<QRCode className="size-24" data={clientId} foreground="#000000" background="#ffffff" />
							</div>
							<p className="text-[11px] font-semibold tracking-wide text-white/80">{clientId}</p>
						</div>
					</div>

					<RippleButton variant="outline" className={`${goldButtonClass} mt-4 w-full`} onClick={open}>
						<Maximize2 className="size-4" /> QR kodni kattalashtirish
					</RippleButton>
				</div>
			</div>

			{expanded ? <BonusCardOverlay clientId={clientId} onClose={close} /> : null}
		</>
	);
}
