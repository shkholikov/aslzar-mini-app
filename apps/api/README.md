# ASLZAR External API

HTTP service that lets authorized external developers send plain-text Telegram messages (confirmation codes, notifications) through the ASLZAR bot.

## Interactive docs

Live OpenAPI/Swagger UI is served from the API itself:

- **UI:** `https://api.aslzarbot.uz/docs` (or `http://localhost:3001/docs` in dev)
- **Raw spec:** `https://api.aslzarbot.uz/docs.json` — import into Postman, Insomnia, `openapi-typescript`, or any code generator

The UI includes a **Try It Out** button — paste an API key once (persists across reloads), fill in a chat_id and text, click Execute, see the real Telegram response.

## Endpoints

### `POST /v1/external/sendMessage`

Send a plain-text message to a Telegram user via the bot.

**Headers**

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your-api-key>` (key starts with `ak_...`) |

**Request body**

```json
{
  "chat_id": 6764272076,
  "text": "Your confirmation code is 123456"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `chat_id` | number \| string | Yes | Telegram user ID (private DM) or `@channelusername`. The user **must have started the bot** before you can send them a message. |
| `text` | string | Yes | 1–4096 characters. Plain text — no Markdown/HTML parsing. |

**Success response** — `200 OK`

```json
{
  "ok": true,
  "result": {
    "message_id": 12345,
    "date": 1729501234,
    "chat": { "id": 6764272076, "type": "private" },
    "text": "Your confirmation code is 123456"
  }
}
```

**Error response** — non-2xx

```json
{
  "ok": false,
  "error": {
    "code": "user_not_started",
    "message": "Forbidden: bot can't initiate conversation with a user"
  }
}
```

## Error codes

| HTTP | `error.code` | What it means |
| --- | --- | --- |
| 400 | `invalid_request` | Request body failed validation (missing/invalid fields). |
| 400 | `chat_not_found` | `chat_id` doesn't exist or isn't reachable. |
| 400 | `text_too_long` | Text exceeds 4096 chars. |
| 401 | `missing_authorization` | `Authorization` header missing. |
| 401 | `invalid_authorization_scheme` | Header present but not using `Bearer <key>` format. |
| 401 | `invalid_api_key` | Key not recognized. |
| 403 | `disabled_api_key` | Key was disabled by admin. |
| 403 | `user_not_started` | User hasn't started the bot — they must tap **Start** on `@<your_bot>` first. |
| 403 | `user_blocked_bot` | User blocked the bot. |
| 403 | `user_deactivated` | User's Telegram account is deactivated. |
| 429 | `rate_limited` | Telegram rate-limited us. Response includes `retry_after` (seconds). |
| 502 | `bot_misconfigured` | Server-side bot token issue. |
| 502 | `telegram_unavailable` | Telegram API is down or 5xx. |

## Quickstart for external devs

1. Get an API key from the ASLZAR team (they run `pnpm --filter api create-key "your-company"` and send you the token).
2. Tell your customer to open **@aslzar_bot** in Telegram and tap **Start** (this is required before any message can be sent to them — Telegram's rule, not ours).
3. Obtain the customer's Telegram user ID. They can find it via bots like `@userinfobot`, or your integration can collect it when the user logs into your platform via Telegram Login.
4. Send the message:

```bash
curl -X POST https://api.aslzarbot.uz/v1/external/sendMessage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ak_YOUR_KEY" \
  -d '{
    "chat_id": 6764272076,
    "text": "Your ASLZAR confirmation code: 123456"
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

# 5. Test
curl -X POST http://localhost:3001/v1/external/sendMessage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ak_..." \
  -d '{ "chat_id": <your-telegram-id>, "text": "Hello" }'
```

## Production build

```bash
pnpm --filter api build        # compile to dist/
pnpm --filter api start        # run compiled server
```

Needs env vars: `MONGO_DB_CONNECTION_STRING`, `MONGO_DB_NAME`, `BOT_TOKEN`, and optionally `MONGO_DB_COLLECTION_API_KEYS` (default `api_keys`), `PORT` (default `3001`).

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

- `src/index.ts` — Express bootstrap
- `src/config.ts` — env loading (mirrors `apps/bot/src/config.ts`)
- `src/db.ts` — MongoDB singleton client, `api_keys` collection access
- `src/auth.ts` — `Authorization: Bearer` middleware (SHA-256 lookup)
- `src/telegram.ts` — raw fetch to Telegram's `sendMessage`
- `src/routes/send-message.ts` — Zod validation + error mapping
- `scripts/create-key.ts` — CLI for provisioning new API keys
