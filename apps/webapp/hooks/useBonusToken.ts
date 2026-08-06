"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useUser } from "./useUser";

/**
 * Fetch a replacement this long before the current token dies. Comfortably longer than a slow
 * round-trip, and 1C's own 120s skew tolerance sits underneath it — so a token that reaches a
 * scanner is never "only just" expired unless a renewal actually failed.
 */
const REFRESH_LEAD_MS = 90_000;

/** Floor between renewals, so a run of failures (offline) can't turn into a request loop. */
const MIN_REFRESH_GAP_MS = 20_000;

/** How often to keep trying once the token has already lapsed. Comfortably above the floor above. */
const RETRY_WHILE_EXPIRED_MS = 30_000;

/** Token shape is `<clientId>.<unixExp>.<signature>` — see docs/1c-bonus-token.md. */
function readExpiry(token: string | null): number | null {
	if (!token) return null;
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const exp = Number(parts[1]);
	return Number.isFinite(exp) ? exp * 1000 : null;
}

/**
 * Keeps the bonus card QR alive.
 *
 * The first token arrives with the profile payload, so the card is scannable on first paint.
 * Renewals then go to /v1/users/me/bonus-token and land in local state — deliberately *not*
 * through useUser's SWR cache. Mutating that shared key would re-render every screen bound to
 * user data (including the whole home page, which reads it) every few minutes, and would make
 * the server revalidate 1C on each renewal. Keeping the renewal local confines the re-render
 * to this component.
 *
 * The expiry is printed inside the token, so the exact moment to act is known and this can
 * schedule timers rather than poll.
 */
export function useBonusToken(): { token: string | null; expired: boolean } {
	const { data } = useUser();
	const initialToken: string | null = typeof data?.bonusToken === "string" ? data.bonusToken : null;

	const [token, setToken] = useState<string | null>(initialToken);
	const [expired, setExpired] = useState(false);
	const lastRefreshAtRef = useRef(0);

	// Adopt the token that came with the profile payload — on first load, and again after any
	// event that refetches the profile (registration, a manual refresh).
	useEffect(() => {
		if (initialToken) setToken(initialToken);
	}, [initialToken]);

	const refresh = useCallback(() => {
		if (Date.now() - lastRefreshAtRef.current < MIN_REFRESH_GAP_MS) return;
		lastRefreshAtRef.current = Date.now();

		void apiRequest<{ token?: string }>("/v1/users/me/bonus-token")
			.then((res) => {
				if (typeof res?.token === "string") setToken(res.token);
			})
			// Survivable: the current token stays put, and the expiry timer below flips the card
			// to its reconnect state once it actually lapses.
			.catch(() => {});
	}, []);

	const expiresAt = readExpiry(token);

	useEffect(() => {
		if (expiresAt === null) return;

		setExpired(Date.now() >= expiresAt);

		const refreshTimer = setTimeout(refresh, Math.max(0, expiresAt - REFRESH_LEAD_MS - Date.now()));
		const expiryTimer = setTimeout(() => setExpired(true), Math.max(0, expiresAt - Date.now()));

		// Mobile WebViews freeze timers while the Mini App is backgrounded, so a token can lapse
		// without either timer firing. Nothing else covers the reopen case — useUser sets
		// revalidateOnFocus: false, and renewals no longer go through SWR at all.
		const onVisibilityChange = () => {
			if (document.visibilityState !== "visible") return;
			setExpired(Date.now() >= expiresAt);
			if (Date.now() >= expiresAt - REFRESH_LEAD_MS) refresh();
		};
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			clearTimeout(refreshTimer);
			clearTimeout(expiryTimer);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [expiresAt, refresh]);

	// Once the token has lapsed and the renewal failed, both timers above have already fired and
	// `expiresAt` no longer moves, so nothing would re-arm them. Without this, a card that went
	// offline stays broken until the app is backgrounded and reopened — precisely the wrong thing
	// to ask of someone standing at a till when the signal comes back.
	useEffect(() => {
		if (!expired) return;

		const retryTimer = setInterval(refresh, RETRY_WHILE_EXPIRED_MS);
		return () => clearInterval(retryTimer);
	}, [expired, refresh]);

	return { token, expired };
}
