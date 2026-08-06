/**
 * Checks our token signer against the vectors published to the 1C developer in
 * docs/1c-bonus-token.md, and optionally prints a live token to hand them.
 *
 *   pnpm --filter api verify-bonus-token
 *   BONUS_TOKEN_SECRET=<key> pnpm --filter api verify-bonus-token [clientId]
 *
 * Deliberately does NOT import ../src/config: that module calls required() for Mongo and the
 * bot token at load time and throws without them, and checking three HMAC vectors should not
 * need a live database.
 *
 * This is the executable form of the contract with 1C. If it fails, tokens we mint will be
 * rejected at every till as forgeries — run it before shipping any change to bonus-token.ts.
 */
import { BONUS_TOKEN_TTL_SECONDS, signBonusToken } from "../src/bonus-token";

/** The key printed in docs/1c-bonus-token.md, so these vectors are reproducible on both sides. */
const DOC_TEST_KEY = "test-secret-key-do-not-use";

const VECTORS: Array<{ clientId: string; exp: number; signature: string }> = [
	{ clientId: "00-00073809", exp: 1754301600, signature: "953329cd31b97995" },
	{ clientId: "00-00012345", exp: 1754301600, signature: "97c47c2123f71fdc" },
	{ clientId: "00-00099999", exp: 1900000000, signature: "c4f9767f1d8a62bd" }
];

let failures = 0;

for (const { clientId, exp, signature } of VECTORS) {
	// The TTL is baked into the signer, so wind the clock back to land on the documented expiry.
	const token = signBonusToken(clientId, DOC_TEST_KEY, (exp - BONUS_TOKEN_TTL_SECONDS) * 1000);
	const expected = `${clientId}.${exp}.${signature}`;

	if (token === expected) {
		console.log(`✅ ${token}`);
	} else {
		failures++;
		console.log(`❌ ${token}\n   expected ${expected}`);
	}
}

const secret = process.env.BONUS_TOKEN_SECRET;
if (secret) {
	const clientId = process.argv[2] || "00-00073809";
	console.log(`\nLive token for ${clientId} (valid ${BONUS_TOKEN_TTL_SECONDS}s): ${signBonusToken(clientId, secret)}`);
} else {
	console.log("\nBONUS_TOKEN_SECRET not set — skipped the live sample.");
}

if (failures > 0) {
	console.error(`\n${failures} vector(s) failed — tokens would be rejected by 1C.`);
	process.exit(1);
}
