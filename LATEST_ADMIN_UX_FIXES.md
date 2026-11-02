# BLITZ GAMING — Admin UI, customer history, themes and campaign fixes

## Changes in this revision

- **Admin layout:** changed the admin content flex sizing so the Overview page fills the available viewport instead of using a zero-width element. The mobile navigation overlay now covers the viewport and anchors the drawer to the selected language's screen edge. Route changes return the view to the top/left.
- **Independent admin theme:** the Admin Day/Night selector now controls a palette scoped to `.admin-shell`, independent of the customer-facing theme. Night colors are retained. Day mode has light panels, readable text, inputs, placeholders and borders.
- **Customer Day contrast:** light-theme text, forms and placeholder colors are scoped to the storefront, with stronger contrast for form controls and high-contrast filled buttons.
- **Settings search:** the existing quick search at the top of the admin area remains available and can search admin pages and registered setting destinations by name/keyword.
- **Customer purchase details:** expanding a registered customer displays contact/account details, matched order history, item/variant names and quantities, checkout address/notes, shipping/courier details, totals, discounts, coupons and recorded points earned/redeemed. Matching prefers account ID, then email, then the last eight phone digits for guest orders. Historical point redemptions are only shown when stored on the order.
- **Offers:** retain named offer collections with multiple products, original/offer prices, a custom text tag, date range, active toggle and selection from Seasonal Campaigns. Note that an expired group is hidden from the Offers page; product sale prices remain set until they are edited in Offers Manager. Do not rely on the offer end date to automatically change pricing across every checkout route.
- **Localized variants:** variant labels, option names/values and facet labels can be entered per language and reusable variant presets remain available in the product editor. Category/Shop filter memoization now follows the selected language.
- **Test notification:** the test button now requests permission if the browser permission is still undecided, checks for secure context (HTTPS or localhost), sends a notification only when granted, updates the displayed permission status, and reports blocked/unsupported cases via toast.
- **Seasonal banners & surprises:** includes the existing text translations, page targeting, start/end dates, image, font family/size, colors and offer link, plus two new animations (Bounce in and Soft glow), a configurable floating position (start/end × top/bottom), width preset, corner radius, animation duration, and matching preview fields.

## Supabase / Vercel migration

No new SQL migration is required for these UI changes. Campaign position, width, corner radius and animation values are additional optional fields in the shared Store Settings JSON. Customer purchase history reads the orders already synchronized into the admin state. Continue using the current Supabase schema and existing Vercel environment variables.

## Manual verification checklist

1. Open `/admin` on a phone-sized viewport. Confirm Overview is full width with no page-level sideways scroll; open the hamburger menu and confirm it attaches to the left in English and right in Arabic/Hebrew.
2. Toggle the Admin theme Day → Night → Day. Confirm it changes every dashboard page and does not change the saved customer theme; confirm the Night palette looks unchanged.
3. Use the admin search to open Payments, Browser Notifications, Seasonal Campaigns and Variants.
4. Open a registered customer and expand Manage. Confirm account details and matched purchase history display; confirm recorded points fields show `—` for older orders that never stored those values.
5. Add an offer with multiple products and a text tag. Link it from a seasonal campaign and click it on the storefront.
6. Add English, Arabic and Hebrew variant labels and attributes, save a template, then use it on another product. Check category and shop filters in each language.
7. On HTTPS, click Request Browser Permission, allow it, then click Send Test Notification. If permission was previously denied, unblock notifications in browser site settings.
8. Create a test seasonal campaign with each placement, Bounce/Glow, a width preset and custom radius; confirm the campaign stays dismissible and within the viewport.

## Build status

TypeScript/TSX syntax transpilation passed for 64 source files and the Vercel/Node configuration JSON parsed successfully. A full production build was not verified: npm dependency installation timed out, and the available global `tsc` lacks the project's `vite/client` and Node type definitions. Have Vercel run a clean install/build before deploying this revision to production.
