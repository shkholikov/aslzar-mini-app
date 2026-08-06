import { createHmac } from "crypto";

/**
 * Bonus card QR token.
 *
 * The QR used to carry the bare 1C `clientId`, which never changes — a screenshot of a
 * customer's card stayed usable forever, and staff were passing them around to spend other
 * people's bonuses. The payload is now `<clientId>.<unixExpiry>.<signature>`, which 1C
 * verifies offline by recomputing the same HMAC with a shared secret.
 *
 * Contract lives in docs/1c-bonus-token.md and is already implemented against by the 1C
 * developer. Do not change the format, the TTL, or the signature length without re-issuing
 * that document.
 */

/**
 * Lifetime of a token. 1C tolerates a further 120s of clock skew on top of this, so the real
 * window at the till is 300–420s.
 */
export const BONUS_TOKEN_TTL_SECONDS = 300;

/** 1C compares the first 16 hex characters of the digest. */
const SIGNATURE_HEX_LENGTH = 16;

/**
 * Signs `<clientId>.<unixExp>` and returns the full three-part token.
 *
 * The secret is hashed as raw UTF-8 bytes, NOT hex-decoded — 1C holds the key as a string in
 * its settings and does the same. Hex-decoding here would mint tokens that every till rejects
 * as forgeries, with nothing in our logs to explain why. The vectors in docs/1c-bonus-token.md
 * pin this behaviour; scripts/verify-bonus-token.ts checks them.
 *
 * We only ever sign — 1C is the sole verifier — so there is no comparison path here and
 * nothing is stored on either side.
 *
 * @param nowMs Injectable clock, so the verification script can reproduce the documented vectors.
 */
export function signBonusToken(clientId: string, secret: string, nowMs: number = Date.now()): string {
	if (!clientId) throw new Error("signBonusToken: clientId is required");
	if (!secret) throw new Error("signBonusToken: secret is required");
	// A dot in the client id would yield a four-part token, and 1C's first rule is
	// "not three parts → reject". 1C ids are `00-00073809`-shaped so this never fires,
	// but the invariant belongs where the token is built.
	if (clientId.includes(".")) throw new Error("signBonusToken: clientId must not contain '.'");

	const exp = Math.floor(nowMs / 1000) + BONUS_TOKEN_TTL_SECONDS;
	const message = `${clientId}.${exp}`;
	const signature = createHmac("sha256", secret).update(message, "utf8").digest("hex").slice(0, SIGNATURE_HEX_LENGTH);

	return `${message}.${signature}`;
}

/**
 * Route-facing wrapper: returns null rather than throwing when there is nothing to sign.
 *
 * Returning null when the secret is missing — instead of signing with an empty key — is the
 * part that matters. A token signed with "" is perfectly well-formed, so 1C would reject it
 * as «Недействительный код», the message reserved for forgeries, and a cashier would tell a
 * paying customer their card is fake. No token at all means the card simply isn't rendered.
 */
export function buildBonusToken(clientId: unknown, secret: string): string | null {
	if (!secret) return null;
	if (typeof clientId !== "string" || !clientId || clientId.includes(".")) return null;

	return signBonusToken(clientId, secret);
}
