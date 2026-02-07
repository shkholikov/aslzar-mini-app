/**
 * Format date strings from 1C API for display (e.g. payment reminder messages).
 *
 * 1C API sends dates as "2025-03-26T00:00:00" (YYYY-MM-DD at midnight, no timezone).
 * We use only the YYYY-MM-DD part at noon UTC so the displayed calendar day
 * is correct regardless of server timezone.
 */

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

/**
 * Format a 1C API date string for display in uz-UZ locale.
 * Returns the original string if it cannot be parsed.
 */
export function format1CDate(
	dateStr: string,
	options?: Intl.DateTimeFormatOptions
): string {
	if (!dateStr || typeof dateStr !== "string") return dateStr;
	const trimmed = dateStr.trim();
	if (!trimmed) return dateStr;

	if (ISO_DATE_PREFIX.test(trimmed)) {
		const dateOnly = trimmed.slice(0, 10);
		const d = new Date(dateOnly + "T12:00:00.000Z");
		if (isNaN(d.getTime())) return dateStr;
		const defaultOptions: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric"
		};
		return d.toLocaleDateString("uz-UZ", options ?? defaultOptions);
	}

	const d = new Date(trimmed);
	if (isNaN(d.getTime())) return dateStr;
	return d.toLocaleDateString("uz-UZ", options ?? { year: "numeric", month: "long", day: "numeric" });
}
