# ASLZAR ID catalogue

## Why

`miniapp.products` held **24 documents, last edited 1 April 2026**. Their descriptions were hand-typed 1C data:

```
#uzuk
Proba: 585
Razmer: 19,5
Gr: 1,72
ID: сок019614
```

Fineness, size, weight and the 1C item id, transcribed into a free-text box. No stock levels, and 23 of the 24 had no price.

ASLZAR ID (`https://api.aslzarid.uz`) serves the same data properly: ~4,700 products synced from 1C nightly at 02:00 Tashkent, typed and validated, with per-piece stock, photos and prices.

## Shape of the data — the part that shapes the UI

A **product is a design**. Each entry in `variants[]` is **one physical piece** — a specific ring in a specific display case, with its own weight, size and price.

There is **no quantity field**. `variantCount` _is_ the stock, and `inStock` is `variantCount > 0`. Two pieces of one design weigh differently and therefore cost differently, so the UI never shows "the price": it shows the cheapest with `dan`, or the exact figure when there is only one piece.

Other traps:

|                       |                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `productId`           | 1C's id (`00-0000067`). Stable across syncs — key on this, never `id`, which is a row id that changes on rebuild |
| `article`             | the variant key (`1.6.1.0.024.2`), likewise 1C's                                                                 |
| `name.ru` / `name.uz` | either can be null. Only ~20% has an Uzbek name, ~78% is Russian-only                                            |
| `model`               | a code (`1.0.024.2`), never a name                                                                               |
| `color`               | Cyrillic Uzbek: `Сарик` yellow, `Кизил` rose, `Ок` white                                                         |
| `stone`               | 1C's spelling. **`Тошсиз` means "no stone"** — a value, not a blank                                              |
| `fineness`, `color`   | strict enums upstream; anything else is a 400                                                                    |
| booleans              | passed as the **strings** `"true"` / `"false"`                                                                   |
| sold out              | keeps its row and URL — a saved link never 404s, it just reports no pieces                                       |

## Naming in an Uzbek-only app

The documented fallback is `uz ?? ru ?? model`. Applied literally that fills an Uzbek interface with Russian names and bare model codes.

`lib/catalog.ts` falls back to the **category** instead: `name.uz ?? category.name.uz ?? name.ru ?? model`. A nameless ring reads "Uzuk" rather than "Золотое кольцо с фианитами". Less specific, but the app stays in one language and never shows a code — the photo and price carry the difference.

`latinColor()` / `latinStone()` map the Cyrillic values for display. **Filters must send the original value** or the upstream enum rejects them.

## How it reaches the app

```
webapp ──► apps/api /v1/catalog* ──► api.aslzarid.uz
           (holds the key, caches)
```

The key is **server-side only**. A Mini App is a browser bundle, so a key shipped to it is public — and the upstream limit of 60 req/min is _per key, shared across every user at once_, which is the second reason the proxy caches rather than passing traffic straight through.

| Route                               | Upstream                                 |
| ----------------------------------- | ---------------------------------------- |
| `GET /v1/catalog`                   | `/v1/products`                           |
| `GET /v1/catalog/categories`        | `/v1/categories`                         |
| `GET /v1/catalog/:productId`        | `/v1/products/{productId}`               |
| `POST /v1/catalog/:productId/share` | — (Telegram `savePreparedInlineMessage`) |

Registered in `src/index.ts` behind `requireMiniAppAuth`, and deliberately **absent from `src/openapi.ts`** — internal routes stay out of the partner spec.

Two implementation notes worth keeping:

- **`/v1/catalog/categories` must be registered before `/v1/catalog/:productId`**, or Express reads "categories" as a product id.
- **`ASLZAR_ID_BASE_URL` has no trailing slash**, unlike `ASLZAR_1C_BASE_URL`, so paths in `integrations/aslzarid.ts` carry a leading one. Opposite conventions in the same codebase.

The proxy caches on the _sorted_ query string, so the same filters in a different order share one entry, and dedupes concurrent misses so a burst on a cold cache makes one upstream call.

## Sharing a product

Two routes out of the product page, both version-gated and both hidden rather than disabled when the client is too old:

- **"Ulashish"** → `POST /v1/catalog/:productId/share`. The Mini App cannot compose a rich message itself: `WebApp.shareMessage(id)` (Bot API 8.0) can only send something the **bot** has already stored. So the API mints a photo card — name, fineness, price from — with an inline button `?startapp=<productId>` back into the bot, via Telegram's `savePreparedInlineMessage`. Nothing is sent server-side; the customer still picks the recipient and can cancel. Prepared ids are short-lived, so one is minted per tap rather than cached.
- **"Storyga"** → `shareToStory` (Bot API 7.8) with the large photo. The caption carries `botNickname()` because a story has no tappable link on most clients — the handle is the only thing telling a viewer where the piece came from.

Both need `product.images.length > 0`; a story needs media and a photo card is what makes the share worth sending.

`?startapp=` is picked up by `DeepLinkHandler` and routed to the product page. It **requires a Main Mini App configured in BotFather** — without one the link opens a chat with the bot instead, which is a soft failure rather than a broken link.

## Configuration

```
apps/api/.env.*.local        ASLZAR_ID_API_KEY=azk_...
Railway → API → Variables    ASLZAR_ID_API_KEY
```

`ASLZAR_ID_BASE_URL` defaults to production and needs no override — the catalogue is read-only, so dev and prod both point at it. `ASLZAR_ID_CACHE_TTL_SECONDS` defaults to 3600.

Without the key the API still boots; `/v1/catalog` answers **503** and logs a warning at startup.

## The legacy catalogue

`products` in MongoDB and `GET /v1/products` are untouched and dormant. The admin editor is gated on `NEXT_PUBLIC_PRODUCTS_ADMIN_ENABLED` (`lib/products-admin.ts`) and shows a notice when off; all its CRUD and the R2 upload path remain.

Because it is `NEXT_PUBLIC_`, the value is inlined at build time — **switching the editor back on needs a redeploy**, not just an env change.

## Not done yet

The product page's **"Bu buyum haqida so'rash"** button is visible but sends nothing. `buildAskMetadata()` in `lib/catalog.ts` assembles the exact payload agreed with Besales — `productId` and `article` plus what the customer actually saw on screen — and `onAskAboutProduct()` stops there.

Sending it is one `apiRequest` to `apps/api`, which forwards it as a `BesalesInbound` with that object in `metadata`. Besales is still in testing, and their integration lives on the `dev` branch.

**One consequence while this is inert:** `/v1/product-interest` had exactly one caller, the old product card's "Sotib olish" button. With the new card there is no AmoCRM lead created from the catalogue until the handoff ships.
