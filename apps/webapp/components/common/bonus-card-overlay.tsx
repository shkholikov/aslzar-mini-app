"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCode } from "@/components/ui/shadcn-io/qr-code";

interface BonusCardOverlayProps {
	clientId: string;
	onClose: () => void;
}

/**
 * Frameless fullscreen QR — no panel chrome, no close button, tap anywhere to dismiss.
 * Deliberately an in-page overlay rather than a route: no navigation means no Telegram
 * BackButton wiring and none of the iOS stuck-back-navigation trouble.
 */
export function BonusCardOverlay({ clientId, onClose }: BonusCardOverlayProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [onClose]);

	if (!mounted) return null;

	// Portalled to <body>: the app wraps pages in `.page-transition`, whose identity transform makes
	// it a containing block for fixed positioning — rendering in place would size `inset-0` to the
	// full scroll height instead of the viewport and push the QR below the fold.
	return createPortal(
		<div
			role="presentation"
			onClick={onClose}
			className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/70 p-8 backdrop-blur-xl"
		>
			{/* Hardcoded black-on-white: the theme's --foreground/--background would follow the .dark
			    variant and render an unscannable QR. */}
			<div className="rounded-[2.5rem] bg-white p-5 shadow-2xl">
				<QRCode className="size-72" data={clientId} foreground="#000000" background="#ffffff" />
			</div>
			<p className="text-lg font-bold tracking-wide text-white">{clientId}</p>
		</div>,
		document.body
	);
}
