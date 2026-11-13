/**
 * Money formatting for the whole Mini App. One formatter, so every amount on every screen
 * reads the same way (`1 250 000`). Append " so'm" at the call site.
 */
export function formatSom(amount: number): string {
	return new Intl.NumberFormat("uz-UZ").format(Math.round(amount));
}
