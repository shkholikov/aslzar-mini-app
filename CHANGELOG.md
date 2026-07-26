# Changelog

All notable changes to the ASLZAR platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The platform version is the single source of truth in the root `package.json` (`version`).
Every committed or deployed change bumps that version and adds an entry here.

## [Unreleased]

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

Version numbers 2.5.0–2.8.0 belong to the Besales integration on the `dev` branch and are intentionally skipped here.

## [2.4.0] - 2026-07-22

### Added

- Dedicated "Shaxsiy ma'lumotlar" (user identity) page in the miniapp, opened via the Telegram settings gear. Identity info moved off the home feed for a cleaner main page.

### Changed

- Reduced the `/v1/users/me` cache TTL from 1 hour to 60 seconds so the bonus balance (`bonusOstatok`) and other 1C data stay fresh in the miniapp within a minute.
- Established a single platform version at the repo root and this changelog as the canonical history for the whole monorepo.
