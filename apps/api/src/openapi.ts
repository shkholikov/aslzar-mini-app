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
		title: "ASLZAR BOT External API",
		version: "1.0.0",
		description:
			"HTTP service that lets authorized external developers send Telegram messages (confirmation codes, notifications) via the ASLZAR bot.\n\n**How it works**\n- Send the customer's phone number (digits only, no `+`). We look it up in our database to find the matching Telegram user.\n- If no match is found, we return `user_not_registered` — the user must first open **@aslzar_bot** and tap **Start**, then share their phone.\n- Text can optionally be formatted via `parse_mode` (HTML or MarkdownV2). Omitting `parse_mode` sends plain text.\n\n**Authentication:** Every request must include an `Authorization: Bearer <api-key>` header. API keys start with `ak_` and are provisioned by the ASLZAR team.\n\n**Rate limit:** 60 requests per minute per API key (in addition to Telegram's own ~30 msg/sec global and ~1 msg/sec per private chat limits). Exceeding ours returns `429 rate_limited` with a `retry_after` field.",
		contact: {
			name: "ASLZAR"
		}
	},
	servers: [
		{ url: "https://api.aslzarbot.uz", description: "Production" },
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
					'Sends a Telegram message via the ASLZAR bot to the user identified by the given phone number.\n\n### Flow\n1. Client sends `{ phone, text, parse_mode? }` (phone = digits only).\n2. We look up the phone in our users collection. If no match → `404 user_not_registered`.\n3. We resolve the Telegram `chat_id` from the matched user and call Telegram\'s `sendMessage`.\n\n### Prerequisites\n- The recipient must have started the bot (tapped Start in @aslzar_bot) **and** shared their phone before they can receive messages.\n- By default `text` is sent as plain text. Pass `parse_mode: "HTML"` or `"MarkdownV2"` to format bold, links, code blocks, etc.\n\n### Rate limits\n- **Ours:** 60 requests/minute per API key. Over-limit → `429 rate_limited` with `retry_after` seconds.\n- **Telegram\'s (upstream):** ~30 msg/sec global per bot, ~1 msg/sec per private chat, ~20/min per group. If Telegram throttles us, we pass through `429 rate_limited` with its `retry_after`.',
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/SendMessageRequest" },
							examples: {
								confirmationCode: {
									summary: "Plain confirmation code",
									value: {
										phone: "998957770000",
										text: "Your ASLZAR verification code is 482913"
									}
								},
								htmlFormatted: {
									summary: "HTML-formatted message",
									value: {
										phone: "998957770000",
										text: "Your code: <b>482913</b>. Expires in 5 minutes.",
										parse_mode: "HTML"
									}
								},
								markdownFormatted: {
									summary: "MarkdownV2-formatted message",
									value: {
										phone: "998957770000",
										text: "Order ready\\! Track it here: [link](https://example\\.com/track/123)",
										parse_mode: "MarkdownV2"
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
						description: "Invalid request body (failed phone/text validation) or Telegram rejected the message",
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
						description: "Telegram refused to deliver (user blocked bot, user deactivated, bot kicked from group, etc.)",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					},
					"404": {
						description:
							"Phone does not match any user who has started @aslzar_bot. Ask the user to open the bot, tap Start, then share their phone. Error code: `user_not_registered`.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" }
							}
						}
					},
					"429": {
						description:
							"Rate limited. Either our per-key limit (60 req/min) or Telegram's (~30 msg/sec global / ~1 msg/sec per chat). Response includes `retry_after` seconds.",
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
				required: ["phone", "text"],
				additionalProperties: false,
				properties: {
					phone: {
						type: "string",
						pattern: "^\\d{7,15}$",
						example: "998957770000",
						description:
							"Customer phone number — digits only, no `+` sign, no spaces, no punctuation. 7–15 digits. Must match a Telegram user who has already started @aslzar_bot and shared their phone. If no user is found with this phone, the API returns `404 user_not_registered`."
					},
					text: {
						type: "string",
						minLength: 1,
						maxLength: 4096,
						description:
							"Message body. 1–4096 characters. By default sent as plain text. Use `parse_mode` to enable HTML/Markdown formatting.",
						example: "Your ASLZAR verification code is 482913"
					},
					parse_mode: {
						type: "string",
						enum: ["HTML", "MarkdownV2", "Markdown"],
						description:
							'Optional formatting mode for `text`. Omit (the default) to send plain text with no parsing. `HTML` supports `<b>`, `<i>`, `<a href="...">`, `<code>`, etc. `MarkdownV2` uses `*bold*`, `_italic_`, `[link](url)` syntax — special characters like `.`, `-`, `(`, `)` **must** be escaped with a backslash per Telegram\'s rules. `Markdown` is legacy and officially deprecated — prefer `MarkdownV2`. See https://core.telegram.org/bots/api#formatting-options'
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
							id: { type: "integer", example: 123456789 },
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
									"user_not_registered",
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
