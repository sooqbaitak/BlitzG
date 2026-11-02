# Blitz Gaming project review and enhancement notes

## Included updates

- Store contact details set to the supplied WhatsApp, email, Facebook and Instagram accounts.
- Initial delivery fees set to West Bank ₪20, Jerusalem ₪50 and 1948 areas ₪70; cart does not show an assumed delivery fee, and checkout shows the selected region's fee only in the calculation summary.
- Removed unsupported rank, sale, review/sales and warranty claims; sample coupons are disabled by default.
- Added Arabic, English and Hebrew UI coverage across the main storefront, account, cart/checkout and key admin pages. Product names remain unchanged; category names and selected descriptions can be translated.
- Added account sign-in with email OTP or mobile OTP (mobile requires a configured Supabase-compatible SMS provider), customer wishlist, purchase history and loyalty points/reward coupons.
- Added product image galleries supporting multiple URLs and device uploads, custom tags, editable store logo, variant/image/specification fields, and additional configurable delivery locations and fees.
- Added gaming PC component categories and a checkout choice to request assembly or receive components separately for eligible PC/build carts.
- Added a Build Your Gaming Setup interactive section, category/brand/stock management, order status management and responsive layouts.
- Expanded CSV templates/import/export for products (including image galleries, variants, specifications and custom tags), categories, brands, inventory, coupons and orders, with validation and error reporting.
- Order IDs use `BG#` plus a serial. Cloud orders use a database sequence for global uniqueness; local demo order numbers are unique only within one browser.
- Added Netlify SPA/build configuration, environment-variable example, public headers/redirects, Supabase schema and storage bucket policies, plus `DEPLOY_NETLIFY.md` with launch and second-device sync tests.
- Added a persistent admin banner that warns when the site is in local demo mode and changes are not shared between devices.
- Improved cart behavior so delivery fees and delivery-target discounts are finalized at checkout, and fixed CSV update-flow reporting and additional validation.
- Optimized oversized product imagery for faster page loading.

## Validation performed

- Parsed all 48 TypeScript/TSX files with the installed TypeScript parser after the edits: no syntax diagnostics were reported.
- A full `npm run build` could not be verified here because dependency installation could not retrieve packages from the npm registry (network/DNS error). Run `npm ci` and `npm run build` in an environment with registry access, then check Netlify deploy logs before publishing.

## Production requirements and limitations

This project supports a local-demo mode and an optional Supabase backend. In local-demo mode, admin edits, images, orders, coupons and numbering are browser-local; they do not synchronize to other devices and must not be used for real orders. A custom domain does not solve this.

For shared production behavior, create a Supabase project, run `supabase/schema.sql`, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify, create a private admin user and set server-controlled `app_metadata.role = admin`, configure email OTP and an SMS provider if mobile sign-in is needed, and redeploy. Test data editing, image uploads, order creation, coupons, loyalty rewards and order history from a second device. Never expose a service-role/secret key in frontend code.

The shipped catalog is sample data. Replace demonstration products, prices, descriptions, specifications and stock with verified inventory. Review delivery, warranty, returns, privacy and terms pages before taking orders. The cloud single-document store state is designed for a small store; concurrent admin edits may be last-write-wins, so retain CSV backups and add a more normalized catalog / conflict handling before significant multi-admin operation.
