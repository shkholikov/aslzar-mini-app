/**
 * Whether the legacy product editor is available.
 *
 * The Mini App catalogue now comes from ASLZAR ID, synced from 1C nightly, so nobody enters
 * product data by hand any more. The page and all its CRUD are kept intact behind this flag
 * rather than deleted, so the editor can come back if the shop ever needs to curate something.
 *
 * NEXT_PUBLIC_ because app/products/page.tsx is a client component. That means the value is
 * inlined at build time — turning it back on needs a redeploy, not just an env change.
 * Matches the "1" convention already used for DASHBOARD_MOCK_TRENDS in lib/dashboard.ts.
 */
export const PRODUCTS_ADMIN_ENABLED = process.env.NEXT_PUBLIC_PRODUCTS_ADMIN_ENABLED === "1";
