# Supabase scaling and data-preservation plan

## What this release keeps unchanged

BLITZ GAMING currently stores the shared catalogue/store configuration in the `data` JSONB document in `public.blitz_store_state`, with orders, customer profiles, private acquisition costs, payment attempts and other sensitive records in separate tables. The website's current read/write path depends on that JSON document.

This release deliberately keeps that active data contract unchanged. It does **not** drop, rename, recreate, truncate or automatically migrate your live product catalogue, settings, coupons, customers or orders. Replacing the JSON document with normalized product/category tables without a verified export and a staged application cutover could make existing admin features appear to lose data. That would defeat the main requirement of preserving your work.

## Improvements already applied

- Dynamic `sitemap.xml` reads active products, visible categories/brands and visible custom pages from the shared Supabase state when a public Supabase key is configured.
- `robots.txt` is served dynamically with the site's actual deployed origin and excludes private/admin routes.
- The storefront now uses clean URLs and keeps backward compatibility with older hash links.
- Existing row-level security, private product-cost storage, order snapshots and server-side checkout functions remain in place.
- Local v1 migration now preserves customized contacts and coupons instead of resetting them to seed defaults. An unreadable local snapshot is backed up before initialization can continue.

## When the catalogue becomes large

Do this as a separately reviewed migration, not as an untested deploy-time operation:

1. Export `blitz_store_state`, `blitz_orders`, `blitz_customer_profiles`, `blitz_product_costs`, `blitz_order_item_costs`, `blitz_coupon_redemptions` and `blitz_payment_attempts` from the live Supabase project. Also take a Supabase database backup.
2. Create normalized `products`, `categories`, `brands`, `product_variants`, `inventory_movements` and `store_settings` tables with primary keys and indexes for `slug`, `status`, `category_id`, `brand_id` and update timestamps.
3. Backfill from the JSON document inside a transaction and compare row counts, product IDs, SKUs, stock, prices, variants, image arrays, category assignments and localized text.
4. Add dual-write or a controlled change-log during a short maintenance window so admin changes are not lost while data is copied.
5. Switch the app to normalized reads only after verification, then test cart pricing and the `blitz_create_order` transaction against the normalized inventory source.
6. Keep the original JSON snapshot read-only for a rollback window. Do not drop it until a second backup and a verified rollback drill have passed.

This staged cutover needs the actual live Supabase schema and real catalogue size. It is intentionally not auto-applied by this source archive.
