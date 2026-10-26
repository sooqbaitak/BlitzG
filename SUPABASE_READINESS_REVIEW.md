# Blitz Gaming — Supabase readiness review

## Current status

The source project is prepared to connect to a Supabase project. It is not connected yet because the owner must create/use a Supabase project, run its schema in that project's SQL Editor, and set that project's values in Netlify. No secret/API credentials are included in this archive.

Use `SUPABASE_SETUP_NO_TERMINAL.md` for dashboard-only setup steps.

## Additional fixes made before handoff

- Supports current `VITE_SUPABASE_PUBLISHABLE_KEY` / `sb_publishable_...` keys and retains the older `VITE_SUPABASE_ANON_KEY` setting for existing installs. Non-JWT publishable keys are sent only in the API-key header, not misused as Bearer JWTs.
- The order email Netlify Function supports server-only `SUPABASE_SECRET_KEY` and legacy `SUPABASE_SERVICE_ROLE_KEY` as a fallback.
- Private acquisition cost snapshots now live in the admin-only `blitz_order_item_costs` table. Customer-readable order payloads exclude `unitCost`; the SQL migration backfills older saved cost snapshots and strips the field from existing order payloads.
- Category coupon eligibility is recalculated from the server's product/category data and parent-category tree, not from customer-submitted category IDs.
- Admin order status changes use the protected `blitz_admin_update_order` RPC so changes persist in Supabase rather than only in the browser. The function checks server-controlled admin metadata.
- The schema explicitly grants the Netlify server role access to the email-notification ledger and includes idempotent column upgrades for the order points fields, making it safer to rerun on an existing project.
- Custom delivery area IDs no longer break the admin order list.
- Netlify's Node build version is set to Node 22, appropriate for the included Vite 7 toolchain.

## Checks completed

- 56 TypeScript/TSX files passed TypeScript syntax transpilation with zero syntax diagnostics.
- All Netlify `.mjs` functions passed `node --check`.
- Mocked Lahza checkout initialization verified 25 ILS converts to 2,500 agorot and uses ILS/callback URL.
- Lahza webhook HMAC mock accepted a valid signature and rejected a wrong-secret signature.
- `package.json` parsed as valid JSON.
- Product CSV template has 23 columns and one sample data row.
- The SQL contains row-level security enabled on seven app tables. Policy and function behavior still needs to be verified against a real Supabase project after installation.

## Build limitation

A full production build could not be verified in this environment. `npm ci` timed out while accessing the npm registry. `npm run build` therefore failed at type configuration because partial dependencies lacked the Node/Vite type definition files; this is a dependency-installation problem, not evidence that the source build passes. Netlify must complete `npm ci`/`npm run build` from the lockfile before production launch. If it fails, use the full Netlify deploy log to diagnose it.

## Before taking live orders

1. Run the complete current `supabase/schema.sql` in the intended Supabase project's SQL Editor. If updating an existing installation, use this complete current file rather than an older copy.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify environment variables and redeploy.
3. Create an admin in Supabase Auth and set server-controlled `app_metadata.role = admin` using the SQL in the setup guide.
4. Configure email/SMS OTP providers; public email OTP needs custom SMTP and phone sign-in needs an SMS provider.
5. For cards, secure approval for the Lahza merchant gateway and settlement account, set `LAHZA_SECRET_KEY` and `SITE_URL` server-side, and complete test transactions before going live. Bank transfer remains a manual method that an admin must confirm after receipt. PayPal/Apple Pay/Google Pay are not yet operational.
6. If order emails are desired, set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`), `RESEND_API_KEY`, and `ORDER_EMAIL_FROM` as Netlify server-only variables.
7. Verify a successful production build and test a product edit, second-device sync, product-image upload, order placement, status update, customer history, coupon, loyalty points, and profit analytics.

Do not commit any real project keys to source control. Supabase secret keys must never have a `VITE_` prefix or be sent to the browser.
