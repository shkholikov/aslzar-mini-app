# Changelog

All notable changes to the ASLZAR platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The platform version is the single source of truth in the root `package.json` (`version`).
Every committed or deployed change bumps that version and adds an entry here.

## [Unreleased]

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
