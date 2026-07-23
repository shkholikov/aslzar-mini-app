/**
 * OpenAPI spec + Swagger UI page for the bot's public HTTP surface (health + Besales webhook).
 * Served by the callback server at GET /openapi.json and GET /docs.
 * The Swagger UI assets load from a CDN in the browser — no npm dependency is bundled.
 */

const CALLBACK_PATH = process.env.BESALES_CALLBACK_PATH || "/webhooks/besales";

export const openApiSpec = {
	openapi: "3.1.0",
	info: {
		title: "ASLZAR Bot — Besales Webhook API",
		version: "1.0.0",
		description:
			"HTTP surface exposed by the ASLZAR Telegram bot for the Besales integration. " +
			"Besales POSTs AI dialog callbacks (message.reply / message.followup) to the webhook endpoint; " +
			"the bot verifies the HMAC signature, acknowledges within 10s, then delivers the messages to the user via Telegram."
	},
	servers: [{ url: "https://dev-bot.aslzarbot.uz", description: "Development" }],
	paths: {
		"/health": {
			get: {
				summary: "Liveness probe",
				description: "Cheap check that the process is up. No dependencies — always 200 while running.",
				responses: {
					"200": {
						description: "Process is alive",
						content: { "application/json": { schema: { $ref: "#/components/schemas/HealthReport" } } }
					}
				}
			}
		},
		"/health/ready": {
			get: {
				summary: "Readiness probe",
				description: "Checks dependencies (MongoDB). 200 when ready to serve, 503 when a dependency is unreachable.",
				responses: {
					"200": {
						description: "Ready",
						content: { "application/json": { schema: { $ref: "#/components/schemas/HealthReport" } } }
					},
					"503": {
						description: "Not ready (a dependency check failed)",
						content: { "application/json": { schema: { $ref: "#/components/schemas/HealthReport" } } }
					}
				}
			}
		},
		[CALLBACK_PATH]: {
			post: {
				summary: "Besales callback receiver",
				description:
					"Receives `message.reply` and `message.followup` callbacks from Besales. " +
					"The request body is HMAC-verified against the raw bytes, so send the exact JSON you signed. " +
					"A `200` (including for a duplicate `id`) means accepted — messages are delivered to Telegram asynchronously.",
				security: [{ WebhookSignature: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: { $ref: "#/components/schemas/WebhookPayload" } } }
				},
				responses: {
					"200": { description: "Acknowledged (also returned for a duplicate `id`; delivery happens async)" },
					"400": { description: "Malformed JSON body" },
					"401": { description: "Missing or invalid `X-Besales-Webhook-Signature`" },
					"413": { description: "Body exceeds the 1 MB limit" },
					"500": { description: "Unexpected server error" }
				}
			}
		}
	},
	components: {
		securitySchemes: {
			WebhookSignature: {
				type: "apiKey",
				in: "header",
				name: "X-Besales-Webhook-Signature",
				description: "HMAC-SHA256 (hex) of the raw request body using the shared webhookSecret, prefixed `sha256=`."
			}
		},
		schemas: {
			HealthReport: {
				type: "object",
				required: ["status", "version", "uptime", "timestamp"],
				properties: {
					status: { type: "string", enum: ["ok", "error"] },
					version: { type: "string", description: "Platform version", example: "2.7.0" },
					uptime: { type: "integer", description: "Seconds since process start" },
					timestamp: { type: "string", format: "date-time" },
					checks: {
						type: "object",
						description: "Per-dependency status (readiness only)",
						additionalProperties: { type: "string", enum: ["ok", "error"] }
					}
				}
			},
			Button: {
				type: "object",
				required: ["label", "value"],
				properties: {
					label: { type: "string", description: "Tappable button text shown to the user" },
					value: { type: "string", description: "Payload returned on tap (Telegram callback_data, ≤64 bytes)" }
				}
			},
			Media: {
				type: "object",
				required: ["type", "url"],
				properties: {
					type: { type: "string", enum: ["image", "voice", "audio", "video", "document"] },
					url: { type: "string", format: "uri", description: "Direct download URL" },
					mimeType: { type: "string" },
					fileName: { type: "string" },
					caption: { type: "string" }
				}
			},
			OutboundMessage: {
				type: "object",
				description: "One message to deliver. Any combination of text, buttons, and media.",
				properties: {
					text: { type: "string" },
					buttons: {
						type: "array",
						description: "2D grid: rows × buttons; rendered as a Telegram inline keyboard.",
						items: { type: "array", items: { $ref: "#/components/schemas/Button" } }
					},
					media: { type: "array", items: { $ref: "#/components/schemas/Media" } }
				}
			},
			WebhookPayload: {
				type: "object",
				required: ["id", "event", "data"],
				properties: {
					id: { type: "string", description: "Delivery id — used for idempotency on our side" },
					event: { type: "string", enum: ["message.reply", "message.followup"] },
					workspaceId: { type: "string" },
					channelId: { type: "string" },
					createdAt: { type: "string", format: "date-time" },
					data: {
						type: "object",
						required: ["externalUserId", "messages"],
						properties: {
							externalUserId: { type: "string", description: "Telegram user id; also the chat we deliver to" },
							externalChatId: { type: "string" },
							requestId: { type: "string", description: "Present for message.reply, absent for message.followup" },
							messages: {
								type: "array",
								description: "Deliver in order. Long answers may be split into several messages.",
								items: { $ref: "#/components/schemas/OutboundMessage" }
							}
						}
					}
				}
			}
		}
	}
} as const;

/** Self-contained Swagger UI page pointing at /openapi.json (assets from CDN). */
export const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>ASLZAR Bot — Besales Webhook API</title>
	<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.32.11/swagger-ui.css"
		integrity="sha384-9Q2fpS+xeS4ffJy6CagnwoUl+4ldAYhOs9pgZuEKxypVModhmZFzeMlvVsAjf7uT" crossorigin="anonymous">
</head>
<body>
	<div id="swagger-ui"></div>
	<script src="https://unpkg.com/swagger-ui-dist@5.32.11/swagger-ui-bundle.js"
		integrity="sha384-vfl/klfTFrIz5urj0HnhcXLAbzPdRHezizfy+XgFB6GqcKkhlk0lS3bIbyB39NLA" crossorigin="anonymous"></script>
	<script>
		window.ui = SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });
	</script>
</body>
</html>`;
