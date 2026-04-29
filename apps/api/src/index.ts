import { config } from "./config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { requireApiKey } from "./auth";
import { requireMiniAppAuth } from "./auth-miniapp";
import { rateLimitByApiKey } from "./rate-limit";
import { sendMessageHandler } from "./routes/send-message";
import { openApiSpec } from "./openapi";
// Internal routes (consumed by app.aslzarbot.uz only — intentionally undocumented in /docs)
import { getMeHandler, registerHandler } from "./routes/internal/users";
import { listProductsHandler } from "./routes/internal/products";
import { listNewsHandler } from "./routes/internal/news";
import { listBranchesHandler } from "./routes/internal/branches";
import { listBonusProgramsHandler } from "./routes/internal/bonus-programs";
import { listReferralsHandler, createReferralLinkHandler } from "./routes/internal/referrals";
import { getChannelMembershipHandler } from "./routes/internal/channel-membership";
import { productInterestHandler } from "./routes/internal/product-interest";
import { createSuggestionHandler } from "./routes/internal/suggestions";
import { sendSubscribeRequestHandler } from "./routes/internal/subscribe-request";

const app = express();

app.use(express.json({ limit: "32kb" }));

// CORS — allowlist explicit origins (webapp + admin in prod, localhost in dev).
// Internal endpoints additionally require initData; CORS only governs which origins
// the browser is allowed to read the response from.
app.use(
	cors({
		origin: (origin, cb) => {
			// Server-to-server (no Origin header) and same-origin: allow.
			if (!origin) return cb(null, true);
			if (config.CORS_ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
			return cb(new Error(`Origin ${origin} not allowed by CORS`));
		},
		credentials: false,
		methods: ["GET", "POST", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"]
	})
);

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

// Raw OpenAPI spec — external devs can import into Postman/Insomnia/generators
app.get("/docs.json", (_req, res) => {
	res.json(openApiSpec);
});

// Interactive Swagger UI at /docs
app.use(
	"/docs",
	swaggerUi.serve,
	swaggerUi.setup(openApiSpec, {
		customSiteTitle: "ASLZAR BOT External API Docs",
		customfavIcon: "/favicon.ico",
		swaggerOptions: {
			persistAuthorization: true,
			tryItOutEnabled: true
		}
	})
);

// External (partner) API — documented in /docs.
app.post("/v1/external/sendMessage", requireApiKey, rateLimitByApiKey, sendMessageHandler);

// Internal API — consumed only by our own webapp via Telegram initData auth.
// IMPORTANT: do NOT add these to apps/api/src/openapi.ts. They are intentionally
// invisible at /docs to keep the public docs scoped to partner-facing endpoints.
app.get("/v1/users/me", requireMiniAppAuth, getMeHandler);
app.post("/v1/users/register", requireMiniAppAuth, registerHandler);
app.get("/v1/products", requireMiniAppAuth, listProductsHandler);
app.get("/v1/news", requireMiniAppAuth, listNewsHandler);
app.get("/v1/branches", requireMiniAppAuth, listBranchesHandler);
app.get("/v1/bonus-programs", requireMiniAppAuth, listBonusProgramsHandler);
app.get("/v1/referrals", requireMiniAppAuth, listReferralsHandler);
app.post("/v1/referrals/link", requireMiniAppAuth, createReferralLinkHandler);
app.get("/v1/channel-membership", requireMiniAppAuth, getChannelMembershipHandler);
app.post("/v1/product-interest", requireMiniAppAuth, productInterestHandler);
app.post("/v1/suggestions", requireMiniAppAuth, createSuggestionHandler);
app.post("/v1/subscribe-request", requireMiniAppAuth, sendSubscribeRequestHandler);

app.use((_req, res) => {
	res.status(404).json({
		ok: false,
		error: { code: "not_found", message: "Endpoint not found" }
	});
});

app.listen(config.PORT, () => {
	console.log(`🚀 API listening on :${config.PORT}`);
});
