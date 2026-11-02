# BLITZ GAMING V2 — Technical Upgrade Notes

This update is deliberately conservative: it improves the initial loading strategy, production admin access rules, metadata and hosting security headers without removing storefront pages, dashboard pages, checkout options, product features, loyalty, campaigns, videos, languages or the existing Supabase integration.

## Changes made in this update

### Performance

- Storefront pages and individual admin sections are now loaded with React lazy imports. Customers do not need to download the admin analytics, CSV tools, customer-management screens and every other route before viewing the homepage.
- A small branded loading state appears while a route chunk is downloaded.
- Existing product-card images already use lazy loading and asynchronous decoding; that behavior was retained.
- Netlify and Vercel now both cache hashed `/assets/` files for one year and revalidate `index.html`, avoiding stale deployments while keeping repeat visits fast.
- No dependencies were upgraded and the product catalog, images, CSS design system and business logic were not rewritten.

### Security

- Local/demo admin authentication is available in local development only. Production builds require Supabase configuration and a Supabase session with an access token.
- A stale browser-only demo session cannot unlock the production admin dashboard.
- Administrator-configured announcement/campaign links and customer-facing courier tracking links are restricted to safe HTTP(S) destinations or valid internal app routes, preventing script-style URL schemes from being used as links.
- `VITE_ENABLE_DEMO_ADMIN` is an explicit emergency preview override; do not set it to `true` on a public or live store.
- Netlify and Vercel receive matching security headers: MIME sniffing protection, clickjacking protection, a restrictive referrer policy, a limited permissions policy, and HSTS.
- The existing Supabase schema already includes row-level security and column-level grants for customer profiles. Customers can edit their own wishlist, but cannot directly change their points, discount, blocked status, highlighted status or administrator notes. Keep the full current `supabase/schema.sql` applied.
- Server-only Supabase, Resend and Lahza secrets remain server-side. Never put a secret/service-role key in a `VITE_*` variable.

### SEO foundations

- Added a clearer bilingual store description, Open Graph and Twitter metadata, and a share image in the static HTML shell.
- Added dynamic page titles and descriptions for product and category pages, with localized Arabic/English/Hebrew fallbacks.
- Added `OnlineStore` structured data for the store and retained `Product` structured data for product detail views.
- Cart, checkout, account, wishlist, order confirmation and admin views are marked `noindex` in the running app.
- Added a basic `robots.txt` allowing the public site and disallowing API endpoints.

**SEO status after the October 31 follow-up:** clean BrowserRouter URLs (`/product/...`, `/category/...`) are now active, with Vercel/Netlify SPA rewrites, legacy `/#/...` link compatibility, route-specific canonical/Open Graph/JSON-LD URLs, a dynamic product/category/page sitemap, and a dynamic robots file that excludes private routes. Product metadata is generated in the browser after the app loads; full server-rendered product HTML and reliable no-JavaScript social previews still require a later SSR/prerender implementation. Verify the sitemap in Google Search Console after deployment; do not promise search ranking or indexing until crawlers have processed the live pages.

## Supabase: what is already prepared

The application already contains:

- Supabase customer OTP authentication and profile/wishlist sync.
- Supabase admin password authentication that checks server-controlled `app_metadata.role = admin` (or the `roles` array).
- Shared storefront state and separately protected product acquisition costs.
- Server-side order creation with server-side price, stock, coupon, delivery and loyalty validation.
- Protected order-status and delivery-tracking RPCs.
- Lahza hosted card-payment initialization and verification functions.
- Order email and customer-management functions.
- Public order-tracking rate limiting.

You do not need to rewrite these just to connect your Supabase project. Before real orders, create the project, apply the complete current `supabase/schema.sql` (and the documented V2 migration for an already-existing project), configure Auth/OTP and Storage policies, set the environment variables in the hosting provider, create the admin user and assign its role in `app_metadata`, then test the entire flow from a second device.

## Remaining launch tasks

1. Connect Supabase and apply the schema/migration as described above.
2. Configure server-only `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `SITE_URL` and (when card payments are enabled) `LAHZA_SECRET_KEY` in the hosting provider. Use test credentials first.
3. Replace all demo catalog items with real stock, prices, descriptions, specifications, images and warranty information.
4. Test customer sign-up/login, admin login, product edits from a second device, image/video uploads, checkout, stock decrement, coupon limits, loyalty, order tracking, emails and payment callbacks.
5. Run `npm ci`, `npm run build` and `npm run lint` locally with Node 24.22.2. Run `npm audit` and review the report; do not blindly run `npm audit fix --force`.
6. After choosing the final domain and migrating to clean URLs, create/submit a sitemap in Google Search Console and Bing Webmaster Tools. Add verified business details, delivery/returns/warranty/privacy pages, and unique product copy.
7. After deployment, test the live domain with PageSpeed Insights and Lighthouse on mobile. This source-only change cannot produce a trustworthy field performance score without the deployed URL and real device/network measurements.

## Safety notes

- Existing routes and BrowserRouter URLs have been preserved in this update.
- Existing checkout, product, admin and Supabase business logic has not intentionally been altered.
- The package manifest and lockfile have not been changed.
- The updated source should still be tested with the project's actual Node 24.22.2 environment before publishing. This working environment did not have the project's npm dependencies installed, so a full npm build/lint/audit could not be executed here.
