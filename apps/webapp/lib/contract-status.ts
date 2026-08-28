/**
 * Contract state as reported by 1C on each `contract.ids[]` entry.
 *
 * 1C leaves the installment schedule fully populated on contracts it has closed or returned —
 * a re-issued contract keeps its old schedule with every row unpaid and no payments recorded.
 * Reading only the schedule made the app show payments that were never owed.
 *
 * Mirrors `isActiveContract` in `apps/bot/src/helper.ts`; the two are kept in sync by hand,
 * as the contract type is already duplicated across apps.
 */
export type ContractStatus = "active" | "closed" | "returned";

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
	active: "Faol",
	closed: "Yopilgan",
	returned: "Qaytarilgan"
};

function normalize(status: unknown): string | null {
	return typeof status === "string" ? status.trim().toLowerCase() : null;
}

/**
 * Whether a contract still carries a payment obligation.
 *
 * Excludes by known terminal states rather than requiring `"active"`: an unrecognised or
 * missing value keeps the previous behaviour, so an incomplete 1C rollout cannot blank
 * out every customer's payments at once.
 */
export function isActiveContract(status: unknown): boolean {
	const normalized = normalize(status);
	if (normalized === null) return true;
	return normalized !== "closed" && normalized !== "returned";
}

/** Uzbek label for the contract badge. Unknown or missing states read as "Faol". */
export function contractStatusLabel(status: unknown): string {
	const normalized = normalize(status);
	if (normalized && normalized in CONTRACT_STATUS_LABELS) {
		return CONTRACT_STATUS_LABELS[normalized as ContractStatus];
	}
	return CONTRACT_STATUS_LABELS.active;
}
