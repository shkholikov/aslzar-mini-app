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
		// Cache raw source assets aggressively at Cloudflare edge + browser. To
		// invalidate after replacing a file, either rename it (e.g. `crown.webp`
		// → `crown-v2.webp`) or purge Cloudflare cache from the dashboard. The
		// `immutable` directive tells caches to skip revalidation entirely.
		const sourceAssetCache = "public, max-age=31536000, immutable";
		return [
			{ source: "/images/:path*", headers: [{ key: "Cache-Control", value: sourceAssetCache }] },
			{ source: "/icons/:path*", headers: [{ key: "Cache-Control", value: sourceAssetCache }] }
		];
	}
};

export default nextConfig;
