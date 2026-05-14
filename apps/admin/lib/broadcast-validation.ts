import type { BroadcastMedia } from "@/lib/db";

export const MAX_MEDIA = 5;

const R2_PUBLIC_PREFIX_RAW = process.env.R2_PUBLIC_URL?.trim();
const R2_PUBLIC_PREFIX = R2_PUBLIC_PREFIX_RAW
	? R2_PUBLIC_PREFIX_RAW.endsWith("/")
		? R2_PUBLIC_PREFIX_RAW
		: R2_PUBLIC_PREFIX_RAW + "/"
	: null;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isHttpsR2Url(url: string): boolean {
	if (!url.startsWith("https://")) return false;
	if (!R2_PUBLIC_PREFIX) return false; // env not configured — fail closed so we never accept arbitrary hosts
	return url.startsWith(R2_PUBLIC_PREFIX);
}

/**
 * Parse the `media` (preferred) or legacy `mediaUrl`/`mediaType` fields from a request body.
 * Returns the normalized media array (or undefined for none).
 */
export function parseMediaBody(body: unknown): Result<BroadcastMedia[] | undefined> {
	const b = (body ?? {}) as Record<string, unknown>;

	if (Array.isArray(b.media)) {
		if (b.media.length > MAX_MEDIA) {
			return { ok: false, error: `media supports at most ${MAX_MEDIA} items` };
		}
		const parsed: BroadcastMedia[] = [];
		for (const raw of b.media as unknown[]) {
			const item = (raw ?? {}) as Record<string, unknown>;
			const url = typeof item.url === "string" ? item.url.trim() : "";
			const type = item.type === "photo" || item.type === "video" ? item.type : null;
			if (!url || !type) {
				return { ok: false, error: "each media item must have a non-empty url and type photo|video" };
			}
			if (!isHttpsR2Url(url)) {
				return { ok: false, error: "media url must be an https URL from the configured R2 bucket" };
			}
			parsed.push({ url, type });
		}
		return { ok: true, value: parsed.length > 0 ? parsed : undefined };
	}

	// Legacy single-media body (clients written before media[] existed)
	const mediaUrl = typeof b.mediaUrl === "string" ? b.mediaUrl.trim() : undefined;
	const mediaType = b.mediaType === "photo" || b.mediaType === "video" ? b.mediaType : undefined;
	if ((mediaUrl && !mediaType) || (!mediaUrl && mediaType)) {
		return { ok: false, error: "mediaUrl and mediaType must both be provided" };
	}
	if (mediaUrl && mediaType) {
		if (!isHttpsR2Url(mediaUrl)) {
			return { ok: false, error: "mediaUrl must be an https URL from the configured R2 bucket" };
		}
		return { ok: true, value: [{ url: mediaUrl, type: mediaType }] };
	}
	return { ok: true, value: undefined };
}

export interface BroadcastButton {
	buttonText: string;
	buttonUrl: string;
}

export function parseButtonBody(body: unknown): Result<BroadcastButton | undefined> {
	const b = (body ?? {}) as Record<string, unknown>;
	const buttonText = typeof b.buttonText === "string" ? b.buttonText.trim() : undefined;
	const buttonUrl = typeof b.buttonUrl === "string" ? b.buttonUrl.trim() : undefined;
	if ((buttonText && !buttonUrl) || (!buttonText && buttonUrl)) {
		return { ok: false, error: "buttonText and buttonUrl must both be provided" };
	}
	if (buttonUrl && !/^https:\/\//i.test(buttonUrl)) {
		return { ok: false, error: "buttonUrl must be an https URL" };
	}
	return { ok: true, value: buttonText && buttonUrl ? { buttonText, buttonUrl } : undefined };
}

/**
 * Returns null when the combination is valid, or an error message when the album cannot have a button.
 * Telegram's sendMediaGroup does not support reply_markup, so 2+ media + button is rejected.
 */
export function checkAlbumButtonConflict(media: BroadcastMedia[] | undefined, button: BroadcastButton | undefined): string | null {
	if (media && media.length >= 2 && button) {
		return "Inline button is not supported for album broadcasts (2+ media). Send button with 0 or 1 media.";
	}
	return null;
}
