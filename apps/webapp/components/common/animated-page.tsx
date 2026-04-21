"use client";

import { usePathname } from "next/navigation";

/**
 * Keyed by pathname so React remounts this wrapper on every route change,
 * which re-fires the CSS `page-enter` animation defined in globals.css.
 * Mirrors BotFather's entry animation (opacity + scale 1.02 → 1, 200ms).
 */
export function AnimatedPage({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	return (
		<div key={pathname} className="page-transition">
			{children}
		</div>
	);
}
