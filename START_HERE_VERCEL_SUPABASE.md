# BLITZ GAMING — Start here (Vercel + Supabase)

This is the current setup path for the version that includes appearance customization, offers, seasonal campaigns, variant-linked images and filters, customer management, loyalty points, payment options, order tracking, and the admin tools.

## Before starting

- The source project is deployed through Vercel. Keep `package.json`, `package-lock.json`, `vercel.json`, the `api/` folder, `server/`, `src/`, and `supabase/` at the repository root.
- Supabase is the shared database/auth/storage backend. Without it, data remains in local demo storage in that browser and does not synchronize to other devices.
- Never put `SUPABASE_SECRET_KEY`, a service-role key, Resend key, or Lahza secret into a `VITE_` environment variable or source-controlled file.

## Steps (mostly dashboards; no terminal needed)

1. **Open Supabase:** https://supabase.com/dashboard. Create/open the project's database and copy its Project URL, publishable key, and server-side secret key.
2. **Create schema:** open the downloaded project, open `supabase/schema.sql`, copy the entire file, then paste/run it in **Supabase → SQL Editor → New query**. Run the latest file, not an older copy. Stop if Supabase reports an error.
3. **Create admin:** under **Supabase → Authentication → Users**, create the admin user. Assign `app_metadata.role = admin` using the SQL statement in `SUPABASE_VERCEL_SETUP_GUIDE.md`; sign out/in afterward.
4. **Configure Vercel:** open https://vercel.com/dashboard → your project → **Settings → Environment Variables**. Add these required variables and choose the environments you deploy:
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Supabase publishable key (`sb_publishable_...`)
   - `SUPABASE_URL` = same Project URL
   - `SUPABASE_SECRET_KEY` = Supabase secret key (`sb_secret_...`, server-only)
   - `SUPABASE_PUBLISHABLE_KEY` = the publishable key (used by server functions to validate authenticated users)
   - `SITE_URL` = your deployed HTTPS Vercel URL
5. **Deploy:** push the current files to the GitHub repo connected to Vercel, then trigger a fresh deployment. Vercel should use Vite, `npm ci`, `npm run build`, and output folder `dist`. Environment changes only affect new deployments.
6. **Verify cloud mode:** visit `/#/admin/login`, sign in using the Supabase admin, edit a test product and save. Open the same live URL on another phone/private browser and confirm the edit appears there. If the dashboard indicates local/demo mode, check both `VITE_` variables and redeploy.
7. **Email notifications:** order checkout alone does not send an owner email until Supabase and the server email provider are configured. Add `RESEND_API_KEY` and a verified `ORDER_EMAIL_FROM` to Vercel. Then set the receiving Gmail, subject, and message in Admin → Store Settings. Make one test COD order and inspect your inbox/spam and Resend logs.
8. **Customer verification:** email OTP requires custom SMTP in Supabase Auth. Mobile OTP requires an SMS provider enabled for your target destinations. Test both real deliveries before public registration.
9. **Payments:** keep Cash on Delivery enabled by default. Card payments require an approved Lahza merchant account and server-only `LAHZA_SECRET_KEY`. Bank transfer is manual confirmation. Do not activate a payment method until its provider is configured and a real end-to-end test succeeds.
10. **Browser notifications:** enable notifications in Store Settings and grant browser permission while signed into the admin dashboard. The current watcher polls while the admin dashboard is open; it is not a closed-browser push service.

## Included advanced controls

- **Admin → Appearance:** global color/font/style controls, live preview, style suggestions, and reset to BLITZ defaults.
- **Admin → Homepage:** image/video hero slides, ordering, speed and transition settings.
- **Admin → Offers:** product search/filter, original price and sale price controls.
- **Admin → Campaigns:** timed seasonal banners/announcements, page placement, fonts, images, colors and animation controls.
- **Admin → Products:** variant images, custom options, stock, price adjustments and optional cost/loyalty fields.
- **Admin → Store Settings:** logo aspect ratio/fit, favicon, social links, customer theme toggle, announcement controls and notification preferences.

## Test before launch

- Test product edits sync between two devices.
- Place a guest checkout test and confirm the BG# order appears in admin and order tracking.
- Test a customer account and wishlist with Supabase connected.
- Test coupon/points validation, zero-stock variants, delivery fee calculation, CSV import/export, and mobile layout.
- Leave card methods off until payment gateway credentials, webhook and paid-status transitions are verified.

Full detail: [`SUPABASE_VERCEL_SETUP_GUIDE.md`](SUPABASE_VERCEL_SETUP_GUIDE.md).

Official docs: [Supabase React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [Vite environment variables](https://vite.dev/guide/env-and-mode), [Vercel environment variables](https://vercel.com/docs/environment-variables).
