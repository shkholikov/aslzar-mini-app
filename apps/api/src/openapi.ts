/**
 * OpenAPI 3.1 specification for the ASLZAR External API.
 *
 * This file is the single source of truth for API docs.
 * When you change a route or schema in code, update the matching section here
 * so the published docs at /docs stay accurate.
 *
 * For future: can be auto-generated from Zod schemas via
 * @asteasolutions/zod-to-openapi. For v1, handwriting is simpler.
 */
export const openApiSpec = {
	openapi: "3.1.0",
	info: {
		title: "ASLZAR External API",
		version: "0.1.0",
		description:
			"HTTP service that lets authorized external developers send plain-text Telegram messages (confirmation codes, notifications) via the ASLZAR bot.\n\n**Authentication:** Every request must include an `Authorization: Bearer <api-key>` header. API keys start with `ak_` and are provisioned by the ASLZAR team.",
		contact: {
			name: "ASLZAR"
		}
	},
	servers: [
		{ url: "https://api.aslzar.uz", description: "Production" },
		{ url: "http://localhost:3001", description: "Local development" }
	],
	security: [{ bearerAuth: [] }],
	tags: [
		{ name: "Messages", description: "Send Telegram messages" },
		{ name: "System", description: "Health checks and operational endpoints" }
	],
	paths: {
		"/health": {
			get: {
				tags: ["System"],
				summary: "Health check",
				description: "Returns 200 if the service is running. Used by Railway for uptime checks. No authentication required.",
				security: [],
				responses: {
					"200": {
						description: "Service is healthy",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: { ok: { type: "boolean", example: true } }
								}
							}
						}
					}
				}
			}
		},
		"/v1/external/sendMessage": {
			post: {
				tags: ["Messages"],
				summary: "Send a Telegram message",
				description:
					"Sends a plain-text message via the ASLZAR bot to the specified Telegram chat.\n\n### Prerequisites\n- The recipient must have started the bot (tapped Start in @aslzar_bot) before they can receive messages. Telegram does not allow bots to initiate conversations.\n- `text` is sent as plain text — no Markdown or HTML parsing.\n\n### Rate limits\n- Telegram global: ~30 messages/second per bot\n- Per private chat: ~1 message/second (burst up to 4)\n- Per group: ~20 messages/minute\n\nWhen Telegram rate-limits us, you get a `429` with `retry_after` seconds.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/SendMessageRequest" },
							examples: {
								confirmationCode: {
									summary: "Confirmation code",
									value: {
										chat_id: 6764272076,
										text: "Your ASLZAR verification code is 482913"
									}
								},
								channelPost: {
									summary: "Post to channel by username",
									value: {
										chat_id: "@aslzar_news",
										text: "New products available — check the catalog!"
									}
								}
							}
						}
					}
				},
				responses: {
					"200": {
						description: "Message delivered",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SendMessageSuccess" }
							}
						}
					},
					"400": {
						description: "Invalid request body or Telegram rejected the chat_id/text",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					},
					"401": {
						description: "Authentication failed (missing or invalid API key)",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					},
					"403": {
						description: "Telegram refused to deliver (user blocked bot, hasn't started bot, etc.)",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					},
					"429": {
						description: "Rate limited by Telegram. Response includes retry_after seconds.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					},
					"500": {
						description: "Unexpected server error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					},
					"502": {
						description: "Telegram API is misconfigured or unavailable",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					}
				}
			}
		}
	},
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "ak_<64 hex chars>",
				description: "API key issued by the ASLZAR team. Format: `ak_` prefix + 64 hex characters."
			}
		},
		schemas: {
			SendMessageRequest: {
				type: "object",
				required: ["chat_id", "text"],
				additionalProperties: false,
				properties: {
					chat_id: {
						oneOf: [
							{ type: "integer", example: 6764272076 },
							{ type: "string", example: "@aslzar_news" }
						],
						description:
							"Telegram chat identifier.\n- For private 1:1 chats: the user's Telegram ID (positive integer)\n- For channels: `@channelusername` or the negative channel ID\n- For groups/supergroups: the negative group ID"
					},
					text: {
						type: "string",
						minLength: 1,
						maxLength: 4096,
						description: "Message body. Plain text only — 1 to 4096 characters.",
						example: "Your code is 482913"
					}
				}
			},
			SendMessageSuccess: {
				type: "object",
				required: ["ok", "result"],
				properties: {
					ok: { type: "boolean", const: true },
					result: { $ref: "#/components/schemas/TelegramMessage" }
				}
			},
			TelegramMessage: {
				type: "object",
				description: "The Telegram Message object echoed back by Telegram after delivery.",
				properties: {
					message_id: { type: "integer", example: 12345, description: "Unique ID of the sent message within the chat" },
					date: { type: "integer", example: 1729501234, description: "Unix timestamp when the message was sent" },
					chat: {
						type: "object",
						properties: {
							id: { type: "integer", example: 6764272076 },
							type: { type: "string", enum: ["private", "group", "supergroup", "channel"] }
						}
					},
					text: { type: "string", example: "Your code is 482913" }
				}
			},
			ErrorResponse: {
				type: "object",
				required: ["ok", "error"],
				properties: {
					ok: { type: "boolean", const: false },
					error: {
						type: "object",
						required: ["code", "message"],
						properties: {
							code: {
								type: "string",
								description: "Machine-readable error code. Stable — clients can switch on this.",
								enum: [
									"invalid_request",
									"missing_authorization",
									"invalid_authorization_scheme",
									"invalid_api_key",
									"disabled_api_key",
									"chat_not_found",
									"text_too_long",
									"empty_text",
									"bad_request",
									"user_blocked_bot",
									"user_not_started",
									"user_deactivated",
									"bot_kicked",
									"forbidden",
									"rate_limited",
									"bot_misconfigured",
									"telegram_unavailable",
									"telegram_error",
									"internal_error",
									"not_found"
								]
							},
							message: {
								type: "string",
								description: "Human-readable explanation. Do NOT parse — use `code` for programmatic handling."
							},
							retry_after: {
								type: "integer",
								description: "Only on `rate_limited`. Seconds the client should wait before retrying."
							},
							issues: {
								type: "array",
								description: "Only on `invalid_request`. Zod validation issues with path + message.",
								items: { type: "object" }
							}
						}
					}
				}
			}
		}
	}
} as const;
