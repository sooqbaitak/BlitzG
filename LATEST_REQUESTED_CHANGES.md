# BLITZ Gaming — Latest Requested Changes

This note describes changes made on top of the uploaded `Blitz_Gaming_Admin_UX_Update (1).zip` source. The existing storefront/admin design was kept as the base.

## Included in this update

- **Delivery areas:** older custom-area entries that do not yet have an `active` field now default to active instead of silently disappearing. Checkout de-duplicates area IDs, excludes collisions with the three built-in areas, and uses each area's configured fee. Custom area labels are normalized on save.
- **Free delivery thresholds:** optional thresholds can be configured independently for West Bank, Jerusalem, 1948 areas, and each custom area. Checkout applies the threshold and displays either the amount still needed or a free-delivery message. The Supabase order RPC rechecks the threshold before storing the order.
- **Offer types:** offers have an explicit single-product or grouped-bundle type. A bundle requires every selected product and uses one combined price; removing any required item removes its bundle discount. Cart, checkout and the offers page show the offer name, member products, bundle amount and savings. Product sale-price baselines are retained/restored when offers are changed or removed.
- **Loyalty redemption:** admins can define point thresholds for a fixed ILS discount or free delivery. Signed-in customers who have enough points can select a reward at checkout. The cloud order RPC validates the reward and point balance server-side; applying points and a loyalty coupon together is rejected.
- **Campaign presentation:** supports top banner, floating message, side banner, oblique-corner banner and popup/modal; controls were added for width, height, full-surface click-through and corner radius. The dismiss control is more prominent.
- **Store identity and languages:** supports a Hebrew store name, localized subtitles, per-word store-name colors and customer-facing language visibility (English, Arabic and Hebrew). The UI prevents turning off all customer languages at once.
- **Admin usability:** store owners can reorder the admin sidebar with up/down arrows. The existing admin settings search and direct-to-setting navigation remain available.
- **Product support link:** the product page's WhatsApp contact label now displays the configured WhatsApp number as well as linking to that number.

## Required deployment steps

1. Apply the **complete current** `supabase/schema.sql` in the Supabase SQL Editor. The same SQL is mirrored in the root file `Blitz_Gaming_Supabase_Schema.sql`. This replaces the order-creation RPC with server-side validation for grouped offers, delivery thresholds, and point redemption.
2. Commit/push the project files to the GitHub repository connected to Vercel, then redeploy. Do not put the Supabase service-role/secret key in a `VITE_*` browser variable.
3. Test with a non-production order on a second device: add a custom delivery area, configure a threshold, test both sides of that threshold, try a group offer with all products, remove one member, and redeem a loyalty reward while signed in.
4. Verify Supabase Auth, administrator permissions, Vercel server-only environment variables, email/SMS providers, and payment providers using `SUPABASE_VERCEL_SETUP_GUIDE.md` before taking live orders.

## Important validation note

A full dependency install/build could not be completed in this environment: `npm ci` timed out during dependency installation, and a full `tsc` build cannot run without the Vite/Node type packages. I did run TypeScript/TSX transpilation over all 66 source files after the edits; it reported **zero syntax diagnostics**. A direct `npm run build` attempt also stopped at `tsc -b` because the incomplete install lacks the `node` and `vite/client` type definitions. This is not a substitute for a clean `npm ci && npm run build` on the Vercel build environment.

## Not completed in this update

Direct customer editing of an already-placed order (item/quantity changes) before shipment is **not implemented here**. It needs a dedicated authenticated server transaction that locks the order, checks status and ownership/phone, revalidates stock/prices/discounts, and adjusts inventory/loyalty balances atomically. I have not added a client-only editor that could display a changed total without safely updating the actual order. Public order tracking remains available through the existing Track My Order flow.


## V2 performance, security, SEO, and sales improvements

- **Admin cloud-save efficiency:** edits still save immediately to local state, but rapid admin field changes are coalesced into a latest-snapshot Supabase save after a 650 ms pause. Outstanding writes are serialized; this avoids sending an entire store snapshot for every typed character and prevents overlapping state saves from overtaking one another.
- **Storefront synchronization:** public store refresh is less frequent (90 seconds), admin refresh is 25 seconds, refreshes pause while the tab is hidden, overlapping refreshes are prevented, and failures back off up to five minutes.
- **Catalog/search efficiency:** shop filtering uses a shared filtered product set for product results and variant facets, with a precomputed search index and brand map. Header suggestions are debounced and use a precomputed index.
- **Images:** product-card images have intrinsic dimensions and async decoding/lazy loading; the primary product image is high-priority while gallery/supporting images remain lazy. Product images should still be uploaded at suitable sizes and compressed; automatic responsive image transformation/CDN variants are not included.
- **Product discovery:** product-detail related items are ranked by shared categories, brand, tags and sales, and out-of-stock candidates are excluded.
- **Inventory/profit visibility:** per-product low-stock thresholds can be set in the product editor; admin inventory totals include variant stock. Dashboard gross product profit displays the share of sold quantities with cost snapshots.
- **Cart sharing:** the Cart page can generate a share link containing only product IDs, variant IDs and quantities. The recipient's current prices and stock are used; unavailable products are omitted and requested quantities are clamped to current availability.
- **Tracking protection:** public tracking requests are limited by IP and normalized phone using one-way hashed keys in a protected Supabase table. The RPC is service-role only. Apply the V2 SQL migration before deploying the protected tracker; otherwise the endpoint fails closed and tracking returns temporarily unavailable.
- **Metadata:** client-side product titles/descriptions, Open Graph/Twitter metadata and Product JSON-LD are updated per product route. Because the app still uses BrowserRouter and client rendering, this is not equivalent to server rendering or pre-rendering; social crawlers may not see per-product metadata. A future SSR/prerender migration is needed for consistently rich search/social previews.

## New product advertising video page

- Admin route: **Admin → Product Video Showcase** (`/admin/videos`). Create, edit, publish, feature, sort and delete product-ad videos; set English/Arabic/Hebrew text and an optional poster image.
- Upload MP4, WebM or MOV from the device to the Supabase `store-videos` bucket (maximum 100 MB), or paste a public direct HTTPS video-file URL (not a YouTube/Vimeo watch-page URL; the customer page uses the browser’s native video player).
- Search the complete product/category/brand lists and select multiple related items for each video. Customers can follow linked product, category and brand links from the video page.
- A separate **Show the video page to customers** switch hides/shows `/videos` and its storefront navigation links without deleting the saved videos. Published videos use native player controls and `preload="none"` (no autoplay).
- The uploaded bucket is public-read so customers can play videos without signing in. Hiding the page removes the page/navigation but does not revoke a direct public video URL. Deleting an entry also attempts to remove its object from this project's video bucket; externally hosted URLs are not deleted.

## Deployment additions

- Apply the current full `supabase/schema.sql` on a fresh setup. On an existing deployment, run `SUPABASE_V2_OPTIMIZATION_MIGRATION.sql` in Supabase SQL Editor before deploying the updated tracker/video feature. The migration is idempotent and also appears in the full schema.
- Add optional server-only `RATE_LIMIT_SECRET` in Vercel (a long random value, at least 32 characters). If omitted, the tracker uses the server-only Supabase secret key to hash rate-limit identifiers. Never expose this variable through a `VITE_` prefix.
- Device upload requires cloud mode and an authenticated Supabase administrator with `app_metadata.role = admin`. In local demo mode, use a public direct HTTPS video URL; uploaded device files are not persisted to a shared backend.

## Current validation status

- TypeScript/TSX transpilation is run separately from a full type-check/build. A successful transpile confirms syntax, not dependency resolution or React/type correctness.
- The full `npm ci && npm run build` must still run in the connected GitHub/Vercel build environment before live deployment if package installation remains unavailable in this working environment.
- Customer self-service editing of an existing order before shipment remains **not implemented**. It requires a server-side transaction with ownership/status verification and atomic stock, price, discount and loyalty recalculation.
