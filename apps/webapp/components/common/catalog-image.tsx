"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";

/**
 * A catalogue photo from ASLZAR ID.
 *
 * `unoptimized`: ASLZAR ID already serves every photo ready-sized as WebP (small / medium / large),
 * so passing it through Vercel's image optimiser re-encodes a file that is already optimised and
 * spends a monthly quota. When that quota ran out on the Hobby plan, every photo not yet cached came
 * back 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) and rendered as a broken-image icon. Loading
 * straight from img.aslzarid.uz also skips a hop.
 *
 * If a photo still fails to load, the ring placeholder is shown instead of the browser's broken-image
 * glyph — the same one used for products that have no photos at all.
 */
export function CatalogImage({ src, alt, ...rest }: Omit<ImageProps, "src" | "unoptimized" | "onError"> & { src: string }) {
	const [failed, setFailed] = React.useState(false);

	// A new photo gets a fresh chance (the gallery reuses slots when the product changes).
	React.useEffect(() => setFailed(false), [src]);

	if (failed) return <CatalogImagePlaceholder />;
	return <Image {...rest} src={src} alt={alt} unoptimized onError={() => setFailed(true)} />;
}

/** Faded ring icon, centred over its (relatively positioned) container. */
export function CatalogImagePlaceholder({ size = 56 }: { size?: number }) {
	return (
		<div className="absolute inset-0 flex items-center justify-center">
			<Image src="/icons/ring.webp" alt="" width={size} height={size} unoptimized className="object-contain opacity-30" />
		</div>
	);
}
