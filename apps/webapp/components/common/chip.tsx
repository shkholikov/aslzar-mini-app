"use client";

import type { ReactNode } from "react";

/** Pill filter used by the catalogue categories and the Finance contract tabs. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold border-2 transition-colors ${
				active ? "bg-[#be9941] border-[#be9941] text-white" : "bg-muted/50 border-border text-muted-foreground"
			}`}
		>
			{children}
		</button>
	);
}
