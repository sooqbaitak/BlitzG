# BLITZ Gaming V2 — Engineering & Business Review

**Review date:** 31 October 2026  
**Source reviewed:** the latest edited BLITZ Gaming project archive, updated in this release.  
**Review method:** source-code inspection and TypeScript/TSX transpilation. This is not a live-site Lighthouse report or a measured sales/conversion study.

## Executive assessment

BLITZ Gaming has grown beyond a simple product catalogue. It now has a broad ecommerce feature set: product/category/brand management, configurable variants, offers and grouped bundles, delivery rules, loyalty rewards, account and order workflows, PC setup building, customer management, multilingual storefront controls, and extensive store appearance settings. The latest release improves several real bottlenecks and adds a customer-facing advertising-video page.

**Overall engineering maturity: approximately 7/10 (qualitative judgment).** The feature set is strong and the architecture is serviceable for a small-to-medium catalogue, but this score is not a production certification. The full dependency install/build and live integration tests remain required before launch.

| Area | Assessment | Why |
|---|---:|---|
| Ecommerce feature coverage | 8.5/10 | Broad catalogue, cart, checkout, admin, offers, loyalty, delivery, customer, and campaign workflows |
| Code organization | 7.5/10 | React/TypeScript modules and shared context/data helpers; shared store state is still a relatively broad JSON document |
| Performance readiness | 7/10 | Search/filter work, image loading, admin saves and cloud polling improved; no live device benchmark yet |
| Security baseline | 7/10 | Supabase RLS, private cost separation and tracking rate limits; configuration and provider tests still matter |
| SEO/discoverability | 5/10 | Product metadata and Product JSON-LD are generated client-side, but BrowserRouter/client rendering limits crawlability and social previews |
| Production readiness | 6/10 | Needs a successful clean build, migration, provider setup and end-to-end order/payment tests |
| Sales/merchandising potential | 8.5/10 | Video showcase, product recommendations, comparison, bundles, PC setup builder and cart sharing help product discovery |

These scores are engineering estimates based on code, not measured metrics or promises of business results.

## Changes included in this release

### Performance and synchronization

- Admin changes still update local state immediately, but rapid edits are now coalesced into a Supabase save after a 650 ms pause. In-flight writes are serialized and the newest snapshot is sent next. This avoids posting the entire store on every typed character in an admin field.
- Store refresh is visibility-aware: customer tabs refresh on a 90-second base interval and admin tabs on a 25-second base interval. Refresh pauses when the tab is hidden, overlapping pulls are avoided, and failed requests back off up to five minutes.
- Shop search text and brand lookup maps are precomputed for each catalogue update. The main filtered product set is shared with variant-facet calculation rather than repeating the entire base filter pass.
- Header suggestions are debounced and use a precomputed search index.
- Product cards and supporting images now declare intrinsic dimensions and use lazy loading/async decoding. The main product image is given high fetch priority; secondary gallery images remain lazy.
- Product detail recommendations are ranked using shared categories, brand, tags and sales, and unavailable products are excluded.
- Variant stock is included in the Products admin stock totals. Product-specific low-stock alert thresholds can now be edited, imported/exported and surfaced in the dashboard.

**Expected impact:** fewer redundant Supabase writes, less work while a tab is in the background, smoother filtering as the catalogue grows, and reduced image-related layout shifts. These improvements still need real-device and network testing.

### Security and order tracking

- Public tracking attempts are limited by IP and normalized phone number. The database stores only SHA-256 hashes of the rate-limit keys, not raw IP or phone values.
- Current limits: up to 18 attempts per IP in a 60-second window, followed by a 10-minute block; up to 6 attempts per normalized phone in 10 minutes, followed by a 15-minute block.
- The rate-limit table has RLS enabled, public/anon/authenticated access revoked, and the RPC is executable only by `service_role`.
- Product acquisition cost and order cost snapshots remain in their protected admin-only tables rather than customer-readable order data.

**Deployment dependency:** run the current full `supabase/schema.sql` on a fresh project, or run `SUPABASE_V2_OPTIMIZATION_MIGRATION.sql` on an existing installation before deploying the updated tracker. The rate limiter deliberately fails closed: until the RPC exists, public tracking will show a temporary-unavailable response rather than silently running without rate limiting. Add the optional server-only `RATE_LIMIT_SECRET` in Vercel; if omitted, the server-only Supabase secret key is used as the hashing secret.

### Advertising video showcase

- Customer page: `/videos`. Admin page: `/admin/videos` or **Admin → Product Video Showcase**.
- Add/edit/delete videos, set titles/descriptions in English, Arabic and Hebrew, optional poster image, featured flag and sort order.
- Upload MP4, WebM or MOV from the device to the Supabase `store-videos` bucket, up to 100 MB, or paste a direct public HTTPS video-file URL (not a YouTube/Vimeo watch-page URL; the page uses the browser-native player).
- Search the product, category and brand lists and attach multiple matches to each video. The customer page then shows the related product/category/brand links and product cards.
- A separate admin toggle hides/shows the customer page and its navigation links without deleting saved videos. The page uses native controls, `playsInline`, and `preload="none"`; it does not autoplay clips.
- Deleting an uploaded-video entry also attempts to delete its corresponding object from this project's video bucket. External video URLs are never deleted.

**Privacy/visibility clarification:** the Supabase video bucket is public-read so customer browsers can play the clips without signing in. Hiding the page hides the page/links in the storefront; it does not revoke a direct public video URL that someone already has. Use only material intended for public display. The bucket's upload/delete policies require a Supabase administrator role.

### Sales and administration improvements

- Product detail pages now show more relevant related products based on category, brand, tags and sales.
- Admin dashboard gross product profit now uses recorded unit-cost snapshots and discloses what percentage of sold quantities have cost data. This is an estimate of gross product profit, not net profit.
- Product-specific low-stock thresholds can be maintained in the product editor and CSV workflow.
- Share Cart creates a URL containing only product IDs, variant IDs and quantities. It does not encode personal data, customer information or prices. The recipient sees current catalogue prices and stock; unavailable products are skipped and requested quantities are clamped to current availability.
- Product title/description, Open Graph/Twitter metadata and Product JSON-LD are updated client-side for product pages.

## Technical and business impact assessment

### What is now stronger

1. **Admin editing should create fewer database writes.** Text entry no longer triggers an immediate whole-store write for every character; multiple changes within the debounce interval become one saved snapshot.
2. **Mobile product browsing is better prepared.** Intrinsic image dimensions and lazy loading reduce avoidable work; the main product image remains prioritized. Search suggestions and filtering perform less redundant work.
3. **Order tracking has an additional anti-guessing barrier.** Sequential `BG#` order numbers are no longer protected only by the phone comparison; rate limiting slows repeated guessing attempts.
4. **Products have better merchandising pathways.** Related products, cart sharing, existing comparisons/bundles, and the video page give visitors more ways to discover products and share purchase ideas.
5. **Inventory visibility is more actionable.** Variant stock contributes to displayed totals and low-stock limits can be customized per product.

### What still limits efficiency or growth

- The shared catalogue/settings snapshot is still stored as one broad `blitz_store_state` JSON document. This is practical for the current store size, but eventually product/inventory/order data should be normalized into dedicated tables with indexed server-side queries and paginated reads.
- Customer tabs still use periodic polling rather than Supabase Realtime. Public updates can take up to roughly 90 seconds to appear without a manual refresh; admin updates are polled more frequently.
- Product filtering is performed against the browser's loaded catalogue. The current shop page displays 12 items per page, but it still filters the full loaded list client-side. Very large catalogues will need server-side pagination/search.
- Images have improved loading behavior, but there is no automatic image CDN transformation, `srcset`/responsive-size generation or AVIF/WebP pipeline. Upload appropriately sized compressed assets.
- Product video files are stored in a public bucket, not a private streaming/transcoding service. Large files can be expensive for mobile data and storage; use short compressed H.264 MP4/WebM clips and poster images.
- Gross profit excludes operating expenses, payment processing fees, delivery-company charges, return costs and overhead. It must not be treated as net profit.
- Dynamic SEO metadata runs in the browser. The site still uses BrowserRouter, so product URLs contain a `#` fragment and crawlers/social preview bots may not reliably see per-product metadata. For consistently indexable product pages and rich social previews, a future BrowserRouter plus server-side rendering or static pre-rendering migration is recommended. This release intentionally preserves current BrowserRouter routes to avoid breaking existing links and deployments.

## Features still requiring external setup

- Shared products/orders/settings require the same Supabase project and correct Vercel environment variables on all devices. Local demo mode is browser-local only.
- Admin file uploads require a Supabase authenticated administrator with server-controlled `app_metadata.role = admin` and current Storage policies.
- The device video upload requires the public `store-videos` bucket migration. If Supabase is not configured, admins can only paste a public HTTPS video URL; a local browser cannot make a video upload shared across customers.
- Email OTP requires SMTP; phone OTP requires a working SMS provider that delivers to your target Palestinian destinations.
- Card checkout depends on merchant approval and Lahza credentials/webhook testing. Cash on Delivery remains the default. Bank transfer is manual. Other payment display toggles are not substitutes for provider integrations.
- Live courier status requires the delivery company API; manually entered tracking links/details are not live synchronization.

## Previously requested items not completed

- **Customer order editing before shipment remains not implemented.** It needs an authenticated server-side transaction that verifies order ownership/phone and status, recalculates authoritative prices/discounts/loyalty, and updates stock atomically. A client-only editor would be unsafe.
- Verified-buyer product reviews and photo reviews are not implemented.
- Automated abandoned-cart emails/SMS are not implemented. They require consent/opt-out handling, a scheduled server job and email/SMS provider configuration.
- Full PC component compatibility checks (CPU socket, motherboard chipset/form factor, RAM generation, PSU capacity/connectors, case/GPU clearance) are not implemented; the existing Build Your Setup flow remains a selection/build workflow, not a compatibility-certified configurator.
- Net-profit accounting, supplier purchase orders, warranty/returns workflows and automated delivery-provider integrations remain future work.

## Validation status for this delivery

- TypeScript/TSX syntax transpilation: **66 source files checked; zero syntax diagnostics.** This catches syntax/parser issues but is not a full TypeScript type-check.
- Node syntax checks passed for the public tracking handler, its Vercel API wrapper and the Vercel adapter.
- A complete `npm ci` could not finish in this environment (dependency installation timed out). A direct `npm run build` attempt then stopped at `tsc -b` because the incomplete install lacked the `node` and `vite/client` type definitions. ESLint, browser tests and live Supabase/Vercel integration tests were **not verified** here. Do not deploy until the connected Vercel build finishes successfully.
- No live Lighthouse/PageSpeed scores, actual LCP/INP/CLS, server latency, conversion rate or revenue lift were measured. The scorecard above is a code-review judgment only.

## Recommended go-live sequence

1. Apply the current Supabase full schema/migration; configure `RATE_LIMIT_SECRET` and verify the tracking endpoint.
2. Ensure the Supabase owner/admin account can update `blitz_store_state`, upload/delete product images and upload/delete store videos.
3. Push the project and let Vercel run a clean `npm ci` and `npm run build`. Resolve all type/build failures before opening the store.
4. Test guest checkout, registered checkout, a custom delivery area, free-delivery threshold, single and grouped offer, loyalty reward, cart share, tracking with correct/wrong phone, rate limiting, and new video upload/show/hide on a second device.
5. Test the live site on a real mid-range Android phone and a slower mobile connection with PageSpeed Insights/Lighthouse; record the baseline before making further visual changes.
6. Replace demo catalogue data and verify stock/prices/images, then test each configured payment and notification provider end to end.
