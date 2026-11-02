# BLITZ GAMING — local test, GitHub push and Vercel release

## 1. Keep the Supabase project connected

The frontend reads only these browser-safe Vite variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

A legacy Supabase project can use `VITE_SUPABASE_ANON_KEY` instead of the publishable key. Do not set conflicting publishable and anon values. Never use `SUPABASE_SECRET_KEY` or a service-role key in a `VITE_` variable.

Keep server-only values in Vercel Environment Variables, not in `.env.local` committed to GitHub:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
- `RESEND_API_KEY`
- `ORDER_EMAIL_FROM`
- `SITE_URL=https://blitz-g.vercel.app`

## 2. Apply the small database update

The full `supabase/schema.sql` has already been run on the new project. **Do not rerun the full schema just for this update.** Open Supabase → SQL Editor and run only `supabase/BLITZ_POINTS_EARNING_MODE_MIGRATION.sql`. It replaces the existing order-creation function to keep spend-based loyalty earning disabled unless its new setting is explicitly enabled. It does not drop tables or delete store data.

## 3. Prepare the local project on Windows

Use Node.js `24.22.2` (this project includes `.nvmrc` with that version). Open PowerShell in the folder containing `package.json` and run:

```powershell
node -v
npm -v
npm ci
```

Create `.env.local` in the project root if one does not already exist. Put only the browser-safe values in it:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Replace the placeholders with values from Supabase → Project Settings → API Keys. `.env.local` must remain local and must not be committed.

Start the local site:

```powershell
npm run dev
```

Open the Vite URL printed in PowerShell (normally `http://localhost:5173`). Admin login is at `http://localhost:5173/#/admin/login`. The local development site still reads/writes the same Supabase project when `.env.local` is configured and you sign in as the existing Supabase administrator. Avoid placing real orders while testing; use a clearly identified test order and remove/cancel it in the admin when finished.

Before pushing, stop the dev server with `Ctrl+C` and run:

```powershell
npm run build
```

A successful build creates `dist/`. Do not upload `dist/` to GitHub as the source; Vercel builds it from the project files.

## 4. Put the updated files in the existing GitHub repository

If you already have a local clone of `https://github.com/sooqbaitak/BlitzG`, back it up first. Copy the contents of this updated project over that clone, but **keep the clone's `.git` folder** and keep any local `.env.local` file. Do not run `git init`, do not delete `.git`, and do not force-push.

In PowerShell, from the existing repository folder:

```powershell
git status
git branch --show-current
git add .
git commit -m "Fix stock, checkout, customer auth and admin settings"
git push origin main
```

If `git branch --show-current` prints a branch other than `main`, push that branch name instead of `main`. If Git reports there is nothing to commit, verify that the updated source files were copied into the repository.

## 5. Let Vercel deploy the update

If the GitHub repository is connected to the Vercel `blitzgaming` project, the push should start a deployment automatically. In Vercel, confirm:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node.js version: 24.x
- The two `VITE_` variables are configured for Production (and Preview/Development as needed)
- The server-only email variables above are configured for Production

After changing Vercel environment variables, trigger a fresh deployment because Vite embeds `VITE_` values at build time.

## 6. Finish the email and notification setup

See `BLITZ_EMAIL_AND_AUTH_SETUP.md` for the two separate email paths:

- Supabase Auth customer codes: set the **Magic Link / OTP** email template to use `{{ .Token }}`, then configure custom SMTP with sender name `BLITZ GAMING`.
- New-order email to `sooqbaitak@gmail.com`: configure Resend, a verified sender domain, and the server-only Vercel environment variables.

Phone sign-in stays hidden until an SMS provider is configured in Supabase. Then enable it under Admin → Store Settings. Browser order notifications are separate: enable them in Store Settings, grant notification permission on the HTTPS site, and keep the admin dashboard open. The current implementation polls while the dashboard is open; it is not background push when the browser is closed.

## 7. Quick regression checklist

1. Create a draft product without variants; set base stock above zero; save; reopen and confirm it stayed.
2. Create a product with variants; set each variant's stock; save; confirm the displayed total is the sum of variants.
3. Duplicate a product and confirm its copied stock quantities; it remains a draft until you publish it.
4. Change an item quantity in Admin → Inventory and refresh after the save.
5. Add a group offer to the cart with its single bundle button; confirm all included products are added and the bundle discount appears at checkout.
6. Test email OTP with a non-admin test address after SMTP is configured.
7. Place a small test COD order and check the owner Gmail and Resend delivery logs.
8. Print one expanded order and confirm only the BLITZ invoice prints.
