"use client";

import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";
import { CloudOff, SearchX, TriangleAlert } from "lucide-react";

/**
 * The one place the catalogue says "there is nothing here".
 *
 * Three situations look identical to a customer staring at a blank grid but mean different
 * things, and telling them apart is the whole point:
 *
 *   unavailable — the catalogue service is down. Nothing is wrong with their filters, and
 *                 trying again in a minute genuinely may work.
 *   error       — something else broke on our side.
 *   empty       — the request worked; these filters simply match nothing.
 *
 * Getting this wrong is worse than it sounds: a customer shown "nothing found" during an
 * outage concludes the shop is empty and leaves.
 */

export type CatalogStateKind = "unavailable" | "error" | "empty";

const COPY = {
	unavailable: {
		Icon: CloudOff,
		title: "Katalog vaqtincha mavjud emas",
		description: "Texnik ishlar olib borilmoqda. Birozdan so'ng qayta urinib ko'ring.",
		action: "Qayta urinish"
	},
	error: {
		Icon: TriangleAlert,
		title: "Katalogni yuklab bo'lmadi",
		description: "Ulanishda muammo bo'ldi. Internetni tekshirib, qayta urinib ko'ring.",
		action: "Qayta urinish"
	},
	empty: {
		Icon: SearchX,
		title: "Hech narsa topilmadi",
		description: "Filtrlarni o'zgartirib ko'ring.",
		action: undefined as string | undefined
	}
} as const;

interface Props {
	kind: CatalogStateKind;
	/** Overrides the default action label — the empty state uses "Filtrlarni tozalash". */
	actionLabel?: string;
	onAction?: () => void;
}

export function CatalogState({ kind, actionLabel, onAction }: Props) {
	const tg = useTelegram();
	const { Icon, title, description, action } = COPY[kind];
	const label = actionLabel ?? action;

	return (
		// Plain centred card rather than <Item>: that component lays its slots out in a row and
		// left-aligns the media, which is why the icon sat in the corner.
		<div className="col-span-2 flex flex-col items-center gap-3 py-10 px-6 text-center border-2 rounded-4xl backdrop-blur-[10px] bg-muted/50 shadow-md">
			<Icon className="size-12 text-[#be9941]" strokeWidth={1.5} />
			<div className="flex flex-col gap-1">
				<p className="font-semibold">{title}</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			{label && onAction && (
				<RippleButton
					variant="outline"
					className={`${goldButtonClass} mt-1`}
					onClick={() => {
						tg?.HapticFeedback?.impactOccurred("light");
						onAction();
					}}
				>
					{label}
				</RippleButton>
			)}
		</div>
	);
}
