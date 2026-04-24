# ASLZAR External API

HTTP service that lets authorized external developers send plain-text Telegram messages (confirmation codes, notifications) through the ASLZAR bot.

## Interactive docs

Live OpenAPI/Swagger UI is served from the API itself:

- **UI:** `https://api.aslzarbot.uz/docs` (or `http://localhost:3001/docs` in dev)
- **Raw spec:** `https://api.aslzarbot.uz/docs.json` — import into Postman, Insomnia, `openapi-typescript`, or any code generator

The UI includes a **Try It Out** button — paste an API key once (persists across reloads), fill in a chat_id and text, click Execute, see the real Telegram response.

## Endpoints

### `POST /v1/external/sendMessage`

Send a Telegram message (confirmation code, notification) to a user identified by phone number. The API looks up the phone in the ASLZAR user database, resolves the user's Telegram `chat_id`, and delivers the message via the bot.

**Headers**

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your-api-key>` (key starts with `ak_...`) |

**Request body**

```json
{
  "phone": "998957770000",
  "text": "Your confirmation code is 123456"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `phone` | string | Yes | Customer phone — **digits only, no `+` sign, no spaces, no punctuation**. Must match `/^\d{7,15}$/`. The user **must have already started @aslzar_bot and shared their phone**, otherwise the API returns `404 user_not_registered`. |
| `text` | string | Yes | 1–4096 characters. Plain text by default. Use `parse_mode` to enable formatting. |
| `parse_mode` | string | No | One of `"HTML"`, `"MarkdownV2"`, `"Markdown"`. Omit to send plain text (default). See [Telegram formatting options](https://core.telegram.org/bots/api#formatting-options). |

**Success response** — `200 OK`

```json
{
  "ok": true,
  "result": {
    "message_id": 12345,
    "date": 1729501234,
    "chat": { "id": 123456789, "type": "private" },
    "text": "Your confirmation code is 123456"
  }
}
```

**Error response** — non-2xx

```json
{
  "ok": false,
  "error": {
    "code": "user_not_registered",
    "message": "No user with that phone number has started the bot yet. Ask the user to open @aslzar_bot and tap Start, then share their phone."
  }
}
```

## Error codes

| HTTP | `error.code` | What it means |
| --- | --- | --- |
| 400 | `invalid_request` | Request body failed validation (bad phone format, missing text, unknown fields, etc.). Response includes Zod `issues` array with details. |
| 400 | `chat_not_found` | Telegram rejected the resolved `chat_id`. Rare — would imply our DB has a stale record. |
| 400 | `text_too_long` | Text exceeds 4096 chars. |
| 401 | `missing_authorization` | `Authorization` header missing. |
| 401 | `invalid_authorization_scheme` | Header present but not using `Bearer <key>` format. |
| 401 | `invalid_api_key` | Key not recognized. |
| 403 | `disabled_api_key` | Key was disabled by admin. |
| 403 | `user_blocked_bot` | User blocked the bot. |
| 403 | `user_not_started` | User started the bot once but hasn't shared their phone, and Telegram now refuses to let us initiate the conversation. Ask them to re-open @aslzar_bot. |
| 403 | `user_deactivated` | User's Telegram account is deactivated. |
| **404** | **`user_not_registered`** | **Phone does not match any user who has started @aslzar_bot. Ask the user to open the bot, tap Start, then share their phone.** |
| 429 | `rate_limited` | Hit a rate limit — either ours (60 req/min per API key) or Telegram's (see below). Response includes `retry_after` seconds; wait that long, then retry. |
| 502 | `bot_misconfigured` | Server-side bot token issue. |
| 502 | `telegram_unavailable` | Telegram API is down or 5xx. |

## Rate limits

Two layers apply to every request:

1. **Our per-API-key limit: 60 requests per minute** (sliding window, enforced before we hit Telegram). On exceed → `429 rate_limited` with `Retry-After` header and `retry_after` in the body.

2. **Telegram's upstream limits** (applied after we forward the request):
   - Global per bot: ~30 messages/second
   - Per private chat: ~1 message/second sustained (bursts up to ~4 usually tolerated)
   - Per group: ~20 messages/minute

If Telegram throttles us, we map it to the same `429 rate_limited` with their `retry_after`. Treat both cases the same in client code: read `retry_after`, wait, retry.

## Quickstart for external devs

1. Get an API key from the ASLZAR team.
2. Tell your customer to open **@aslzar_bot** in Telegram, tap **Start**, and share their phone number when prompted. This is a one-time step — Telegram requires it before any bot can send them messages.
3. Send the message using the phone they registered with (digits only, no `+`):

```bash
curl -X POST https://api.aslzarbot.uz/v1/external/sendMessage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ak_YOUR_KEY" \
  -d '{
    "phone": "998957770000",
    "text": "Your ASLZAR confirmation code: 123456"
  }'
```

With HTML formatting:

```bash
curl -X POST https://api.aslzarbot.uz/v1/external/sendMessage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ak_YOUR_KEY" \
  -d '{
    "phone": "998957770000",
    "text": "Your code: <b>482913</b>. Expires in 5 minutes.",
    "parse_mode": "HTML"
  }'
```

## Local development

```bash
# 1. Install deps (from monorepo root)
pnpm install

# 2. Copy env template
cp apps/api/.env.example apps/api/.env.development.local
# Edit .env.development.local — set MONGO_DB_CONNECTION_STRING, MONGO_DB_NAME, BOT_TOKEN

# 3. Run in dev mode
pnpm dev:api
# → 🚀 API listening on :3001

# 4. Create a dev API key
pnpm --filter api create-key "local-dev"
# → prints ak_<64 hex chars>; copy it

# 5. Test (use a phone that exists in your dev users collection)
curl -X POST http://localhost:3001/v1/external/sendMessage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ak_..." \
  -d '{ "phone": "998957770000", "text": "Hello" }'
```

## Production build

```bash
pnpm --filter api build        # compile to dist/
pnpm --filter api start        # run compiled server
```

Needs env vars: `MONGO_DB_CONNECTION_STRING`, `MONGO_DB_NAME`, `BOT_TOKEN`. Optional: `MONGO_DB_COLLECTION_API_KEYS` (default `api_keys`), `MONGO_DB_COLLECTION_USERS` (default `users`), `MONGO_DB_COLLECTION_API_CALLS` (default `api_calls`), `PORT` (default `3001`).

## Deploying to Railway

This app ships with `railway.json` configured for pnpm monorepo deploys.

### 1. Create the service

1. **New Project** → **Deploy from GitHub Repo** → pick this repo
2. Railway will detect the monorepo. In service **Settings**:
   - **Root Directory:** leave as `/` (Railway reads `apps/api/railway.json` via `watchPaths` below)
   - **Watch Paths:** `apps/api/**` — only redeploys when this app changes
   - **Config-as-Code path:** `apps/api/railway.json`

### 2. Set environment variables

In the Railway service → **Variables**, add:

| Variable | Value |
| --- | --- |
| `MONGO_DB_CONNECTION_STRING` | your Atlas/Mongo URI |
| `MONGO_DB_NAME` | `aslzar` (match your other services) |
| `MONGO_DB_COLLECTION_API_KEYS` | `api_keys` (optional, this is the default) |
| `MONGO_DB_COLLECTION_USERS` | `users` (optional, default). Matches the bot's session collection — this is where phone→chat_id lookup runs. |
| `MONGO_DB_COLLECTION_API_CALLS` | `api_calls` (optional, default). Audit log collection where every /sendMessage call is recorded. |
| `BOT_TOKEN` | same token as `apps/bot` |
| `NODE_ENV` | `production` |

Don't set `PORT` — Railway injects it automatically at deploy time.

### 3. Connect a custom domain

1. Service **Settings** → **Networking** → **Generate Domain** to get the default `*.up.railway.app`
2. Verify it works: `curl https://<default>.up.railway.app/health` → `{"ok":true}`
3. **Add Custom Domain** → e.g. `api.aslzarbot.uz`
4. Railway shows you a CNAME target
5. On your DNS provider (Cloudflare etc.), add:
   ```
   Type:  CNAME
   Name:  api
   Value: <railway-cname-target>
   TTL:   Auto
   ```
   ⚠️ **Cloudflare:** set proxy to **DNS-only (grey cloud)** until Railway verifies, then you can re-enable proxy in "Full (strict)" SSL mode.
6. Click **Verify** in Railway — Let's Encrypt cert provisions automatically

### 4. Provision the first API key

From your local machine, point at production Mongo:

```bash
cd apps/api
MONGO_DB_CONNECTION_STRING="mongodb+srv://..." \
MONGO_DB_NAME="aslzar" \
BOT_TOKEN="..." \
pnpm create-key "partner-name"
```

Copy the printed `ak_...` and hand it to the external dev.

### 5. Recommended resources

- **Start with 0.5 vCPU / 512 MB** — plenty for this workload
- Scale up if Railway metrics show sustained CPU > 30% or memory > 70%
- Bottleneck will always be Telegram's 30 msg/sec/bot rate limit, not your CPU

## Architecture

- `src/index.ts` — Express bootstrap, route mounting (auth → rate-limit → handler)
- `src/config.ts` — env loading (mirrors `apps/bot/src/config.ts`)
- `src/db.ts` — MongoDB singleton client; exposes `api_keys`, `users` (read-only), and `api_calls` collection helpers
- `src/auth.ts` — `Authorization: Bearer` middleware (SHA-256 lookup against `api_keys`)
- `src/rate-limit.ts` — in-memory sliding-window limiter (60 req/min per API key id)
- `src/telegram.ts` — raw fetch to Telegram's `sendMessage`
- `src/routes/send-message.ts` — Zod validation, phone→chat_id lookup, audit log, error mapping
- `src/openapi.ts` — OpenAPI 3.1 spec served at `/docs` and `/docs.json`
- `scripts/create-key.ts` — CLI for provisioning new API keys

**Cross-service dependency:** The phone-lookup step reads from the bot's `users` collection (grammY session docs). If the bot's session schema changes (field names, normalization), this API must update `findTelegramIdByPhone` in `src/db.ts` in lockstep. The API only reads from `users`; it never writes.
