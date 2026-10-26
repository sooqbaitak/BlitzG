# Blitz Gaming — Customer Management Update

This revision adds the Admin → Customers management interface and the corresponding Netlify/Supabase server support.

## Admin capabilities

- List registered Supabase accounts with email/phone, verification state, join date, last order, order count and lifetime order value.
- Search by display name, email, phone or account ID.
- Highlight/unhighlight customers; highlighted accounts float to the top.
- Add or remove loyalty points or set an exact point balance.
- Set a personal order discount (0–100%). The web checkout shows the estimated discount and the `blitz_create_order` SQL function rechecks/applies it server-side.
- Block/unblock accounts through Supabase Auth and persist the block on the customer profile. The order-creation SQL function also rejects orders from blocked profiles.
- Save an internal admin note and a message that appears in the customer's account page.
- Send a customer email through Resend and also save it in their account page.
- View saved wishlist product names, account verification status and aggregate order stats.
- Delete an account after confirmation. Auth/profile account data is deleted; order records remain for bookkeeping with their user link detached according to the database's `ON DELETE SET NULL` rule.

## Required setup

1. Use the current `supabase/schema.sql` (the root `Blitz_Gaming_Supabase_Schema.sql` copy is identical). Run the full file in Supabase SQL Editor; it is designed to be reapplied and includes the new customer profile columns plus updated order-creation logic.
2. Ensure Netlify has server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`). Do not put the secret key in a `VITE_` environment variable.
3. To send emails from the customer panel, configure `RESEND_API_KEY` and `ORDER_EMAIL_FROM` in Netlify. The sender address/domain must be verified with Resend.
4. Deploy the whole project so `netlify/functions/admin-customers.mjs` is deployed with the site.

## Notes

- The customer management panel only manages registered Supabase Auth accounts when cloud mode is configured. In local demo mode, it shows read-only contacts derived from local orders and cannot change real accounts.
- Personal discounts apply to the eligible product subtotal after any product coupon discount, and do not discount delivery fees. Product cost values remain private and are not exposed by the customer API.
- Before production use, test with a disposable customer account: highlight, award points, set a discount, send/save a message, block/unblock and delete. Verify that a blocked account cannot place an order and that the personal discount matches between checkout preview and the saved order.

## Verification performed for this update

- TypeScript/TSX syntax transpilation: 56 files checked, zero syntax errors.
- Netlify `.mjs` functions: Node syntax checks passed.
- Mocked customer-list test: account, wishlist, points, order count and order value were returned as expected.
- `package.json` JSON parsing and ZIP integrity checks passed.
- A full `tsc`/Vite build could not be run in this environment because project dependencies/type packages are not installed and the npm registry is unavailable. Netlify must complete `npm run build` before production use.
