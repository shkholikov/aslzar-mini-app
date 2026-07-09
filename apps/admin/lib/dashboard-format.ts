/** Client-safe number formatters for the dashboard (no server imports). */

/** Integer with ru-RU thousands grouping, e.g. 1 234. */
export function num(v: number): string {
	return Math.round(v).toLocaleString("ru-RU");
}

/** Compact so'm amount: "4,8 mlrd so'm" / "12,3 mln so'm" / "845 000 so'm". */
export function som(v: number): string {
	const abs = Math.abs(v);
	if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} mlrd so'm`;
	if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} mln so'm`;
	return `${num(v)} so'm`;
}
