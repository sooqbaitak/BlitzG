# BLITZ GAMING V2 — October 31 follow-up upgrade

This is an incremental upgrade of the existing BLITZ GAMING V2 project. It is not a replacement storefront or a fresh database.

## What changed

### Preserved existing work
- Continued from the prior fixed archive; all existing routes, components, admin pages, product data structures, styling, images, payment endpoints, Supabase security policies and deployment providers remain in place.
- The one-time v1 browser-data migration no longer overwrites customized store contacts, announcements, delivery text or coupon edits with seed defaults.
- If the current local browser database cannot be parsed, the raw serialized snapshot is copied to a timestamped `blitz_db_v2_recovery_...` key before the app initializes its safe seed fallback. The recovery copy is not automatically discarded.
- The previous TypeScript product-name fix and cloud retry/language-safety fixes remain included.

### Clean URLs and SEO
- Changed `HashRouter` to `BrowserRouter`.
- Old links of the form `/#/product/example` and shared-cart links continue to work through a pre-render startup URL conversion.
- Updated cart sharing and new-order browser notifications to use clean paths.
- Canonical, Open Graph, Twitter and Product JSON-LD URLs now use the actual current route rather than always pointing to the homepage.
- The document language and text direction update with the selected language.
- `/sitemap.xml` is generated from active products, visible categories, visible custom pages and public storefront routes when Supabase is configured.
- `/robots.txt` is generated with the actual deployed domain and excludes private/admin routes.
- Added Vercel and Netlify rewrite rules so direct URL entry and refreshes resolve to the SPA shell.

### Deployment reliability
- Added a GitHub Actions workflow using the Node version pinned in `.nvmrc`; every push and pull request runs `npm ci`, ESLint and the production build.
- Added explicit handoff instructions for local verification, Git initialization, Vercel environment variables, backend checks, product content, payments and search-console verification.

## What deliberately was not auto-migrated

The current live app reads and writes its shared catalogue through `public.blitz_store_state.data` (JSONB). Replacing this with normalized product/category/inventory tables requires a coordinated live-data backfill, dual-write or maintenance window, and verified rollback. No such data cutover is performed in this archive. The existing Supabase tables/RLS/order/payment functions remain untouched. See `SUPABASE_SCALING_AND_DATA_PRESERVATION.md` for the safe migration sequence.

Real product photos, exact stock, price, warranty, return terms, payment merchant approval, Resend/SMTP and phone-SMS credentials cannot be invented or verified from source code; the manual guide explains where your real information and credentials belong.

## Verification limits

- 67 TypeScript/TSX files passed syntax transpilation with zero syntax diagnostics. This is a syntax check, not semantic TypeScript type-checking.
- All 22 `.mjs` files in the API, Netlify and server folders passed `node --check`.
- `package.json`, `package-lock.json`, `vercel.json` and all three TypeScript config files parsed successfully.
- Dynamic sitemap/robots smoke tests passed, including a mocked Supabase catalogue: active products and visible categories/pages are included; draft/hidden content is excluded; private routes are disallowed.
- A dependency-backed full type-check/build and browser test still need to run where `npm ci` can reach the npm registry. This environment could not resolve `registry.npmjs.org`, and npm exited with an internal exit-handler error after the partial install. The full build therefore remains unverified; do not describe this archive as build-verified yet.
- No production Supabase project, Vercel/Netlify account, merchant account or Search Console property was connected during this source update.
