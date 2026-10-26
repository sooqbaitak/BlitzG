# Blitz Gaming: Supabase setup without using the terminal

This older guide describes Netlify. Because the current deployment uses Vercel, use `SUPABASE_VERCEL_SETUP_GUIDE.md` instead for the authoritative steps. The main setup sequence remains similar, but the API endpoints and environment variables must be configured in Vercel. You do not need to edit source code in a terminal. The backend is not connected until you put your own project values into the dashboards and run the current SQL file.

## 1. Create the shared database

1. Open https://supabase.com/dashboard and create a new project. Save its database password somewhere private.
2. Open **Project Settings → API Keys** (or the project's **Connect** dialog). Copy the **Project URL** and the **Publishable key** beginning `sb_publishable_`. Do not use the secret key in the website.
3. In the new Supabase project, open **SQL Editor → New query**.
4. From this project ZIP, open `supabase/schema.sql`, copy the entire file, paste it into the SQL Editor, and press **Run**. Wait for success. This latest full schema is important; it includes private acquisition-cost storage, shared order-status history, protected courier/tracking updates, and customer-management fields (highlighting, blocking, account messages, points and personal discounts). If you already ran an older schema, rerun the entire current file so the new functions are installed. If SQL Editor shows an error, stop and keep the exact error text instead of proceeding with a partly installed schema.

## 2. Create the administrator

1. In Supabase, open **Authentication → Users → Add user** and create an administrator using an email and a strong password.
2. Open **SQL Editor → New query**, paste the query below, replace the example address with the administrator's exact email, and run it:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com');
```

3. Confirm one user was updated. Sign out, then sign in again so the new administrator role is included in the login token.

## 3. Connect Netlify to Supabase

1. Open the existing Blitz Gaming site in https://app.netlify.com/.
2. Go to **Site configuration → Environment variables** and add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the `sb_publishable_...` key copied earlier
   - `SUPABASE_URL` = the same project URL (server-only; required by the public order-tracking function)
   - `SUPABASE_SECRET_KEY` = the Supabase secret key (`sb_secret_...`, server-only), or legacy `SUPABASE_SERVICE_ROLE_KEY` if using an older project
3. Save the variables and trigger **Deploys → Trigger deploy → Clear cache and deploy site**. Vite reads these values when the site builds, so a new deploy is necessary. The old `VITE_SUPABASE_ANON_KEY` variable is still supported for a legacy anon JWT, but use the publishable key for a new setup.
4. When the deploy succeeds, open `https://YOUR-SITE.netlify.app/#/admin/login` and sign in with the administrator email and password you created in Supabase. The old demo username/password is not used in cloud mode.
5. The Netlify source includes `netlify/functions/admin-customers.mjs`. Once the secret key and current schema are deployed, **Admin → Customers** lists registered Supabase accounts and supports highlighting, points, personal discounts, customer account messages, blocking/unblocking and account deletion. Add `RESEND_API_KEY` and `ORDER_EMAIL_FROM` as server-only Netlify variables if you want to email a customer from that page.

If your code is not yet connected to Netlify through a repository, upload/extract the project files into a GitHub repository using GitHub's website and then choose **Add new site → Import an existing project** in Netlify. The repository root must contain `package.json`, `package-lock.json`, `index.html`, `netlify.toml`, `src/`, `public/`, and `supabase/`. Netlify should use the included `npm run build` command and `dist` publish folder. Do not drag the source ZIP directly onto Netlify Drop; source files need a build step.

## 4. Optional: order notification emails

The public Track My Order page also needs the server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or legacy service-role key) in Netlify. Do not add these to any `VITE_` variable or to the frontend code.

The store itself can use Supabase without email notification credentials. To enable the order/customer email features:

1. Create a Resend account and verify the sender address/domain you plan to send from.
2. In Netlify environment variables add server-only values:
   - `SUPABASE_URL` = the same project URL
   - `SUPABASE_SECRET_KEY` = your Supabase secret key (`sb_secret_...`), preferred; or use legacy `SUPABASE_SERVICE_ROLE_KEY` if your project only has the older JWT key
   - `RESEND_API_KEY` = your Resend API key
   - `ORDER_EMAIL_FROM` = the verified sender, e.g. `Blitz Gaming Orders <orders@your-verified-domain.com>`
3. Never prefix secret values with `VITE_`. Never paste the secret key into frontend code or a public repository.
4. Set the receiving Gmail, subject and body under **Admin → Store Settings → New Order Email Notifications**, then redeploy and place a test order. To send a one-off customer message, use **Admin → Customers → Manage → Send a message**. Customer account messages are also saved in the customer's account page. This customer list and its block/delete/points/discount controls require `SUPABASE_URL` and a server-only `SUPABASE_SECRET_KEY` (or the legacy service-role key).

## 5. Enable hosted card payments (optional)

Cash on Delivery remains the only enabled method by default. To accept Visa/Mastercard through Lahza / Bank of Palestine, you must apply for and receive approval for the merchant gateway and settlement account. Official information: https://web.bankofpalestine.com/business/electronic-services/digital-payments/payment-gateway . The buyer is redirected to Lahza's hosted card page; Blitz Gaming does not collect card numbers.

1. In Netlify → Site configuration → Environment variables, add `LAHZA_SECRET_KEY` using the provider's **test** secret key and `SITE_URL` using the public HTTPS URL of your Netlify site. Keep the key server-only; never use a `VITE_` prefix.
2. Redeploy. Visit `https://YOUR-SITE.netlify.app/.netlify/functions/payment-capabilities`; it should report `cardReady: true` when required variables exist. This does not independently prove that the merchant account is approved.
3. In the Lahza merchant dashboard, configure the return callback `https://YOUR-SITE.netlify.app/.netlify/functions/lahza-callback` if requested, and register `https://YOUR-SITE.netlify.app/.netlify/functions/lahza-webhook` for `charge.success` events.
4. Enable the Card toggle in Admin → Store Settings, test a complete transaction with the test key, and verify the payment state in the admin order view. Only replace the test key with a live key after merchant approval and testing. Never mark card orders paid based only on a screenshot or redirect.

Bank Transfer is separate: enter the bank details in Store Settings, enable the toggle and let customers use their order number as the reference. Mark the order paid only after the money appears in your bank account.

## 6. Make one-time verification codes actually arrive

The Account page already requests and verifies numeric Supabase OTP codes. The delivery providers must be configured:

**Email / Gmail destination**
1. In Supabase open **Authentication → SMTP Settings** and configure a production SMTP account. The default Supabase email service is for limited testing and only sends to addresses pre-authorized on the project team.
2. Open **Authentication → Email Templates → Magic Link / OTP** and paste the contents of `supabase/templates/otp_email.html`. Keep `{{ .Token }}` in the template so customers receive a numeric code instead of a link-only email.
3. Set the deployed Netlify URL in the Supabase Auth Site URL / Redirect URLs. Test an email address outside the project team, check spam, and verify that the six-digit code signs in.

**Phone number / SMS destination**
1. In **Authentication → Providers → Phone**, enable phone sign-in and configure a supported SMS vendor with real credentials and service/sender ID.
2. Set the SMS OTP template to `supabase/templates/otp_sms.txt`, which contains `{{ .Code }}`. Configure destination-country support and rate limits with the SMS vendor.
3. Test a real Palestinian mobile number and confirm the code arrives and verifies before opening account creation to customers.

These steps require accounts/credentials from your SMTP and SMS vendors; code cannot create provider accounts or pay their fees automatically.

## 7. Test synchronization before launch

1. In admin settings, change a product price or the store logo and save.
2. Open the exact same live Netlify URL on another device or private browser window. Refresh if needed. Confirm the change appears there.
3. Place a test order and confirm its number is `BG#...` and the order appears in the admin dashboard.
4. Change the order status. Refresh the second browser and confirm the new status remains.
5. Test an image upload, a coupon, a loyalty reward, and a product with an acquisition cost. Check that the cost value is only visible to admins and that profit appears in analytics.
6. Sign up a test customer, then use **Admin → Customers** to add points, set a personal discount, save an account message, highlight the customer, and (using a disposable test account) test block/unblock and deletion.

The header and home hero now link to the public Track My Order page. Customers enter their BG# order number and the phone used at checkout; this extra check is intentional because order numbers are sequential. The public response excludes full address, email, and private order notes. The tracking page shows status history, products, total, optional courier name/phone, status message and optional external tracking link. A carrier app cannot be connected automatically without its API or tracking URL format; admins can enter an external tracking URL per order.

Payment settings are under Admin → Store Settings → Checkout Payment Methods. Only Cash on Delivery is enabled initially. Visa/Mastercard/AmEx have a hosted Lahza checkout integration in the source and can process card payments after you receive merchant approval and configure/test the server variables described in this guide. Bank Transfer is a manual flow: add your bank details, enable it, and confirm funds in the bank before marking orders paid. PayPal, Apple Pay and Google Pay are not operational yet; they need separate provider integrations even if their visibility toggles are changed. Never claim an online payment succeeded without gateway confirmation.

A custom domain is not required for cross-device sync. Both devices must load the same deployed site configured with the same Supabase project. The site deliberately remains in local demo mode when the frontend environment variables are absent; do not accept live orders in that mode.
