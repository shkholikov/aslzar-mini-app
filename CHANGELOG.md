# Changelog

All notable changes to the ASLZAR platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The platform version is the single source of truth in the root `package.json` (`version`).
Every committed or deployed change bumps that version and adds an entry here.

## [Unreleased]

## [2.16.0] - 2026-09-27

### Added

- The catalogue's "Bu buyum haqida so'rash" button now works. Tapping it sends the exact piece the customer picked — its size, weight, price and shop, together with the whole product — to the Besales AI assistant, which answers in the customer's chat with the bot. The Mini App says the answer is on its way and closes. Only the product and piece ids leave the phone; the details are looked up on our side, so the price the assistant quotes can't be changed on the customer's device. If the piece sold in the meantime, the customer is told and the list refreshes. The button had been visible but inactive since 2.14.0.
- The bot now tells Besales when an assistant message could not be delivered — because the customer blocked the bot, never started it, or deleted their account. Until now Besales counted those messages as delivered and kept writing to people who would never see them. At most one such report per customer per hour, so a misbehaving reply can never turn into an endless loop.

## [2.15.0] - 2026-09-27

### Added

- The Besales AI dialog integration, previously only on the development branch, is now part of the main codebase (versions 2.5.0–2.8.0 below). It stays switched off in production: nothing changes for customers until the Besales variables are set on the bot service and `BESALES_ENABLED=true`. This merge exists so the next Besales requirements can be built against the current code — including the catalogue, which the development branch did not have.

## [2.14.2] - 2026-09-04

### Fixed

- The shadow added to the category buttons in 2.14.1 was being cut off along the bottom edge, leaving them looking sliced. The row of buttons scrolls sideways, and a sideways-scrolling container also crops anything that extends above or below it — so the shadow had nowhere to land. The row now leaves room for it.

## [2.14.1] - 2026-09-03

### Fixed

- The search box and category buttons on the catalogue page now cast the same soft shadow as the product cards and the home screen's Level/Shartnoma/Bonus tiles. They were the only surfaces on that page without one, so against the marble background they looked flat and slightly sunken next to everything around them.

## [2.14.0] - 2026-09-01

### Changed

- The Mini App catalogue now shows the real shop. Products come from ASLZAR ID, which syncs from 1C every night, so what a customer sees is what is actually in the display cases — with real prices and real stock. Previously the catalogue held two dozen items entered by hand, last updated in April, with no stock information and almost no prices.
- Because a customer can now search, filter and page through thousands of items, the catalogue page had to earn its space back: the page heading was taking up half the first screen before a single product appeared. It is now a single compact line, and the search box and category buttons stay in place as you scroll.

### Added

- Search across the catalogue. If one of the words matches nothing, the app says so and shows results for the rest rather than returning an empty page.
- Filters by category, fineness, metal colour and whether a piece has a stone, plus toggles for photos and availability.
- A product page. It lists the individual pieces in stock, each with its own size, weight and price — two rings of the same design are not the same weight, so they are not the same price. Tapping a card in the catalogue opens it.
- Sharing from a product page. "Ulashish" sends the piece to a Telegram chat as a photo card with its name, fineness and price, and a button that opens the catalogue in the bot — so a share doubles as an invite. "Storyga" puts the photo on the sender's story, captioned "ASLZAR 💎 {piece} — {price}" with an invitation to open the bot for more. Both buttons are hidden on older Telegram versions that cannot do it.

### Fixed

- Local development against an ngrok tunnel no longer fails on POST requests. The origin allowlist is now enforced in production only; outside it any origin is accepted, so a tunnel hostname that changes on every restart does not need adding to the config each time. Production is unchanged.

### Note

- Staff no longer enter products in the admin panel; that page now explains where the catalogue comes from. Nothing was deleted — the editor can be switched back on if the shop ever needs to curate something by hand.
- The "Bu buyum haqida so'rash" button on a product page is in place but does nothing yet. It is waiting on the AI assistant integration, which is still being agreed with the partner. Until then no enquiry is recorded when a customer taps it.

## [2.13.0] - 2026-08-28

### Fixed

- Customers no longer get payment reminders for contracts that have already been closed or returned. When a contract is re-issued — the customer keeps the same item but signs a new contract — 1C leaves the old contract's payment schedule in place with every instalment still marked unpaid and no payments recorded against it. To the bot that looked like an ordinary unpaid contract, so it kept asking for money that was not owed. One customer was reminded every month for four months about a contract that had been replaced two weeks after it was signed. 1C now reports each contract's state, and the bot skips anything closed or returned. Reminders for genuinely active contracts are unchanged.
- The "Kutilayotgan to'lovlar" block in the app no longer lists instalments from closed or returned contracts, for the same reason.
- Admin dashboard money figures — outstanding payments, overdue amount and customer count, active contracts, and the 7- and 30-day upcoming totals — now leave out closed and returned contracts, so they show what customers actually owe. Monthly sales are deliberately unchanged: a contract that was later returned was still a sale in the month it was signed.

### Added

- Every row in the app's "Shartnomalar" table now shows the contract's state — Faol, Yopilgan or Qaytarilgan — so customers can tell at a glance which of their contracts are still running.
- The contracts table is now paged five at a time, with active contracts listed first. Almost every customer has five contracts or fewer and sees no change; the few with more no longer get one very long table.

### Note

- Until 1C reports a state for a contract, that contract is treated as active exactly as before. A delayed or partial 1C rollout therefore changes nothing rather than silencing reminders that should still go out.
- Dashboard trend arrows will show a one-off drop in outstanding and overdue figures for about a month, until the daily snapshots taken before this change age out of the comparison window. See `docs/1c-contract-status.md`.

## [2.12.1] - 2026-08-12

### Fixed

- Referrals are now dated by Tashkent time. The date sent to 1C when someone is added as a referral was taken from the server's own clock, which runs on UTC, so anyone who registered between midnight and 5 in the morning Tashkent time was recorded against the previous day. Those referrals now carry the date the customer actually saw on their phone.

## [2.12.0] - 2026-08-04

### Changed

- The bonus card QR code now carries a code that expires after five minutes instead of the customer's permanent client number. The app renews it by itself while the card is on screen, so customers always see a working code and nothing changes for them at the till. A screenshot of someone's card stops working within minutes, so it can no longer be passed around and used to spend their bonuses.
- If the phone has no connection when the code needs renewing, the card now says so and asks the customer to reconnect, instead of showing a code the till would reject.

### Note

- The old permanent format still works at the till until 1C is switched over to accept the new codes only. Until that switch, a client number on its own is still enough to write off bonuses, so this release does not close the problem on its own. See `docs/1c-bonus-token.md`.

## [2.11.2] - 2026-08-03

### Removed

- The client ID is no longer printed as text under the bonus card QR code, or under the enlarged version of it. Only the QR code itself is shown now. The number was readable in any screenshot of the card, and since the till accepts that number on its own when writing off bonuses, a shared screenshot was enough for someone else to spend another person's bonuses. Staff scan the code as before; the number is still visible to the customer on the "Shaxsiy ma'lumotlar" page.

## [2.11.1] - 2026-08-01

### Fixed

- The profile stats (Level, Shartnoma, Bonus) and the "Tasdiqlangan Mijoz" badge no longer appear with a delay when the Mini App is opened. Previously the app waited for a full round-trip to 1C before it could show anything, so on most launches the cards were missing for the first few seconds and then jumped into place. The app now shows the last known values straight away and quietly fetches the current ones in the background, so the bonus balance stays just as up to date as before.
- While the data is still loading, the three cards now show placeholders instead of being absent from the screen. They previously disappeared entirely until the data arrived, which pushed the rest of the page down when it did.

### Changed

- The Level, Shartnoma and Bonus cards are now shown to every user. Users who have not registered yet see a dash for their level (they do not have one) and zeros for contracts and bonuses, followed as before by the invitation to register.

## [2.11.0] - 2026-07-30

### Added

- New "ASLZAR bonus kartasi" card showing the customer's 1C client ID as a QR code, so shop staff can scan it at the till and find the customer instantly instead of typing the ID by hand. The client ID is also printed under the code as a fallback if the scan fails. Tapping "QR kodni kattalashtirish" enlarges the code to fill the screen for easier scanning; tapping anywhere closes it again. The card appears on the home screen and on the personal-details page, and only for ASLZAR customers — the same condition as the referral programme.

### Changed

- The profile picture on the home screen is larger, and the "Tasdiqlangan / Tasdiqlanmagan Mijoz" badge now sits directly beneath it (previously below the greeting) and is slightly bigger.

## [2.10.0] - 2026-07-26

### Added

- New "Referal" page in the admin panel (superadmin only) for managing the referral programme: the platform-wide default limit that applies to every user without an individual one, plus an overview showing how many customers there are, how many have reached their limit, how many have a custom limit, and the total number of referrals.

### Changed

- The default referral limit is now configurable instead of fixed at 5. The bot reads it fresh on every referral so a change takes effect immediately; the miniapp and admin pick it up within a minute. If it has never been saved, everything falls back to 5, so no setup is required.
- The referral limit field on a user's page now shows the limit currently in force instead of an empty box with a hint.

## [2.9.0] - 2026-07-26

### Added

- Per-user referral limit, managed by ASLZAR instead of 1C. Every user may add 5 referrals by default; admins can raise or lower the cap for any individual user. Users who already have more referrals than their cap keep them — they simply cannot add new ones.
- New user profile page in the admin panel (`/users/<telegram-id>`, opened from the ID column of the users list): identity and Telegram details, 1C profile, financial status, the list of people they invited, and the referral-limit editor with an audit trail of who changed it and when.
- The bot now tells the inviter when a referral was not counted because their limit is reached. The invited person sees nothing and registers as usual — only the referral attribution is skipped.
- Referral counter in the miniapp: the bonus section shows "Takliflar" alongside Level and Bonus, now three tiles in one row.

### Changed

- At the referral limit the miniapp replaces the QR code, "Nusxa olish" and "Ulashish" with a short explanation that new registrations via the link are no longer counted. The API refuses to mint a shareable referral message in that state, so the block cannot be bypassed.
- The referral count is now read live from 1C at the moment a referral is attributed, instead of the session copy that could be up to 24 hours old.

## [2.8.0] - 2026-07-25

### Added

- "Typing…" indicator for the async Besales dialog. After forwarding a message the bot waits `BESALES_TYPING_DELAY_MS` (default 10s — fast AI replies never flash a typing bubble), then loops the typing action until the callback arrives, capped at `BESALES_TYPING_MAX_MS` (default 30s) so a missing callback can't leave it spinning. Cleared the moment the reply/followup lands.

## [2.7.0] - 2026-07-24

### Changed

- Improved the bot's health check. `GET /health` now returns structured JSON (status, version, uptime, timestamp) instead of plain `ok`, and stays dependency-free so a transient DB blip can't trigger a container restart. Documented in the OpenAPI spec / Swagger UI.

## [2.6.0] - 2026-07-24

### Added

- Swagger / OpenAPI docs for the bot's Besales webhook surface, served by the callback server at `GET /docs` (Swagger UI) and `GET /openapi.json` (OpenAPI 3.1 spec). Documents `/health` and `/webhooks/besales` — signature scheme, request payload (text/buttons/media), and response codes — so the Besales team can view the contract at `https://dev-bot.aslzarbot.uz/docs`. Swagger UI assets are pinned (`swagger-ui-dist@5.32.11`) with Subresource Integrity hashes.

## [2.5.0] - 2026-07-23

### Added

- Besales AI dialog integration in the bot (`apps/bot`). Free-text messages and inline-button taps that aren't handled by existing flows (start, contact, referral) are forwarded to the Besales AI, which replies asynchronously via an HMAC-verified callback the bot receives on its own HTTP server (`/webhooks/besales`) and delivers back to the user (text, buttons, media). Callbacks are deduplicated via a `besales_deliveries` collection with a 7-day TTL. Entirely behind the default-off `BESALES_ENABLED` switch — no behavior change until enabled with real Besales credentials. Adds `apps/bot/.env.example`.

## [2.4.0] - 2026-07-22

### Added

- Dedicated "Shaxsiy ma'lumotlar" (user identity) page in the miniapp, opened via the Telegram settings gear. Identity info moved off the home feed for a cleaner main page.

### Changed

- Reduced the `/v1/users/me` cache TTL from 1 hour to 60 seconds so the bonus balance (`bonusOstatok`) and other 1C data stay fresh in the miniapp within a minute.
- Established a single platform version at the repo root and this changelog as the canonical history for the whole monorepo.
