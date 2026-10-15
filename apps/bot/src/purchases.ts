import type { I1CUserData } from "./types";

/**
 * What the Besales agent needs to tell a buyer from a newcomer, sent in `metadata` of every
 * message we forward.
 *
 * `foundIn1C` alone isn't enough: registering in the Mini App creates the 1C client, so it is
 * true for people who never bought anything. A purchase is a 1C contract — 1C creates one for
 * cash sales too (`closed`, `months: 0`, empty schedule) — that wasn't returned. A re-issued
 * contract leaves the old one `returned`, but the new one counts, so re-issues aren't lost.
 * A missing status (records cached before 1C added the field) counts as a purchase.
 *
 * Not `isActiveContract` (helper.ts): that one also excludes `closed`, which here is a finished
 * purchase. The same rule lives in apps/api/src/integrations/purchases.ts — keep them in sync.
 *
 * When 1C didn't answer and nothing is cached we don't know, so every field is left out:
 * Besales keeps a contact's previous values for missing fields, while `foundIn1C: false` would
 * wipe them. `false` therefore always means 1C answered (or we have no phone to ask with).
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
	user1CData: Partial<I1CUserData> | undefined,
	{ lookupFailed = false }: { lookupFailed?: boolean } = {}
): PurchaseMetadata {
	// Only code === 0 responses are stored (api.ts), so this matches the old Boolean(user1CData).
	if (!user1CData || user1CData.code !== 0) return lookupFailed ? {} : { foundIn1C: false };

	const contracts = Array.isArray(user1CData.contract?.ids) ? user1CData.contract.ids : [];
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
