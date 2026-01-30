import Image from "next/image";

/**
 * Optimized full-viewport background image.
 * Uses next/image so Next.js serves WebP/AVIF and caches it.
 * Replaces the previous CSS body::before background for faster loads.
 */
export function BackgroundImage() {
	return (
		<div className="fixed inset-0 -z-[100]" aria-hidden>
			<Image src="/images/bg.png" alt="" fill priority sizes="100vw" className="object-cover opacity-20" quality={75} />
		</div>
	);
}
