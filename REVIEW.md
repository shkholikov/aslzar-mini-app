# Review rules

Read by `/code-review`, `/security-review` and the Claude PR review workflow.

## Output

- Start with the count: "N findings (X important, Y nits)". Zero findings: say "Nothing to fix."
- Every finding cites `path:line` and says what breaks for a user.
- Tag each finding Important, Nit or Pre-existing (bug in code this PR did not touch).
- At most 5 nits. Skip style the formatter or linter already enforces.
- Flag the bug class once ("3 routes skip the initData check"), not each instance separately.
- On a re-review, check only the new commits. Do not repeat an earlier finding.
- Name the risk tier of the PR in the summary.

## Failure modes in this repo

- Mini App auth trusts Telegram `initData` without checking the hash, or accepts an old `auth_date`.
- A bonus token can be forged, reused, or verified with the wrong secret.
- 1C slow or unreachable is treated as an answer ("not a client", zero balance). A failed call must leave fields out. See incidents.md, 2026-10-15.
- The bot treats a group or channel message as a private chat. See incidents.md, 2026-10-15.
- A broadcast or scheduler job sends without handling Telegram 403 (blocked bot) and 429 (rate limit).
- A MongoDB update or delete runs with an empty or user-controlled filter.
- A partner-facing `/v1/external/*` route skips the API key check or leaks another partner's data.
- A functional change without a version bump in root `package.json` and a `CHANGELOG.md` entry.

## Risk tiers

- High (before merging, the owner reads the diff of every High file; same-day merge is fine):
  - `apps/api/src/auth.ts`, `apps/api/src/auth-miniapp.ts`, `apps/api/src/bonus-token.ts`
  - `apps/api/src/integrations/` (1C, amoCRM, Besales, ASLZAR ID, purchases)
  - `apps/api/src/sync-1c.ts`, `apps/api/src/sync-1c-cron.ts`
  - `apps/admin/lib/auth.ts`, `apps/admin/lib/auth-utils.ts`
  - `apps/bot/src/callback-server.ts`
  - `apps/admin/vercel.json`, `turbo.json`, `.github/`, any `.env.example`
- Low (merge once CI is green), only when every changed file is one of:
  - `*.md`, `CHANGELOG.md`, `apps/*/public/**`, `*.css`
- Medium: everything else. Merge after the AI review is resolved.

One High file makes the whole PR High.

## Skip

- `pnpm-lock.yaml`, `dist/`, `.next/`, generated OpenAPI output.

## Rules from incidents

- 2026-10-15: a failed 1C call never becomes "not a client". (1C failure mode above)
- 2026-10-15: bot handlers check `chat.type === "private"` before replying or forwarding. (group chat failure mode above)
