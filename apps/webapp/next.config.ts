import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		formats: ["image/avif", "image/webp"],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 31536000, // 1 year for optimized images
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*.r2.dev",
				pathname: "/**"
			}
		]
	},
	async headers() {
		// Don't mark raw source assets as `immutable` — that prevents browsers and
		// the Image Optimizer from revalidating when we replace a file with the
		// same name (e.g. re-exported icons). Give them a short-ish cache with
		// revalidation. Vercel's Image Optimizer still caches the *optimized*
		// outputs for a year via `images.minimumCacheTTL`.
		const sourceAssetCache = "public, max-age=3600, must-revalidate";
		return [
			{ source: "/images/:path*", headers: [{ key: "Cache-Control", value: sourceAssetCache }] },
			{ source: "/icons/:path*", headers: [{ key: "Cache-Control", value: sourceAssetCache }] }
		];
	}
};

export default nextConfig;
