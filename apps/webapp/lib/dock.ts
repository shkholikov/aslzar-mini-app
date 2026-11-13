"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the bottom dock is hidden. A page that pins its own bar to the bottom (the product page
 * once a piece is selected) hides the dock so the two never overlap, and shows it again when done.
 */
let hidden = false;
const listeners = new Set<() => void>();

export function setDockHidden(next: boolean): void {
	if (hidden === next) return;
	hidden = next;
	listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useDockHidden(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => hidden,
		() => false
	);
}
