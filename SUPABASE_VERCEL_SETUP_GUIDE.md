# BLITZ GAMING — Supabase + Vercel setup guide (dashboard-first, no terminal)

This guide connects the latest store source to the shared Supabase database and deploys the website/API functions on Vercel. Follow it in order. Do not accept real orders until the final tests pass.

## What this connection fixes

Supabase is the shared database/auth/storage layer. Vercel hosts the website and server-side `/api/*` functions. Once configured, admin changes to products, prices, categories, images, offers, campaigns, settings, coupons and delivery rules are shared across devices. If Supabase is not configured, the website intentionally falls back to local demo data stored in the current browser.

## Step 1 — Create or open the Supabase project

1. Open https://supabase.com/dashboard and create a project, or open the project you already made.
2. Wait for the project to finish provisioning.
3. Open **Project Settings → API Keys** (or **Connect**). Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`).
   - **Publishable key** (starts with `sb_publishable_`).
   - **Secret key** (starts with `sb_secret_`). Keep this secret private.
4. Do not put the secret key into the website source or into any variable starting with `VITE_`. Vite exposes `VITE_*` values in the browser bundle; the source only needs the publishable key on the public side.

Official references: [Supabase React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [Vite environment variable safety](https://vite.dev/guide/env-and-mode).

## Step 2 — Create the database, policies and image storage

1. Download/extract this project ZIP.
2. Open `supabase/schema.sql` (the same full schema is also copied to `Blitz_Gaming_Supabase_Schema.sql`).
3. In Supabase, select **SQL Editor → New query**.
4. Copy the **entire** current `supabase/schema.sql` file into the editor and press **Run**.
5. Wait until Supabase reports success. The script is designed to be re-runnable and includes the tables, security policies, order functions, private cost tables, customer fields and the public `product-images` Storage bucket/policies used by image uploads.
6. If the SQL Editor reports an error, do not continue with a partially configured project. Save the full error message first.

If you ran an older version of the schema previously, run this latest version again. Store appearance, banners, offers, campaigns and category settings are saved in the JSON store record; the current schema already has a place for them, so those settings don't need separate tables.

## Step 3 — Create the real administrator account

1. In Supabase go to **Authentication → Users → Add user**.
2. Create the email and a strong password you want to use for store admin access.
3. Open **SQL Editor → New query** and run this after replacing the example address with your exact admin email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com');
```

4. Confirm one user was updated.
5. Sign out of the site/admin dashboard if already logged in, and then sign in again so the new `app_metadata.role` is included in your token.
6. Use this Supabase email/password on `https://YOUR-VERCEL-DOMAIN/#/admin/login`. The old local demo login is not a secure production account.

Do not assign the admin role from user-editable profile metadata. It must stay in Supabase-controlled `app_metadata`.

## Step 4 — Add environment variables in Vercel

1. Open https://vercel.com/dashboard and choose the Blitz Gaming project.
2. Go to **Settings → Environment Variables**.
3. Add the variables below. For `VITE_` values, select **Production**, **Preview**, and **Development** as appropriate. Keep secret/server-only values private and never add a `VITE_` prefix to them.

### Required browser/build values

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_...` key |

Legacy projects can use `VITE_SUPABASE_ANON_KEY` instead, but new projects should use the publishable key.

### Required server-side values

| Name | Value |
|---|---|
| `SUPABASE_URL` | The same Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Your `sb_secret_...` key; keep server-side only |
| `SUPABASE_PUBLISHABLE_KEY` | The project's publishable key; used by server functions when verifying signed-in admin sessions |
| `SITE_URL` | The deployed public HTTPS URL, e.g. `https://blitzgaming.vercel.app` |

Older Supabase projects may use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SECRET_KEY` and `SUPABASE_ANON_KEY` instead of `SUPABASE_PUBLISHABLE_KEY`. Use the newer key types when available. Do not set two conflicting key types at once.

### Optional notification and payment values

| Name | Needed for |
|---|---|
| `RESEND_API_KEY` | Sending order/customer emails through Resend |
| `ORDER_EMAIL_FROM` | Verified sender, e.g. `Blitz Gaming Orders <orders@your-verified-domain.com>` |
| `LAHZA_SECRET_KEY` | Hosted card payments, only after your Lahza merchant account is approved; begin with its test key |

Never commit a real `.env` file or a server secret into GitHub. `.env.example` contains placeholders only.

4. Click **Save** for every variable.
5. After setting/changing environment variables, go to **Deployments**, choose the latest deployment menu, and redeploy (a new build is required because Vite reads `VITE_*` variables at build time).

Official reference: [Vercel environment variables](https://vercel.com/docs/environment-variables).

## Step 5 — Ensure Vercel is building the correct project

This project contains `vercel.json` and an `api/` folder. Vercel should use:

- Framework preset: **Vite**
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

The `api/*.mjs` wrappers expose the store's server functions under `/api/` on Vercel. The same source can still be deployed to Netlify; the project includes a Netlify redirect for those `/api/` routes too.

Recommended path when already connected to GitHub:

1. Upload/commit the current project files into the same GitHub repository connected to Vercel (keep `package.json` and `package-lock.json` at the repository root).
2. Push the change. Vercel should automatically start a deployment.
3. Open the deployment log and make sure **Build Completed** appears with no TypeScript errors.

If the project isn't connected to GitHub, choose **Add New → Project → Import Git Repository** in Vercel and select the repository. Avoid using a static file-drop workflow for this React/Vite source because it requires a build step.

## Step 6 — Check that Supabase is actually connected

1. Visit the deployed site and open `/#/admin/login`.
2. Sign in using the Supabase administrator created in Step 3.
3. If the dashboard says **local demo mode** or says edits only exist in this browser, the browser variables were not included in the latest deployment or the connection isn't valid. Recheck the two `VITE_` variables and redeploy.
4. In the admin dashboard, edit a test product price or a category banner and save it.
5. Open the exact same live URL on another phone or a private browser window. Refresh. The same change should be visible. Do not use a different preview deployment or different Supabase project for this test.

The custom domain is not the thing that synchronizes data. The key is that each device loads the same deployed build and it connects to the same Supabase project.

## Step 7 — Enable email notifications (if you want order emails)

A guest checkout without Supabase/cloud mode won't send the store-owner order email. The server function must first find the saved order in Supabase, then use Resend to send the message. After Step 4, do this:

1. Create a Resend account and verify the sender domain/address.
2. Add `RESEND_API_KEY` and `ORDER_EMAIL_FROM` to Vercel Environment Variables, with no `VITE_` prefix.
3. In **Admin → Store Settings → New Order Email Notifications**, set the recipient Gmail, subject and message template.
4. Redeploy after adding environment variables.
5. Place a small test Cash on Delivery order in cloud mode. Check the `BG#...` confirmation, the order in admin, your receiving Gmail and Resend logs. Check Spam if needed.

A missing email before this is configured is expected: simply testing checkout in local demo mode doesn't cause a server-sent email.

## Step 8 — Configure customer email/phone verification (OTP)

**Email codes:** In Supabase, go to **Authentication → SMTP Settings** and configure a real SMTP sender. Then go to **Authentication → Email Templates → OTP** and use `supabase/templates/otp_email.html`. Keep `{{ .Token }}` in the template. Supabase's default testing sender is restricted and isn't meant for unrestricted public sign-up.

**Phone/SMS codes:** In **Authentication → Providers → Phone**, enable phone auth, set up a supported SMS provider with valid credentials and set the template to `supabase/templates/otp_sms.txt` (containing `{{ .Code }}`). Confirm your SMS provider supports the Palestinian number destinations you intend to serve. Test real email and mobile OTP delivery before launch.

## Step 9 — Configure browser order notifications

In **Admin → Store Settings**, enable browser notifications, grant notification permission in that browser and use the test-notification button. The current built-in watcher alerts the signed-in admin while the admin dashboard is open in a browser; it polls the cloud order list about every 20 seconds. It can make a sound if enabled.

**Limitation:** this is not a background push service and will not reliably deliver notifications when the admin dashboard/browser is closed. True closed-browser push requires a service worker, push subscriptions and VAPID/web-push or a push provider; keep the dashboard open for the current watcher to work.

## Step 10 — Payment settings

Cash on Delivery is the only enabled option by default. Bank Transfer is manual; mark an order paid only after the transfer appears in your account. Card payments use a Lahza hosted checkout only after merchant approval and `LAHZA_SECRET_KEY` are configured. Keep cards disabled until a test checkout, webhook and paid status are confirmed. PayPal, Apple Pay and Google Pay require their own provider integrations and must not be activated as if working merely by changing a display toggle.

## Final pre-launch checklist

- [ ] The latest SQL schema ran successfully in Supabase.
- [ ] A Supabase user has the server-controlled `admin` role and can log in.
- [ ] Both `VITE_SUPABASE_*` environment variables are set in Vercel, followed by a fresh deployment.
- [ ] Server variables `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, and `SITE_URL` are set.
- [ ] Vercel deployment build succeeds.
- [ ] An admin edit on device A appears on device B.
- [ ] A test COD order is persisted and visible in the dashboard.
- [ ] Email and OTP delivery are tested only after their SMTP/Resend/SMS credentials are configured.
- [ ] Product prices, stock, categories, delivery fees and legal/store policies have been checked against real information.
- [ ] Card payments stay disabled until the gateway merchant approval and end-to-end test succeed.
