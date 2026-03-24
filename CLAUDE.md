# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ASLZAR is a Telegram Mini App loyalty platform built as a pnpm monorepo with Turborepo. It consists of three main applications sharing a common MongoDB database.

## Common Commands

```bash
# Development (all apps in parallel)
pnpm dev

# Individual app development
pnpm dev:webapp    # Next.js webapp (port 3000)
pnpm dev:admin     # Next.js admin panel
pnpm dev:bot       # Grammy Telegram bot

# Build all apps
pnpm build

# Lint individual apps
pnpm --filter webapp lint
pnpm --filter admin lint
```

## Architecture

### Monorepo Structure

- **apps/webapp**: Telegram Mini App (Next.js 15 with Turbopack, React 19)
- **apps/admin**: Admin dashboard (Next.js 16, React 19)
- **apps/bot**: Telegram bot (Grammy framework, TypeScript)
- **packages/shared**: Placeholder for shared utilities

### Data Flow

1. **Bot** creates user sessions in MongoDB when users interact via Telegram
2. **Webapp** reads/updates user sessions and integrates with external 1C API for customer verification
3. **Admin** manages users, products, broadcasts, employees, and suggestions

### Key Shared Collections (MongoDB)

- `users` - Telegram user sessions (created by bot, read/updated by webapp)
- `broadcast_jobs` - Admin creates, bot processes and sends
- `channel_posts` - Bot stores group messages, webapp displays as "Yangiliklar"
- `products` - Admin CRUD, webapp catalog display
- `employees` - Admin manages, bot validates referral codes (empN format)
- `suggestions` - Webapp submits, admin views

### Webapp Provider Hierarchy

```
TelegramProvider → TelegramGuard → UserProvider → children
```

- `useTelegram()` - Access Telegram WebApp SDK
- `useUser()` - Access 1C user data (fetched via `/api/users`)

### Bot Session Structure

Sessions use Telegram user ID as key. Key fields:

- `phone_number` - Normalized (digits only)
- `isVerified`, `user1CData` - Populated after 1C verification
- `pendingReferralCode`, `pendingEmployeeReferralCode` - Processed after phone verification
- `referredByEmployeeCode` - Set when user joined via employee link

### Admin Authentication

Cookie-based HMAC-signed sessions. Requires `ADMIN_SESSION_SECRET` env var.

## Environment Variables

Each app has `.env.development.local` and `.env.production.local`. Key variables:

- `MONGO_DB_CONNECTION_STRING`, `MONGO_DB_NAME`
- `MONGO_DB_COLLECTION_*` for collection names
- `BOT_TOKEN`, `CHANNEL_ID` (bot)
- `ADMIN_SESSION_SECRET` (admin)

## Tech Stack Notes

- **Webapp**: Uses `@twa-dev/sdk` for Telegram WebApp integration, Radix UI components, TanStack Table, Sonner toasts
- **Admin**: Uses Vercel Blob for image uploads, bcryptjs for password hashing, xlsx for exports
- **Bot**: Grammy with MongoDB session adapter, node-cron for scheduled tasks (payment reminders, broadcasts)

## Referral System

Two types:

1. **User referral** - Numeric code (user's Telegram ID): `/start 6764272076`
2. **Employee referral** - Pattern `empN`: `/start emp5`

Employee codes are auto-generated (emp1, emp2...) using a `counters` collection to ensure uniqueness. Employee referral attribution is one-time: once `referredByEmployeeCode` is set on a user session it is never overwritten.

## 1C API Integration

External ERP API used for customer verification. Key conventions:

- Success indicated by `response.code === 0`
- Basic Auth via `API_USERNAME`/`API_PASSWORD` env vars (`apps/bot/src/api.ts`)
- Phone numbers always prefixed with `+` before sending
- After webapp registers a user, it updates the MongoDB session so the bot sees `isVerified: true` without a re-fetch

## Bot Scheduler & Broadcast

**Payment reminders** (`apps/bot/src/scheduler.ts`): Cron runs at 10:00 AM Tashkent time. Sends reminders at 0, 3, and 5 days before payment due date. Idempotent per user per day — logs stored in `reminder_logs` collection.

**Broadcast processor** (`apps/bot/src/broadcast.ts`): Atomically claims `pending` jobs to prevent duplicate sends. Audience filters: `verified`/`nonVerified`, `aktiv`/`aktivEmas`, `Silver`/`Gold`/`Diamond` (level filters are OR-ed; combined with AND). Cancellable mid-send (checked every 5 messages).

## MongoDB Patterns

- Sessions stored as `{ key: telegramUserId, value: sessionData }` (Grammy MongoDBAdapter format, not `_id`-keyed)
- Webapp and admin create a **fresh MongoClient per API call** — no persistent connection pooling
- `counters` collection provides auto-increment sequences (used for employee referral code generation)
- Additional collections beyond what the bot uses: `admin_users`, `reminder_logs`, `counters`

## Environment Loading (Bot)

Priority order in `apps/bot/src/config.ts`:

```
.env.{NODE_ENV}.local > .env.{NODE_ENV} > .env.local > .env
```

Defaults to `development` if `NODE_ENV` is unset.
