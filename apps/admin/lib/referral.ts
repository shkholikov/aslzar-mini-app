/** Client-safe referral constants and types (no server imports). */

/**
 * Fallback referral cap, used when the `settings` document doesn't exist yet.
 * The live default is configured on the Referal page; this only guards the very
 * first run before anything has been saved. Mirrored in apps/api and apps/bot.
 */
export const FALLBACK_REFERRAL_LIMIT = 5;

export interface ReferralSettings {
	defaultReferralLimit: number;
	updatedBy?: string;
	updatedAt?: string | Date;
}

export interface ReferralStats {
	/** Users with 1C data (i.e. able to refer at all). */
	totalCustomers: number;
	/** Users whose referral count has reached or passed their effective limit. */
	atLimit: number;
	/** Users with an individually set limit (not following the default). */
	withCustomLimit: number;
	/** Sum of every user's referral count. */
	totalReferrals: number;
}
