/**
 * Purchase flags for Besales `metadata` — a copy of apps/bot/src/purchases.ts (no shared
 * package). Keep the two in sync; see the bot copy for the reasoning behind the rule.
 *
 * A purchase is a 1C contract that wasn't returned (cash sales are contracts too); a missing
 * status counts. Purchase fields are omitted when the user isn't a 1C client, and everything is
 * omitted when 1C didn't answer and nothing is cached (Besales keeps its previous values then).
 */
export interface PurchaseMetadata {
	foundIn1C?: boolean;
	hasPurchases?: boolean;
	contractsCount?: number;
	/** YYYY-MM-DD of the latest purchase contract; 1C dates are already Tashkent-local. */
	lastPurchaseDate?: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function purchaseMetadata(
	user1CData: Record<string, unknown> | undefined,
	{ lookupFailed = false }: { lookupFailed?: boolean } = {}
): PurchaseMetadata {
	if (!user1CData || user1CData.code !== 0) return lookupFailed ? {} : { foundIn1C: false };

	const ids = (user1CData.contract as { ids?: unknown } | undefined)?.ids;
	const contracts = (Array.isArray(ids) ? ids : []) as Array<{ status?: unknown; date?: unknown } | null>;
	const purchases = contracts.filter((c) => {
		if (!c || typeof c !== "object") return false;
		const status = typeof c.status === "string" ? c.status.trim().toLowerCase() : "";
		return status !== "returned";
	});

	let lastPurchaseDate: string | undefined;
	for (const c of purchases) {
		const day = typeof c?.date === "string" ? c.date.slice(0, 10) : "";
		if (DAY.test(day) && (!lastPurchaseDate || day > lastPurchaseDate)) lastPurchaseDate = day;
	}

	return {
		foundIn1C: true,
		hasPurchases: purchases.length > 0,
		contractsCount: purchases.length,
		...(lastPurchaseDate && { lastPurchaseDate })
	};
}
