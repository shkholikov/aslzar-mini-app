/**
 * Format date strings from 1C API for display.
 *
 * 1C API sends dates in two possible formats:
 * - ISO date/time: "2025-03-26T00:00:00" (YYYY-MM-DD at midnight, no timezone)
 * - Referral list (chislo) may use: "DD.MM.YYYY HH:mm:ss"
 *
 * We treat ISO as date-only (use YYYY-MM-DD part only at noon UTC) so the
 * displayed calendar day is correct regardless of server/client timezone.
 */

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;
const DD_MM_YYYY = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/;

/**
 * Parse a date string from 1C API and return a Date for the calendar day,
 * or null if unparseable.
 */
export function parse1CDate(dateStr: string): Date | null {
	if (!dateStr || typeof dateStr !== "string") return null;
	const trimmed = dateStr.trim();
	if (!trimmed) return null;

	// ISO-like: "2025-03-26" or "2025-03-26T00:00:00" — use date part only at noon UTC
	if (ISO_DATE_PREFIX.test(trimmed)) {
		const dateOnly = trimmed.slice(0, 10);
		const d = new Date(dateOnly + "T12:00:00.000Z");
		return isNaN(d.getTime()) ? null : d;
	}

	// DD.MM.YYYY or DD.MM.YYYY HH:mm:ss
	const dmy = trimmed.match(DD_MM_YYYY);
	if (dmy) {
		const [, day, month, year] = dmy;
		const d = new Date(Number(year), Number(month) - 1, Number(day));
		return isNaN(d.getTime()) ? null : d;
	}

	// Fallback: native parse
	const d = new Date(trimmed);
	return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a 1C API date string for display in uz-UZ locale.
 * Returns the original string if it cannot be parsed.
 */
export function format1CDate(
	dateStr: string,
	options?: Intl.DateTimeFormatOptions
): string {
	const d = parse1CDate(dateStr);
	if (!d) return dateStr;
	const defaultOptions: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	};
	return d.toLocaleDateString("uz-UZ", options ?? defaultOptions);
}
