"use client";

import { useEffect } from "react";
import { CatalogState } from "@/components/common/catalog-state";

/**
 * Last line of defence for the catalogue routes.
 *
 * The data hooks already handle a failing request; this catches a render-time crash — a shape
 * we did not expect from a catalogue we do not control, say. Without it Next shows its own
 * error page, which inside Telegram looks like the app itself has broken.
 *
 * Covers /catalog and /catalog/[productId].
 */
export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error("[catalog] render failed", error);
	}, [error]);

	return (
		<div className="pt-16 px-4">
			<CatalogState kind="error" onAction={reset} />
		</div>
	);
}
