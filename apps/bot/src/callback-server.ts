import "./config";
import http from "http";
import type { Api } from "grammy";
import { besalesEnabled, verifyWebhookSignature, type BesalesWebhookPayload } from "./besales";
import { besalesDeliveries } from "./db";
import { deliverBesalesMessages } from "./besales-delivery";
import { openApiSpec, swaggerHtml } from "./besales-docs";
import { liveness, readiness } from "./health";

const CALLBACK_PATH = process.env.BESALES_CALLBACK_PATH || "/webhooks/besales";
const SIGNATURE_HEADER = "x-besales-webhook-signature"; // Node lowercases header names
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB
const DELIVERY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Read the raw request body as a Buffer (needed for HMAC), enforcing a size cap. */
function readRawBody(req: http.IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		req.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new Error("payload too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

async function handleCallback(api: Api, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
	let raw: Buffer;
	try {
		raw = await readRawBody(req);
	} catch {
		res.writeHead(413);
		res.end();
		return;
	}

	// 1. Verify HMAC signature over the raw bytes.
	if (!verifyWebhookSignature(raw, req.headers[SIGNATURE_HEADER] as string | undefined)) {
		console.warn("[besales] callback rejected: invalid signature");
		res.writeHead(401);
		res.end();
		return;
	}

	// 2. Parse JSON.
	let payload: BesalesWebhookPayload;
	try {
		payload = JSON.parse(raw.toString("utf8")) as BesalesWebhookPayload;
	} catch {
		res.writeHead(400);
		res.end();
		return;
	}

	// 3. Idempotency: the webhook delivery id is the primary key. Duplicate => already handled.
	try {
		await besalesDeliveries.insertOne({ _id: payload.id, createdAt: new Date() });
	} catch (error) {
		if ((error as { code?: number }).code === 11000) {
			console.log(`[besales] duplicate webhook ${payload.id} skipped`);
			res.writeHead(200);
			res.end();
			return;
		}
		throw error;
	}

	// 4. Ack fast (≤10s budget), then deliver asynchronously so AI/network never blocks the ack.
	res.writeHead(200);
	res.end();

	const chatId = Number(payload.data.externalUserId);
	console.log(`[besales] webhook ${payload.id} event=${payload.event} messages=${payload.data.messages?.length ?? 0} -> chat ${chatId}`);
	void deliverBesalesMessages(api, chatId, payload.data.messages ?? []).catch((e) =>
		console.error(`[besales] delivery failed for webhook ${payload.id}:`, e)
	);
}

/**
 * Start the HTTP server that receives Besales callbacks (and a /health probe).
 * No-op when Besales is disabled or unconfigured, so the bot binds no port in that case.
 * Must be started before bot.start() (which blocks forever on long polling).
 */
export function startBesalesCallbackServer(api: Api): void {
	if (!besalesEnabled || !process.env.BESALES_WEBHOOK_SECRET) {
		console.log("[besales] callback server disabled (BESALES_ENABLED!=true or no webhook secret)");
		return;
	}

	// Ensure processed webhooks expire (TTL). Idempotent — safe to call on every boot.
	besalesDeliveries
		.createIndex({ createdAt: 1 }, { expireAfterSeconds: DELIVERY_TTL_SECONDS })
		.catch((e) => console.error("[besales] failed to ensure TTL index:", e));

	const port = Number(process.env.PORT) || 3000;

	const server = http.createServer((req, res) => {
		void (async () => {
			try {
				if (req.method === "GET" && req.url === "/health") {
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify(liveness()));
					return;
				}
				if (req.method === "GET" && req.url === "/health/ready") {
					const { report, healthy } = await readiness();
					res.writeHead(healthy ? 200 : 503, { "Content-Type": "application/json" });
					res.end(JSON.stringify(report));
					return;
				}
				if (req.method === "GET" && req.url === "/docs") {
					res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
					res.end(swaggerHtml);
					return;
				}
				if (req.method === "GET" && req.url === "/openapi.json") {
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify(openApiSpec));
					return;
				}
				if (req.method === "POST" && req.url === CALLBACK_PATH) {
					await handleCallback(api, req, res);
					return;
				}
				res.writeHead(404);
				res.end();
			} catch (error) {
				console.error("[besales] callback server error:", error);
				if (!res.headersSent) {
					res.writeHead(500);
					res.end();
				}
			}
		})();
	});

	server.listen(port, () => console.log(`[besales] callback server listening on :${port} (path ${CALLBACK_PATH})`));
}
