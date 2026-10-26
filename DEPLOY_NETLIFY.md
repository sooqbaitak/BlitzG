# BLITZ GAMING — Netlify + Supabase launch checklist

This project is a static React/Vite site with an optional Supabase cloud backend. **A custom domain is not what makes data shared.** Products, prices, the logo, categories, stock, delivery areas, coupons, loyalty balances and orders sync across devices only when the same Supabase project is configured and its schema/security are installed.

## A. Create and configure the shared backend

1. Create a Supabase project at https://supabase.com/dashboard. Save the project URL and the browser-safe **Publishable key** (`sb_publishable_...`) from Project Settings → API Keys. The frontend also supports the older JWT-style `anon` key, but prefer the new publishable key for a fresh setup.
2. Open SQL Editor in that project and run the entire `supabase/schema.sql` file from this project. If an earlier version of the schema was already installed, rerun this latest full file: it updates the order-status history function and adds the protected courier/tracking update function. The script creates the shared store state, customer profiles, order and coupon-redemption tables, the global order-number sequence, order-creation function, row-level security policies, and the public image bucket policies.
3. In Authentication → URL Configuration, add the Netlify site URL to the Site URL / Redirect URLs (e.g. `https://YOUR-SITE.netlify.app`). Email/SMS one-time-code sign-in must be enabled for the providers you plan to use.
4. OTP account sign-in is implemented through Supabase Auth. For numeric email codes, open Authentication → Email Templates → Magic Link / OTP and use `supabase/templates/otp_email.html` (it must contain `{{ .Token }}`). Configure custom SMTP under Authentication → SMTP Settings for public-customer email delivery; Supabase's default sender is restricted to pre-authorized team addresses. For phone OTP, enable Authentication → Providers → Phone, configure a supported SMS provider and use `supabase/templates/otp_sms.txt` with `{{ .Code }}`. Test both channels before launch.
5. Create your private administrator in Supabase Authentication → Users. Give the account a strong password. Then open SQL Editor and run the following query after replacing the email with the exact administrator email:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com');
   ```

   Confirm that exactly one intended user was updated. Sign out and back in after changing the role so Supabase issues a fresh token. Admin access requires the server-controlled `app_metadata.role = admin`; do not use user-editable metadata for this.
6. Never copy the Supabase **secret/service-role key** into the website, a `VITE_` variable, or a public repository. The browser uses the publishable key (or a legacy anon JWT) and relies on database RLS policies. New `sb_publishable_...` keys are sent only as API keys, not as Bearer JWTs. Keep any service-role key private and do not add one to this frontend.

## B. Publish on Netlify

1. Extract this ZIP so `package.json`, `package-lock.json`, `index.html`, `netlify.toml`, `src/`, `public/` and `supabase/` are at the project root.
2. In Netlify, choose **Add new site → Import an existing project** (recommended) and connect a Git repository containing these files. Alternatively, use Netlify's manual deploy flow only after building locally; drag-and-drop of the source folder alone does not run Vite's build. Do not upload `node_modules`.
3. In Netlify → Site configuration → Environment variables, add:
   - `VITE_SUPABASE_URL` = the Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the browser-safe Publishable key (`sb_publishable_...`). Legacy `VITE_SUPABASE_ANON_KEY` is still supported.
   - `SUPABASE_URL` = the same project URL (server-only; required by Track My Order).
   - `SUPABASE_SECRET_KEY` = the Supabase secret key (`sb_secret_...`, server-only) or legacy `SUPABASE_SERVICE_ROLE_KEY` if the project uses the older JWT key. Never prefix it with `VITE_`.
   - `LAHZA_SECRET_KEY` = the Lahza / Bank of Palestine gateway secret key from your merchant account (begin in test mode; server-only, never `VITE_`).
   - `SITE_URL` = your public HTTPS Netlify URL, e.g. `https://YOUR-SITE.netlify.app` (Netlify's `URL` environment is a fallback).
4. Ensure the deploy uses Node 22 (already specified in `netlify.toml`), build command `npm run build`, and publish directory `dist` (already specified in `netlify.toml`). Trigger a fresh deploy after setting environment variables because Vite injects them at build time.
5. Open the deployed `https://YOUR-SITE.netlify.app/#/admin/login` and sign in with the administrator email/password created in Supabase. It is not the old local demo username/password. If the dashboard shows “LOCAL DEMO MODE”, the environment variables were not included in that deploy or the build was not refreshed.
6. On the first successful admin login, the site loads shared state from Supabase. If the shared store is empty, it seeds it from the site's current sample state. Immediately replace demo products, specifications, prices, stock and images with verified inventory.
7. Add your custom domain in Netlify only when ready. A domain is optional and **is not required** for cross-device synchronization; all devices must load the same deployed site and use the same Supabase backend.

## Card payments and bank transfers

The project integrates **Lahza hosted checkout**, the online gateway offered by Bank of Palestine. Customers enter card details on the provider-hosted payment page; card data never passes through Blitz Gaming. The server initializes transactions with a unique reference and ILS amount in agorot, then verifies the transaction with Lahza before marking the order paid. A signed webhook endpoint is included for updates if the customer closes the browser.

Before live card charges are possible, apply for the merchant payment gateway and complete the provider's merchant and settlement approval. Use test credentials first. In Netlify set `LAHZA_SECRET_KEY` and `SITE_URL`; deploy; check `/.netlify/functions/payment-capabilities`; then configure `https://YOUR-SITE.netlify.app/.netlify/functions/lahza-webhook` in the Lahza merchant dashboard for `charge.success` events. The customer-return callback is `https://YOUR-SITE.netlify.app/.netlify/functions/lahza-callback`. After successful test transactions, enable live credentials. A personal bank account cannot be activated merely by typing its IBAN into the website: the gateway provider must approve the merchant and configure the settlement account. Official service information: https://web.bankofpalestine.com/business/electronic-services/digital-payments/payment-gateway .

Keep the card toggle off until your merchant account is approved and a full test has passed. The payment-capabilities endpoint confirms only that the necessary environment variables exist; it cannot independently confirm merchant approval or guarantee a live charge will succeed.

Bank Transfer is a manual workflow: enter bank/account details in Store Settings, enable the method, and tell customers to use the order number as the transfer reference. The order remains unpaid until an administrator checks the account and clicks **Confirm bank transfer received** under Admin → Orders. Do not click this until the funds have actually arrived.

## C. Verify that cross-device sync actually works

1. Open the live site on device/browser A, sign in as the cloud administrator, edit a test product price or logo, and save.
2. Open the same deployed site on device/browser B or a private window. Public catalog/settings changes should load from shared Supabase state; the admin can sign in separately on B.
3. Create a test order. It should get a globally sequenced ID such as `BG#1001`, with the number allocated by the database sequence rather than local browser storage. Check that the order appears in the admin Orders area and, for a logged-in customer, in Account history.
4. Test one standard coupon and one loyalty coupon. Confirm the customer's points balance and the coupon's redemption count after a successful order. Test an exhausted coupon and verify that the server rejects it.
5. Upload a product image while signed in as the cloud admin, then view that product from another device. The image must be served from the shared `product-images` bucket, not a `data:` URL.
6. Confirm new delivery locations/fees and language-specific category labels on another device. Wait at most one polling interval (20 seconds) or refresh the page if an already-open browser has stale content.

## D. What changes if Supabase is not configured?

The app deliberately retains a local demo mode so the storefront can be previewed and edited before backend setup. In local demo mode, browser `localStorage` is the database: changes do not propagate to other devices, browsers or customers, can be deleted, and order numbering is only local to that browser. Uploaded images are embedded locally and will not be shared. Do not take real orders in this mode. The admin banner explicitly reports this condition.

Cloud mode provides the shared store state, customer OTP authentication/profile, wishlist and points, order history, server-side order price/stock/delivery/coupon checks, global `BG#` order serial, and shared image uploads. Email OTP requires working Supabase email settings; mobile OTP requires an SMS provider. No integration can be considered live until the deployment steps above are completed and tested. Card payments additionally require an approved Lahza merchant account and live key; email/SMS OTP requires real delivery-provider configuration.

## E. Netlify build troubleshooting

- `npm ci` installs the locked dependencies; `npm run build` must finish successfully before deployment. This environment file may not include Node packages; that does not mean Netlify is misconfigured.
- Check Netlify deploy logs for missing env vars or TypeScript/build errors. Vite reads `VITE_*` values at build time, so redeploy after changing them.
- If data remains local, verify environment variables exist for the production deploy context, run SQL, and check the browser console/network tab for Supabase REST/Storage errors.
- If email OTP does not arrive, check spam, Supabase Auth email templates, provider limits and allowed URLs. If phone OTP fails, configure SMS and country-specific delivery with your provider.
- Never place administrator credentials or a secret/service-role key in source code, CSVs, screenshots, or public environment variables.


## Admin profile and order email alerts

The Admin Users page now has a **My Administrator Account** form. In Supabase mode it updates the authenticated admin's display name and password through Supabase Auth; for local demo mode it only edits this browser's demo record and is not production security.

The Products dashboard has a duplicate action. It copies product content, images, specs, tags and variants into a new **draft** with a new slug/SKU and zero stock, so the copy cannot accidentally be sold before you review it. Category management supports nested categories; customer category pages show their direct subcategories near the top and include products from nested descendants.

To enable a message to the store's Gmail when an order is successfully saved in Supabase:

1. Create an account with Resend and verify the sender domain/address you want to use. A Gmail recipient (for example `sooqbaitak@gmail.com`) is fine; the `from` address must meet the email provider's requirements.
2. In Netlify → Site configuration → Environment variables, set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `ORDER_EMAIL_FROM`. These are **server-only** values; never put a Supabase secret/service-role key or Resend API key in a `VITE_` variable.
3. In Supabase SQL Editor, run the updated `supabase/schema.sql` in this project to create the private order-email notification log table. Do not grant public access to that table.
4. In Admin → Store Settings, set the destination Gmail, email subject and message template. Supported placeholders: `{{order_number}}`, `{{created_at}}`, `{{customer_name}}`, `{{phone}}`, `{{email}}`, `{{delivery_area}}`, `{{city}}`, `{{address}}`, `{{items}}`, `{{subtotal}}`, `{{discount}}`, `{{delivery_fee}}`, `{{total}}`, `{{coupon_code}}`, `{{build_preference}}`, `{{notes}}`.
5. Redeploy the site after updating environment variables, then place a test order while cloud mode is configured. The checkout confirms the order independently; a mail provider failure does not erase the order. Check Netlify function logs for email delivery errors. Repeated requests for the same order are deduplicated.

Social/contact links are editable in Admin → Store Settings. Add each platform label and URL; active links appear in the footer. Enter email links as `mailto:you@example.com` or a regular email address.

## F. Admin account, subcategories, product duplication and social links

- To change your own administrator display name or password, sign in and open **Admin → Admin Users → My Administrator Account**. In cloud mode this updates the signed-in Supabase Auth user. In local demo mode it changes only the browser-stored demo account and should not be used for production.
- To duplicate a product, open **Admin → Products** and select the copy icon. The duplicate is created as an unpublished draft with a unique SKU/slug and zero stock; inspect prices, images and variants before publishing.
- To add a subcategory, open **Admin → Categories → Add Category**, choose the parent category, and save. Child category buttons appear at the top of the parent category page; products in descendants also appear in the parent's results. Use distinct URL slugs for each category.
- To manage website social/contact icons, open **Admin → Store Settings → Custom Social & Contact Links**. Enter a platform, display label and URL, mark the link active, and save. The active links appear in the site footer. Use `mailto:name@example.com` for email addresses.
- The new-order email address, subject and message template are managed in **Admin → Store Settings → New Order Email Notifications**. Notifications run only for orders successfully stored in cloud mode; local demo orders do not trigger server email.

Email deployment note: configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `ORDER_EMAIL_FROM` for the Netlify Functions runtime (the Resend sender must be verified). Keep all secret keys and `RESEND_API_KEY` private. A recipient can be a Gmail address; the sender should be an address/domain verified with your email provider.

Recent admin additions: Build Your Setup category ordering and multilingual top notice are under Admin → Build Your Setup. Sales Analytics supports date, category, product, and brand filters plus revenue trends and estimated gross profit. Product Manager supports optional per-unit loyalty points and acquisition cost (سعر التكلفة).

Important database note: execute the complete current `supabase/schema.sql` in Supabase SQL Editor after updating this project. It creates the admin-only `blitz_product_costs` and `blitz_order_item_costs` tables; customer-readable order JSON never exposes acquisition costs. Admin order status changes are persisted by the protected `blitz_admin_update_order` RPC. Do not deploy this project using an older schema.

## Checkout payment options

Admin → Store Settings → Checkout Payment Methods controls visibility. Cash on Delivery is enabled by default. Visa/Mastercard/AmEx have a server-side Lahza hosted-checkout integration and can process payments only after merchant approval, `LAHZA_SECRET_KEY`, `SITE_URL`, and Supabase server credentials are configured in Netlify and end-to-end test transactions succeed. PayPal, Apple Pay and Google Pay have display toggles but are not operational until their own provider integrations are implemented; enabling their toggles must not be treated as accepting payment. Bank Transfer is available as a manual method when account details are saved and cloud mode is configured; an administrator must confirm the funds in the real bank account before marking an order paid. Never enter provider secrets in Store Settings or `VITE_` variables.

## Public order tracking

The public route is `/#/track-order`, linked from the homepage and navigation. Buyers enter their order number (for example `BG#1001`) plus the phone number used at checkout; the server validates both and returns only a small, privacy-filtered response. Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or the legacy service-role key) as server-only Netlify variables. Admins can set delivery company, courier name/phone, a customer-facing tracking message and a valid `https://` external carrier tracking URL in the expanded Order details panel. Automatic status tracking from a carrier's app requires its API and cannot be enabled just by entering a carrier name.
