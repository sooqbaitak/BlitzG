# BLITZ GAMING storefront

A React + TypeScript + Vite gaming store with Arabic RTL, English and Hebrew; searchable product categories; a swipeable Build Your Setup feature; account OTP; wishlist/order history; loyalty points and reward coupons; editable delivery locations; a product/admin dashboard; multiple product images; and CSV import/export.

## Run locally

Requires Node.js 20+ and npm.

```bash
npm ci
npm run dev
```

Create a production build with:

```bash
npm run build
npm run preview
```

The static output is written to `dist/`. Vercel uses the included `vercel.json` and `api/` functions; Netlify compatibility remains in `netlify.toml`. Follow [`SUPABASE_VERCEL_SETUP_GUIDE.md`](SUPABASE_VERCEL_SETUP_GUIDE.md) for the recommended Vercel + Supabase setup, or [`DEPLOY_NETLIFY.md`](DEPLOY_NETLIFY.md) for Netlify-specific details.

## Shared data across devices — important

The project can run in local demo mode or with a shared Supabase backend. Use the included `SUPABASE_VERCEL_SETUP_GUIDE.md` for setup through the Supabase, Vercel and GitHub dashboards. In local mode, products, settings, coupons and orders are stored in the current browser only. That is why dashboard edits would appear on only the device where they were made; a domain does not solve that problem. To share edits, orders, logo/images, stock, delivery settings and loyalty data between all devices, create a Supabase project, run `supabase/schema.sql`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel (the older `VITE_SUPABASE_ANON_KEY` is also supported), redeploy, and sign in with a Supabase user whose server-controlled app metadata role is `admin`. The dashboard shows a warning while local demo mode is active.

Never put a Supabase secret/service-role key in the frontend or any `VITE_*` variable. Customer phone OTP also requires configuring an SMS provider in Supabase. Email OTP depends on the email provider/template settings.

## Admin access

Open `/#/admin/login`. In demo mode the original seeded local admin can be used for preview only, but local browser authentication is not secure. In cloud mode, use the admin email/password you create in Supabase and explicitly assign the server-controlled `app_metadata.role = admin` as shown in `SUPABASE_VERCEL_SETUP_GUIDE.md`. Do not use demo credentials in production.

## Included functionality

- Product, category, brand, custom tag, image/gallery, inventory, variant, homepage and store settings management; registered-customer administration for points, personal discounts, highlighted accounts, account messages, blocking/unblocking and deletion.
- Product/delivery coupons and loyalty reward coupons with point costs and server-side validation in cloud mode.
- West Bank, Jerusalem, 1948 areas and extra configurable delivery areas.
- Checkout with PC assembly-vs-parts preference for qualifying PC build/component carts.
- Account wishlist, purchase history and loyalty points; order confirmation shows the `BG#` order number and points earned.
- CSV templates/import/export for products, variants, images, tags, categories, brands, inventory, coupons and orders. Review validation reports and keep backups before bulk imports.

## Before accepting real orders

The catalog contains sample/demo products and must be replaced with accurate inventory, images, specifications, prices and stock. Configure and test Supabase using the guide, verify a successful Vercel build, test sync from a second device, check coupon/loyalty behavior, and publish current delivery/returns/privacy/warranty policies. Without the shared backend, order numbers only increment per browser and data can be lost or conflict.

## Store details

- Store: BLITZ GAMING / بلتز قيمنق
- WhatsApp: +970595210647
- Email: sooqbaitak@gmail.com
- Facebook: https://www.facebook.com/profile.php?id=61591200376695
- Instagram: https://www.instagram.com/blitzyard/
- Default delivery fees: West Bank ₪20, Jerusalem ₪50, 1948 areas ₪70


Order email notifications and customer-management emails use serverless API functions plus Resend. See `SUPABASE_VERCEL_SETUP_GUIDE.md` for Vercel environment variables and setup. Admin profile editing, product duplication, nested categories, and custom social links are managed from the dashboard. Customer account management requires the current `supabase/schema.sql` and a redeployment; local demo mode only shows customer contacts inferred from local orders and cannot change authentication accounts.

## Latest admin improvements

- Admin profile page can update the current administrator's name and password (Supabase Auth in cloud mode; browser-only demo credentials in local mode).
- Product rows include a safe duplicate action that creates a draft with a fresh SKU/slug and zero stock.
- Categories can be nested into subcategories; child-category links appear above parent-category product results, and parent category pages include matching descendant products.
- Store Settings supports an editable list of social/contact links and customizable new-order email recipient, subject and message template.
- New-order emails are sent by the server-side API function only when a cloud order exists and Resend/server environment variables are configured. The same handlers are wrapped for Vercel and Netlify.

Recent admin additions: Build Your Setup category ordering and multilingual top notice are under Admin → Build Your Setup. Sales Analytics supports date, category, product, and brand filters plus revenue trends and estimated gross profit. Product Manager supports optional per-unit loyalty points and acquisition cost (سعر التكلفة).

Important database note: execute the complete current `supabase/schema.sql` in Supabase SQL Editor after updating this project. It creates admin-only product-cost and order-cost snapshot tables, keeps costs out of customer-readable order payloads, and includes a protected RPC for syncing order-status changes. Do not use an older schema.

## Checkout payment choices and public order tracking

The checkout defaults to **Cash on Delivery only**. Visa/Mastercard/American Express are wired to a server-side Lahza hosted-checkout integration, but require an approved merchant account, server-only credentials, and end-to-end testing before live acceptance. Bank Transfer is a manual transfer-and-admin-confirmation flow. PayPal, Apple Pay and Google Pay have display toggles only and are not operational until their separate provider integrations are implemented. The store never stores raw card details or treats a redirect as proof of payment. Customer email/phone OTP is implemented through Supabase Auth, but public email delivery requires custom SMTP and phone delivery requires an SMS provider.

Customers can open **Track My Order** from the homepage/header or visit `/#/track-order`. They enter their `BG#...` order code and the phone number used at checkout; no account is required. The server-side API function checks the shared Supabase order and returns a privacy-filtered status, item summary and any courier details configured by the admin. Configure `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) in Vercel. Admins can record carrier/courier details and an external tracking URL on each order. Automatic live tracking from a delivery provider requires that provider's API/integration; entering a URL opens the provider's tracking page.
