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
			},
			{
				// ASLZAR ID catalogue photos. Paths are a content hash plus a size,
				// e.g. /287b48f4…/small.webp — immutable, so they cache indefinitely.
				protocol: "https",
				hostname: "img.aslzarid.uz",
				pathname: "/**"
			}
		]
	},
	/**
	 * Local development against a locally-running apps/api, through a SINGLE ngrok tunnel.
	 *
	 * The Mini App runs on the customer's phone, so `localhost:3001` is the phone's own
	 * localhost, not the dev machine's — the API would normally need its own public URL too,
	 * and ngrok's free plan only gives you one. Instead the webapp calls its own origin and
	 * Next proxies /v1/* to the local API server-side. One tunnel, and no CORS at all, since
	 * the browser only ever talks to one host.
	 *
	 * Set LOCAL_API_PROXY_TARGET=http://localhost:3001 and point NEXT_PUBLIC_API_BASE_URL at
	 * the ngrok URL of *this* app. Unset in production, where the rewrite does not apply.
	 */
	async rewrites() {
		const target = process.env.LOCAL_API_PROXY_TARGET;
		if (!target) return [];
		return [{ source: "/v1/:path*", destination: `${target.replace(/\/$/, "")}/v1/:path*` }];
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
