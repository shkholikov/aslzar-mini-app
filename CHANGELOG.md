# Changelog

All notable changes to the ASLZAR platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The platform version is the single source of truth in the root `package.json` (`version`).
Every committed or deployed change bumps that version and adds an entry here.

## [Unreleased]

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

Version numbers 2.5.0–2.8.0 belong to the Besales integration on the `dev` branch and are intentionally skipped here.

## [2.4.0] - 2026-07-22

### Added

- Dedicated "Shaxsiy ma'lumotlar" (user identity) page in the miniapp, opened via the Telegram settings gear. Identity info moved off the home feed for a cleaner main page.

### Changed

- Reduced the `/v1/users/me` cache TTL from 1 hour to 60 seconds so the bonus balance (`bonusOstatok`) and other 1C data stay fresh in the miniapp within a minute.
- Established a single platform version at the repo root and this changelog as the canonical history for the whole monorepo.
