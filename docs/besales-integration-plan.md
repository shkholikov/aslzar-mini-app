# Besales AI Integration — Implementation Plan

**Scope:** Integrate the Besales external AI dialog API into `apps/bot` only (Bot API, no Mini App).
**Decisions locked:**

- Location: `apps/bot` (grammY), self-contained.
- AI routing: **fallback** — bot handles `/start`, contact sharing, referral, and known buttons first; any other free-text message falls through to the AI.
- Eligibility: **everyone** (verified or not); contact attributes sent when available.
- Callback receiver: small HTTP server inside the bot (Node built-in `http`), no new deps.
- Dev/prod: **separate Besales channels** (own `apiKey`/`channelId`/`webhookSecret`/callback URL) for `@aslzardevbot` vs `@aslzaruzbot`.

---

## Architecture

```
Customer → @aslzaruzbot ──(grammY message:text / callback_query)──► POST {inboundUrl}   [Bearer apiKey]
                                                                          │ AI (RAG+LLM, async)
@aslzaruzbot ◄──(bot.api.sendMessage)── http server ◄──── POST /besales/callback   [verify HMAC, 200 ≤10s]
```

- **Inbound** (bot → Besales): forward free text + button taps + (later) voice.
- **Callback** (Besales → bot): one endpoint receives `message.reply` and `message.followup`; verify HMAC, ack 200 fast, then deliver `data.messages[]` in order via the Bot API.

Identifier mapping:

- `externalUserId` = Telegram user id (`ctx.from.id`) — also the chat id we deliver back to.
- `externalMessageId` = Telegram message id (`ctx.message.message_id`) — idempotency key.
- `externalChatId` = chat id (defaults to externalUserId).
- `sourceChannel` = `"telegram"`.

---

## Phase 0 — Provisioning (external, blocks testing)

From Besales (×2 — one dev channel, one prod channel):

- `channelId`, `apiKey`, `webhookSecret`, inbound host → `inboundUrl`.

We provide to Besales:

- `callbackUrl` (HTTPS) — dev + prod.

Railway:

- Enable a **public HTTPS domain** on each bot service (currently polling workers, likely no domain). Callback hits `https://<bot-domain>/besales/callback`.
- Set the new env vars (below) on dev and prod bot services.

## Phase 1 — Env vars (`apps/bot`)

Read via `process.env` (bot has no config object). Add to `.env.example`, `.env.development.local`, `.env.production.local`:

```
BESALES_ENABLED=true              # master switch; false disables forwarding + callback handling
BESALES_INBOUND_URL=https://<host>/api/v2/channels/<channelId>/messages
BESALES_API_KEY=<apiKey>          # Bearer for inbound
BESALES_WEBHOOK_SECRET=<secret>   # HMAC verify for callbacks
PORT=3000                         # Railway provides; http server binds here
BESALES_CALLBACK_PATH=/besales/callback
```

Dev values point at the dev channel; prod at the prod channel.

## Phase 2 — Besales client + types (`apps/bot/src/besales.ts`, new)

- `InboundMessage` / callback payload TypeScript types (from the spec).
- `sendInbound(msg: InboundMessage): Promise<void>` — `POST BESALES_INBOUND_URL`, `Authorization: Bearer`, JSON body. Handle: `202` ok, `200` dup (ignore), `422` log, `429` honor `Retry-After` (log + drop or short retry). Never throw into the grammY handler (swallow + log).
- `verifyWebhookSignature(rawBody: Buffer, header: string): boolean` — `HMAC_SHA256(secret, rawBody)` hex, strip `sha256=`, `crypto.timingSafeEqual`.
- `buildContact(session)` — map `user1CData` / session → `{ firstName, lastName, username, phone, languageCode }` (omit unknowns).

## Phase 3 — Inbound forwarder (`apps/bot/src/bot.ts`)

Added **after** `/start` and `:contact` so flows win first (fallback semantics):

- `bot.on("message:text", ...)` — skip if text starts with `/` (defensive) or a known-flow guard is active; otherwise:
  - `ctx.replyWithChatAction("typing")` (optional UX while AI runs).
  - `sendInbound({ externalUserId, externalMessageId, externalChatId, text, sourceChannel:"telegram", contact: buildContact(ctx.session) })`.
- `bot.on("callback_query:data", ...)` — `ctx.answerCallbackQuery()`, then forward as inbound with `buttonPayload = ctx.callbackQuery.data` (and `text` = button label if available). New `externalMessageId` (use callback_query id).
- Guard: gate everything on `BESALES_ENABLED`.

(Voice/media is Phase 6 — optional.)

## Phase 4 — Callback HTTP server (`apps/bot/src/callback-server.ts`, new)

- `http.createServer` → listen on `PORT`. Routes: `POST BESALES_CALLBACK_PATH`, `GET /health`.
- Read the **raw** body (Buffer) for HMAC, then `verifyWebhookSignature` → 401 on mismatch.
- **Idempotency**: dedup by webhook `id`. Use a Mongo collection `besales_deliveries` (TTL index) — survives restarts/retries; bot is single-instance but retries repeat.
- **Respond `200` immediately** (≤10s budget), then deliver asynchronously so AI/network never blocks the ack.
- `start(bot.api)` exported; called in `bootstrap()` next to `bot.start()`.

## Phase 5 — Delivery mapping (callback → Telegram)

For each item in `data.messages` (in order):

- `text` → `bot.api.sendMessage(externalUserId, text, { reply_markup })`.
- `buttons` (2D) → grammY `InlineKeyboard`: each `{label, value}` → `.text(label, value)`, rows preserved.
  - ⚠️ Telegram `callback_data` ≤ **64 bytes**. If a `value` exceeds it, store a short token → value map (Mongo) and send the token. Flag during integration.
- `media[]` → `sendPhoto` / `sendVoice` / `sendAudio` / `sendVideo` / `sendDocument` by `type`, using `url`.
- `message.followup` uses the same delivery path (no `requestId`).

## Phase 6 — Voice / media inbound (optional, second iteration)

- `bot.on("message:voice" | "message:photo" | ...)` → `ctx.getFile()` → build Telegram file URL (`https://api.telegram.org/file/bot<token>/<path>`, valid ~1h ≥ Besales' 10 min) → `media:[{type,url,mimeType}]` in the inbound. Besales transcribes voice / vision for images.

## Phase 7 — Observability & limits

- Log every inbound (`externalUserId`, `externalMessageId`, `requestId` from 202) and every delivery (`webhook id`, `event`, count).
- Honor inbound `429 Retry-After`.
- Never block the callback `200` on delivery work.

---

## Open items to confirm during build

1. Railway public domain on the bot service(s) — required for callbacks.
2. `callback_data` 64-byte limit → token map if Besales sends long button values.
3. Dedup store: Mongo `besales_deliveries` w/ TTL (recommended) vs in-memory.
4. Typing indicator UX while waiting for the async reply.
5. Do referral/menu deep-link flows ever collide with free text? (Fallback ordering should prevent it; verify.)

## Files

- `apps/bot/src/besales.ts` (new) — client, types, signature verify, contact mapping.
- `apps/bot/src/callback-server.ts` (new) — HTTP server, HMAC, dedup, delivery.
- `apps/bot/src/bot.ts` (edit) — fallback `message:text` + `callback_query:data` handlers; start callback server in `bootstrap()`.
- `apps/bot/.env.example` / `.env.*.local` (edit) — Besales env vars.
- `apps/bot/package.json` — no new deps (Node `http`/`crypto`).

---

# Decision log — phone numbers & the "share contact" button (2026-07-26)

Besales asked for two things: a `requestContact: true` button and a delayed/looping typing
indicator. The typing indicator shipped (v2.8.0). **The contact button was rejected**; this
section records why and what replaces it.

## How Besales gets a phone number today

Every inbound we send carries a `contact` block built by `buildContact()`
(`apps/bot/src/besales.ts:89-104`), called from both forwarders (`bot.ts:147`, `bot.ts:170`):

```json
"contact": { "firstName": "…", "lastName": "…", "username": "…", "phone": "+998901234567", "languageCode": "uz" }
```

- `phone` = `session.phone_number` (stored digits-only) with `+` prepended → E.164.
- `firstName` / `lastName` prefer the **1C** record (`imya` / `familiya`); the Telegram profile
  is only a fallback, so an unregistered user's `contact` may carry a nickname with emoji.
  Mixed sources are possible (1C first name + Telegram last name) when a 1C field is empty.
- **Unknown fields are omitted, not blanked.** `buildContact` strips `undefined` keys and
  returns `undefined` if nothing is known, so a user with no phone produces a payload with
  **no `phone` key at all** (not `""`, not `null`), and a fully unknown user produces no
  `contact` object. Besales must test for _absence_, not for an empty string.

`session.phone_number` has exactly **one writer in the whole monorepo**: `bot.ts:109`, inside
`bot.on(":contact")`. That handler fires only when Telegram delivers a contact card, and today
the only thing that causes that is the mini-app registration step calling `requestContact()`
(`apps/webapp/app/register/page.tsx:132`). Everything else — api, admin, webapp, scheduler —
only reads the field.

Consequence: **no mini-app registration → no phone, ever**, no matter how many messages the
user sends. Nothing parses phone numbers out of message text.

## Why the `requestContact` button was rejected

1. **It collides with registration.** The mini-app's `requestContact()` does not return the
   phone to the webapp — the docs confirm the callback yields only a boolean, and the
   `contactRequested` event only `status: "sent" | "cancelled"`. The webapp therefore polls
   `GET /v1/users/me` for 60s (`register/page.tsx:72-103`), which 404s (`api .../internal/users.ts:23`)
   until the **bot** writes the phone. Any design where a pending Besales marker _consumes_ a
   contact (skipping the session write) can silently hang registration.
2. **Business rule.** ASLZAR registers clients in 1C only through the mini-app form, with a
   real first/last name typed by the user (`POST /v1/users/register` → 1C `createUser`).
   A phone captured by a chat button does not produce a valid client record.

Note for future readers: the bot's `:contact` handler **never creates a 1C record** — it writes
the session phone and does a read-only `searchUserByPhone`. And a stored phone does not hide the
registration prompt (the mini-app gates it on `data.code !== 0`, `apps/webapp/app/page.tsx:33`).
So "a contact reaching the bot" and "registering someone in 1C" are separate things.

## Chosen solution — funnel through the mini-app

Instead of capturing a phone in chat, **the Besales AI agent asks the user to register in the
mini-app** when `contact.phone` is absent. After registration the phone and the real 1C name
ride along on every subsequent inbound automatically. One action, two outcomes: Besales gets a
verified number + real name, ASLZAR gets a client in 1C.

Agreed with the Besales team on 2026-07-26 (message sent in Russian). Requires **no bot code
change** — the mechanism already exists and only needs `BESALES_ENABLED=true`.

## If the button is ever revisited

The only safe shape is **additive, never consuming**:

1. `:contact` always runs the existing onboarding block, unchanged — no flag, no early return.
   Registration then cannot break by construction; the worst failure is "Besales misses one
   phone".
2. _Additionally_ forward the number to Besales when a request is pending (timestamp + TTL,
   not a boolean — a boolean never expires), fire-and-forget so the session write-back never
   waits on their network.
3. ~~Add the missing `contact.user_id === ctx.from.id` guard.~~ Done in 2.16.1 (`bot.ts`, `:contact` handler): a contact that isn't the sender's own is refused.

Item 3 is a **pre-existing hole, still unfixed**: neither flow checks that a shared contact card
belongs to the sender, so attaching someone else's card writes their phone into your session and
`/v1/users/me` will serve that other client's 1C data (contracts, debt, bonus). Worth fixing on
its own merits, independently of Besales.

## Open follow-ups

- ~~**`url` buttons are not rendered.**~~ Done in 2.17.0 — see "Buttons we render" below.
- **No profile-update push.** The phone is attached per message at send time. A user who chats
  first and registers afterwards is only revealed to Besales on their _next_ message; if they
  never write again, Besales never learns the number. Fix would be a lightweight inbound after
  successful registration, or a contacts-update endpoint on their side.
- ~~`requestContact` remains unimplemented~~ Done in 2.17.0 — see "Buttons we render" below.

# Events we send beyond chat messages (2.16.0, 2026-09-27)

Requested by Besales after go-live. Both are ordinary inbound messages (same endpoint, same auth); the kind is in `metadata.event`.

## `delivery_failed` — the agent's message never reached the user (bot)

We ack every callback with `200` before delivering (their 10s budget), so without this Besales counts a message to someone who blocked the bot as delivered. When Telegram refuses a callback message, `besales-delivery.ts` stops delivering that callback and sends:

```json
{
	"externalUserId": "766618738",
	"externalChatId": "766618738",
	"externalMessageId": "delivery-failed:<callback id>",
	"sourceChannel": "telegram",
	"metadata": { "event": "delivery_failed", "reason": "user_blocked_bot", "callbackId": "<callback id>" },
	"timestamp": 1790514542
}
```

- `reason`: `user_blocked_bot` | `user_not_started` | `user_deactivated` | `chat_not_found`. Only failures that mean "this person can't be reached" are reported; a network blip or a bad media URL is not.
- No `text` — it is not something the user said. **The agent must not reply to it.**
- **Loop guard:** if the agent did reply, that reply would fail the same way, forever. We report at most **once per user per hour** (key `delivery-failed:<chatId>:<UTC hour>` in `besales_deliveries`, 7-day TTL). If the guard write fails we skip the report rather than risk the loop.

## `product_ask` — catalogue "Bu buyum haqida so'rash" (api)

Sent by `apps/api` (`POST /v1/catalog/:productId/ask`, `src/integrations/besales.ts`), not the bot — the Mini App talks only to the API. The Mini App sends ids only; the API reads the product from its cache.

```json
{
  "externalUserId": "766618738",
  "externalChatId": "766618738",
  "externalMessageId": "catalog-ask:<userId>:<variantId>:<unix minute>",
  "sourceChannel": "telegram",
  "text": "Bu buyum haqida so'rash",
  "contact": { "firstName": "...", "phone": "+998...", "languageCode": "uz" },
  "metadata": { "event": "product_ask", "source": "miniapp_catalog", "product": { ... }, "variant": { ... } },
  "timestamp": 1790514542
}
```

Besales' three conditions:

- `text` is the button label in the customer's language (the Mini App is Uzbek-only), so the agent answers in it.
- `variant.id` is one of `product.variants[].id` — they drop the open piece from "other sizes" by id. Both come from the same cached object.
- `metadata` rides only on this message.

`product` and `variant` are the ASLZAR ID objects as-is; Besales reads `category.name`, `model`, `productId`, `fineness`, `color`, `stone`, `inStock`, `variants[]` and on the variant `id`, `size`, `weightGrams`, `price`, `article`, `branch.name`. Note `category.name` and `branch.name` are `{ ru, uz }` objects, and `uz` is often the Russian name (`uzIsFallback: true`).

The unix-minute in `externalMessageId` makes a double-tap a Besales duplicate (`200`) rather than two questions. The API returns `409` when the piece is gone, `503` when `BESALES_ENABLED` isn't `true` on the API service, `502` when Besales can't be reached.

# Phase 2 (2.17.0, 2026-09-27): `/start`, "share phone" button, Mini App buttons

The July decision above rejected the `requestContact` button because a design that _consumed_ the contact could hang Mini App registration. What shipped is the additive shape that decision said would be safe: the button feeds the **same** `:contact` handler registration already uses (phone saved, 1C lookup, pending referrals processed — unchanged), and only afterwards tells Besales. It depends on the 2.16.1 guard: a contact that isn't the sender's own is refused before any of this runs.

## Buttons we render

| Besales button                                                             | What the user sees                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ label, value }`                                                         | Inline button; tap comes back as `buttonPayload` (as before)                                                                                                                                                                                |
| `{ label, url }` on the Mini App host (`WEBAPP_URL` or `app.aslzarbot.uz`) | Inline `web_app` button — opens the Mini App **inside Telegram**, signed in. A plain url would open a browser, where `TelegramGuard` blocks the user                                                                                        |
| `{ label, url }` other `https://`                                          | Inline url button. Non-https or unparseable → skipped                                                                                                                                                                                       |
| `{ label, requestContact: true }`                                          | Telegram's "share my phone number" button on a **reply keyboard** (bottom of the screen), one-time. Telegram can't combine it with inline buttons in one message, so **any other buttons in that message are dropped** — it must come alone |

Code: `buildKeyboard` in `apps/bot/src/besales-delivery.ts`. Published contract: `Button` schema in `besales-docs.ts`.

## `contact_shared` — the user answered the agent's "share phone" button

When a message with a `requestContact` button is delivered, we record `contact-requested:<chatId>` in `besales_deliveries` (7-day TTL). When the contact arrives and the marker is younger than 24h, the `:contact` handler consumes it and sends:

```json
{
	"externalUserId": "766618738",
	"externalChatId": "766618738",
	"externalMessageId": "contact:<message id>",
	"sourceChannel": "telegram",
	"contact": { "firstName": "...", "phone": "+998...", "languageCode": "uz" },
	"metadata": { "event": "contact_shared", "foundIn1C": true }
}
```

- **Only after the agent's button.** A Mini App registration leaves no marker, so it sends nothing.
- `foundIn1C: true` — an existing ASLZAR client, recognised now (names in `contact` come from 1C). `foundIn1C: false` — we have the number but the person is **not a client in 1C**: clients are created only through the Mini App form with a real first and last name, so the agent should send the Mini App button.
- No `text`. Fires once per request (the marker is consumed).

## `start` — someone pressed Start

Sent at the end of `bot.command("start")`, after our own referral handling and welcome message, for **every** start:

```json
{
  "externalMessageId": "start:<message id>",
  "text": "/start",
  "contact": { ... },
  "metadata": { "event": "start", "referral": "employee", "referralCode": "emp5" }
}
```

- `referral`: `"client"` (a customer's link), `"employee"` (`empN`), or `null` (no or unrecognised code) — `startReferral()` in `besales.ts`.
- `referralCode` only for employees. For client links it is the inviter's Telegram id, which the agent doesn't need.
- Informational only. The referral is stored here and **decided later** in `:contact` (it can still be rejected — already a customer, inviter over the limit, self-referral), so the agent shouldn't promise a bonus at `/start`.
- Our welcome message with the Mini App button always goes out too; if the agent writes first, the user gets two messages.
