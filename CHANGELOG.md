# Changelog

All notable changes to the ASLZAR platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The platform version is the single source of truth in the root `package.json` (`version`).
Every committed or deployed change bumps that version and adds an entry here.

## [Unreleased]

## [2.4.0] - 2026-07-22

### Added

- Dedicated "Shaxsiy ma'lumotlar" (user identity) page in the miniapp, opened via the Telegram settings gear. Identity info moved off the home feed for a cleaner main page.

### Changed

- Reduced the `/v1/users/me` cache TTL from 1 hour to 60 seconds so the bonus balance (`bonusOstatok`) and other 1C data stay fresh in the miniapp within a minute.
- Established a single platform version at the repo root and this changelog as the canonical history for the whole monorepo.
