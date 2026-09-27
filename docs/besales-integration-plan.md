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
  `contact` object. Besales must test for *absence*, not for an empty string.

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
   until the **bot** writes the phone. Any design where a pending Besales marker *consumes* a
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
2. *Additionally* forward the number to Besales when a request is pending (timestamp + TTL,
   not a boolean — a boolean never expires), fire-and-forget so the session write-back never
   waits on their network.
3. Add the missing `contact.user_id === ctx.from.id` guard.

Item 3 is a **pre-existing hole, still unfixed**: neither flow checks that a shared contact card
belongs to the sender, so attaching someone else's card writes their phone into your session and
`/v1/users/me` will serve that other client's 1C data (contracts, debt, bonus). Worth fixing on
its own merits, independently of Besales.

## Open follow-ups

- **`url` buttons are not rendered.** Besales's button contract is `value` | `url` |
  `requestContact`, but `buildKeyboard` (`besales-delivery.ts:23-31`) only emits
  `kb.text(label, value)` — a `url` button would become `callback_data` and a tap would come
  back as a phantom callback instead of opening a link. ~5 lines. Required before asking the
  agent to send a "Open the mini-app" button; until then the agent should give the link as text.
- **No profile-update push.** The phone is attached per message at send time. A user who chats
  first and registers afterwards is only revealed to Besales on their *next* message; if they
  never write again, Besales never learns the number. Fix would be a lightweight inbound after
  successful registration, or a contacts-update endpoint on their side.
- `requestContact` remains unimplemented in `besales-docs.ts` / the OpenAPI spec — the wire
  contract we publish still describes `{label, value}` buttons only.
