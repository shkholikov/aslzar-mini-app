# 1C contract status

## Why this exists

On 2026-08-27 a customer (1C client `00-00031449`) received a payment reminder for contract `00000102388` — 1 014 000 so'm due 2026-09-01 — that she did not owe.

The bot behaved correctly. It fetched live 1C data 0.6 s before sending, and 1C reported all six instalments as `status: true` (unpaid), `sumPayed: 0`, with `pays: []`.

The contract had in fact been re-issued as `00000104482` seventeen days later — same physical item (`goods.id: AZ000158400`), different consultant, different term, with a down payment added. 1C never cleared the old schedule and, until this change, exposed no field that distinguished a live contract from a dead one.

Scale before the fix, measured across all 14 598 cached customers:

| Contract shape | Contracts | Customers |
|---|---|---|
| Schedule + payments (normal) | 7 971 | 3 819 |
| Empty schedule | 2 104 | 2 048 |
| **Schedule but no payments** | **1 514** | **1 183** |
| — of those, all instalments still in the future (normal, new) | 515 | |
| — of those, **every** instalment overdue | 512 | |
| — of those, **some** instalments overdue | 487 | |

That last group — **999 contracts, ~9.87 bln so'm** — claimed overdue instalments with no payment ever recorded, the oldest dating to 2024-01-15. Those are dead contracts, not debt.

Note the account-level fields cannot be used as a sanity check: `debt`, `remain`, `latePayment`, `contract.active`, `contract.ended` and `contract.returned` are `0` for all 14 598 customers. 1C does not populate them.

## The field

1C added a contract-level `status` to each `contract.ids[]` entry in the `search` response, between `months` and `sum`:

```json
{
  "id": "00000102388",
  "months": 6,
  "status": "returned",
  "sum": 4503866.4,
  "schedule": [ ... ],
  "pays": []
}
```

Values: `active`, `closed`, `returned`.

## Three different fields named `status`

This is the main hazard when reading or writing code that touches 1C data.

| Path | Type | Meaning |
|---|---|---|
| `user1CData.status` | `boolean` | Customer activity — Aktiv / Aktiv emas |
| `user1CData.contract.ids[].status` | `string` | **Contract state — this document** |
| `user1CData.contract.ids[].schedule[].status` | `boolean` | `true` = instalment unpaid |

## How we read it

One rule, implemented three times because the contract type is already duplicated per app and there is no shared package:

- `apps/bot/src/helper.ts` — `isActiveContract()`
- `apps/webapp/lib/contract-status.ts` — `isActiveContract()`, plus the Uzbek label map
- `apps/admin/lib/dashboard.ts` — the same rule as MongoDB aggregation operators inside `computeContracts()`

The rule:

1. Trim and lowercase the value.
2. Return `false` only for `closed` or `returned`.
3. **Everything else — including a missing field — is treated as active.**

Step 3 is deliberate. It excludes by known terminal states rather than requiring `"active"`, so if 1C changes casing, adds a value, or a customer's cached record predates the rollout, we keep the old behaviour instead of silently suppressing every reminder. The bot logs a warning once per unrecognised value so a vocabulary change shows up in Railway logs rather than passing unnoticed.

## Where it is applied

| Place | Effect |
|---|---|
| `apps/bot/src/scheduler.ts` → `getUpcomingPayments()` | No reminders for closed/returned contracts. Covers both the cached pre-filter and the live 1C re-check, since both call the same function. |
| `apps/webapp/.../upcoming-payments.tsx` | "Kutilayotgan to'lovlar" skips them. |
| `apps/webapp/.../contracts.tsx` | Still listed, with a Faol / Yopilgan / Qaytarilgan badge, dimmed and sorted last. |
| `apps/admin/lib/dashboard.ts` → `computeContracts()` | Excluded from receivables, overdue, overdue customer count, active contracts, due7, due30. |
| `apps/admin/lib/dashboard.ts` → `computeSales()` | **Not** excluded, on purpose — a contract that was later returned was still a sale in the month it was signed. |

The field needs no transport changes: `apps/api/src/integrations/aslzar1c.ts` does no field filtering, `updateUserSession1CData` writes the 1C payload verbatim, and `/v1/users/me` spreads it whole. It reaches MongoDB and the Mini App on its own.

## Operational notes

**The bot fix does not wait for a re-sync.** `scheduler.ts` calls `searchUserByPhone` live before sending, so it uses the new field from the first 10:00 Tashkent run after 1C deploys, regardless of how stale the cache is.

**Admin and Mini App views do wait for a re-sync**, since they read cached documents. Two things to know:

- The nightly sync (`apps/api/src/sync-1c-cron.ts`) runs at 02:00 Tashkent.
- `sync-1c.ts` sets `STALE_HOURS = 24` and **skips any customer refreshed within the last 24 hours**. A manual sync fired shortly after the nightly one will therefore process almost nobody and look like it did nothing. On 2026-08-28 the cron processed 996 customers, not 14 581, for exactly this reason.

So: either let the 02:00 run do it, or fire a manual sync at least 24 hours after the last refresh.

**Watch the blast radius on the first run.** Compare the number of reminders sent against the 2026-08-27 baseline of 261. A drop is expected; a drop to near zero means 1C has over-marked contracts as closed and reminders that should go out are being suppressed.

## Still open on the 1C side

`schedule[].sumPayed` under-reports. When one instalment is settled in several transactions, 1C records only the first in `sumPayed` and leaves `status: true`. Contract `00000104482` shows it clearly — each instalment's `pays` entries sum to exactly `1 145 000`, while `sumPayed` reads `1 109.90`, `1 170.30`, `7 351.49`.

This affects **5 541 contracts across 3 084 customers** where `Σ schedule[].sumPayed < Σ pays[].sum`. The contract status field does not address it: a customer who pays on the due date can still be reminded that morning. Raised with the 1C developer separately.
