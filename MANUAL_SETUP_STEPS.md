# BLITZ GAMING V2 — manual setup and safe-launch steps

Follow this in order. The project has been upgraded in place; you do **not** need to recreate the website, reset Supabase, or re-enter the features already built.

## 1. Make backups before changing anything

1. Keep your original `Blitz_Gaming_V2_Improved.zip` and previous `Blitz_Gaming_V2_Fixed.zip` somewhere safe.
2. Extract the new `Blitz_Gaming_V2_Upgraded.zip` into a **new folder**. Do not extract over the old project.
3. If the live website already uses Supabase, take a database backup in the Supabase dashboard before running any SQL. Also export the current `blitz_store_state` row and the order/customer/private-cost/payment tables. Never delete the current Supabase project as part of this upgrade.
4. If you have important local demo data in a browser, open the existing site on that browser and export products/orders from **Admin → CSV Tools**. For a complete local snapshot, open the browser's Developer Tools → Console and run:

```js
const raw = localStorage.getItem('blitz_db_v2') || localStorage.getItem('blitz_db_v1');
if (!raw) throw new Error('No BLITZ local database was found in this browser.');
const link = document.createElement('a');
link.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
link.download = 'blitz-gaming-local-backup.json';
document.body.appendChild(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(link.href), 1000);
```

Keep this JSON private: it may include customer/order details and local admin data. Do not upload it to a public repository.

## 2. Keep the correct project folder

The ZIP contains a `blitz_v2_work` folder. Open that folder. It should directly contain `package.json`, `src/`, `api/`, `supabase/`, `public/`, `vercel.json` and `.nvmrc`.

When using GitHub/Vercel, the contents of `blitz_v2_work` should be the repository/project root. If you upload the parent folder instead, set Vercel's Root Directory to `blitz_v2_work`.

## 3. Verify locally (recommended)

Install Node.js `24.22.2` (the version recorded in `.nvmrc`), open a terminal in the project root and run:

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Open the local URL shown by Vite. Test the homepage, product/category pages, add-to-cart, cart sharing, checkout display, and `/admin/login`.

The source package install could not be completed in the preparation environment because npm exited during the registry/cache step. Run these commands on your computer or let GitHub Actions/Vercel build it. Do not publish unless `npm run build` succeeds.

## 4. Put the project in GitHub without replacing your old repository history

If you already have a GitHub repository containing this site, **clone that repository first** and copy the upgraded project files into the clone, preserving its `.git` folder. Review the diff before committing. Do not delete the repository or create a force push.

For a brand-new repository only, open a terminal in this project root and run:

```bash
git init
git add .
git commit -m "Upgrade BLITZ GAMING V2 safely"
```

Create an empty GitHub repository, add the remote URL GitHub gives you, then:

```bash
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git branch -M main
git push -u origin main
```

Never commit `.env`, API keys, service-role/secret keys, customer backups or exported production data. The existing `.gitignore` is configured to exclude local env files and build output.

The included GitHub Actions workflow automatically runs `npm ci`, `npm run lint` and `npm run build` on pushes and pull requests. Fix a failed workflow before deploying.

## 5. Supabase — keep your existing project and data

- If you already have a configured Supabase project, keep using that same project and the same URL/keys. Do not create a new project just for this upgrade.
- If your current database already has the latest BLITZ schema and V2 optimization migration, do not run them again just because this archive changed frontend routes.
- If the live schema is behind, first take a backup and review `supabase/schema.sql`, `SUPABASE_V2_OPTIMIZATION_MIGRATION.sql` and the existing setup guide. Apply only the missing, reviewed migrations in Supabase SQL Editor. Do not run a `DROP`, `TRUNCATE`, reset, or table recreation operation against production.
- Keep the public storefront key as the browser publishable/anon key. Keep `SUPABASE_SECRET_KEY` or the legacy service-role key server-side only.
- Keep your existing admin user and `app_metadata.role = admin`; do not create a new admin unless you need one.

The current site data contract is intentionally preserved. Do not manually create a new normalized products schema or cut the app over to it yet; follow `SUPABASE_SCALING_AND_DATA_PRESERVATION.md` for a future staged migration.

## 6. Vercel environment variables

In Vercel → your existing project → **Settings → Environment Variables**, keep/update these values. Apply the `VITE_` values to Production, Preview and Development only as appropriate. Do not place secrets in a `VITE_` variable.

**Browser/build variables**

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Existing Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Existing `sb_publishable_...` key (or legacy `VITE_SUPABASE_ANON_KEY`) |

**Server-only variables**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Same Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Supabase `sb_secret_...` key (or legacy `SUPABASE_SERVICE_ROLE_KEY`) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or legacy `SUPABASE_ANON_KEY`) |
| `SITE_URL` | Your actual public HTTPS domain, e.g. `https://shop.example.com` |
| `RATE_LIMIT_SECRET` | Optional long random secret for public order-tracking rate limiting |

**Only when those services are configured**

| Variable | Purpose |
|---|---|
| `LAHZA_SECRET_KEY` | Lahza hosted-card checkout; start with an approved test key |
| `RESEND_API_KEY` | Order/customer email notifications |
| `ORDER_EMAIL_FROM` | Sender address verified in Resend |

Use the same existing values where already configured. After changing any environment variables, redeploy because Vite reads `VITE_*` values at build time.

## 7. Vercel deployment settings

In Vercel → Project → Settings → Build and Deployment:

- Framework preset: **Vite**
- Root Directory: repository root (or `blitz_v2_work` if the repository contains the parent folder)
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

The included `vercel.json` has clean-route rewrites and the serverless `/sitemap.xml` and `/robots.txt` endpoints. Do not remove it. After deployment, test these URLs directly:

- `https://YOUR-DOMAIN/`
- `https://YOUR-DOMAIN/product/one-existing-active-product-slug`
- `https://YOUR-DOMAIN/admin/login`
- `https://YOUR-DOMAIN/sitemap.xml`
- `https://YOUR-DOMAIN/robots.txt`

Also test an old link such as `https://YOUR-DOMAIN/#/product/one-existing-active-product-slug`; it should convert to the clean product URL.

## 8. Product content and images (manual work with your real inventory)

Do not replace your real products with the sample seed products in `src/lib/data.ts`. In the live cloud store, edit the existing products through **Admin → Products** or export/edit/import them through **Admin → CSV Tools**.

For every sellable product, verify:

- Exact manufacturer/model and SKU.
- Actual photos of the item; use clear, well-lit photos from multiple angles. Avoid generic category images as the main product image.
- Correct English/Arabic names and descriptions, plus Hebrew descriptions if you publish Hebrew.
- Accurate specifications, included accessories, variant options and variant-level stock.
- Price and sale price in ILS; never publish a guessed price or stock quantity.
- Warranty, return eligibility and delivery conditions match the actual store policy.

Archive sample/demo entries rather than deleting them until you confirm none is part of your live catalogue. Keep a CSV export before bulk import and inspect the import validation report.

Also review the homepage hero slides, category banners, store logo/favicon and custom policy pages. Replace any generic image only with a real, appropriately licensed product/store image. Update Delivery & Returns and FAQ with your final warranty, exchange, refund and delivery-time policy before accepting online orders.

## 9. Payment and notifications — activate only after tests

- Cash on Delivery remains the default working method.
- Bank transfer is manual. Enter verified account details in **Admin → Store Settings**; mark orders paid only after the transfer is actually received.
- Card checkout remains dependent on Lahza merchant approval and a server-side test secret. First test a sandbox transaction, the return callback and the payment webhook. Only then request/activate live credentials.
- PayPal, Apple Pay and Google Pay are not implemented payment integrations in this project. Keep them disabled; an admin display switch cannot create a gateway integration.
- Resend requires a verified sender/domain and the server variables above. Supabase email OTP needs custom SMTP; phone OTP needs an SMS provider that supports your intended Palestinian mobile destinations.

## 10. Test before going live

Use two separate devices/browsers:

- Sign in as admin and change a harmless test product field. Confirm it appears on the second device.
- Place a small COD test order. Confirm it appears in the admin dashboard, order number, inventory and customer-facing tracking response.
- Test an invalid phone/order combination; it must not reveal order details.
- Test a coupon at minimum subtotal, expiry and usage-limit boundaries.
- Test variants and out-of-stock products; checkout must reject unavailable quantities.
- Test Arabic RTL, English LTR and Hebrew RTL on mobile and desktop.
- Test the old hash URL redirect and clean URLs after a hard refresh.
- Check browser console/network logs, mobile image/video loading, keyboard navigation and form labels.
- Run Lighthouse on the deployed homepage and at least one product detail page; record mobile Performance, Accessibility, Best Practices and SEO scores. The source review cannot substitute for those real measurements.

## 11. Search indexing

After deployment, open `/robots.txt` and `/sitemap.xml` in a browser. Submit the sitemap URL in Google Search Console for your verified domain. Inspect a product URL and a category URL after Google has recrawled them. Clean URLs and metadata are in place, but indexing/ranking is controlled by search engines; server-rendered social previews still need a future prerender/SSR layer.

## 12. Rollback

If anything unexpected happens, redeploy the previous known-good Vercel deployment or restore the copied source folder. Because this upgrade does not rewrite the live Supabase schema or delete live rows, the previous frontend can continue using the existing database. If any database SQL was separately applied, use the Supabase backup/restore process and do not attempt a manual table reset.
