# Blitz Gaming — Latest Storefront Customizations

This package includes the latest requested changes, built on the previous Blitz Gaming source project.

## Changes in this revision

- Public storefront shows **In stock / Out of stock** rather than exposing numeric inventory counts. Products with variants default to an available variant when possible; a selected variant with zero stock shows out of stock.
- Product variants support custom labels, option names/values, per-variant stock, additive positive/negative ILS price adjustments, and linking to a gallery image by zero-based image index. Product cards and product details now show adjusted pricing consistently; opening a product selects the first available variant and its linked image where applicable.
- Products may belong to a primary category plus additional categories/subcategories. Category listings include assigned products, and category-scoped coupon checks account for multiple category assignments and ancestors.
- Announcement strip supports multiple localized, ordered/active slots, optional links, font size/weight, text/background/border colors, motion speed, pause-on-hover and optional icon.
- Storefront text editing includes common UI labels in English/Arabic/Hebrew, homepage copy/images and footer text. Product/category/page editors continue to manage their respective content.
- Admin interface supports English/Arabic/Hebrew and a Day/Night theme toggle; Night remains the default. Featured products are selected through a searchable product picker.
- Product CSV documentation and a matching example import CSV are included. The admin’s built-in template remains the source of truth for the current importer headers.

## Product CSV files

- `PRODUCT_CSV_GUIDE.md` explains every column and the JSON fields for images, specifications, variants, custom tags and additional categories.
- `PRODUCT_IMPORT_TEMPLATE.csv` provides the current header order and one clearly marked draft example row. Replace the sample row with your real product data, use existing category slugs, and keep status `draft` until verified.

## Verification

- TypeScript/TSX syntax-transpilation check: **53 files checked; 0 syntax errors** after this revision.
- Full Vite production build: **not verified** in this environment because npm dependency installation cannot complete while `registry.npmjs.org` is unreachable. Type-level and integration/build errors may still be revealed after installing the dependencies in a network-enabled environment.

## Before launch

1. Install dependencies on a network-enabled machine (`npm ci`) and run `npm run build`.
2. Configure Supabase and run the current `supabase/schema.sql`, including any schema changes documented in the deployment guide.
3. Configure Netlify environment variables and email sender credentials before accepting real orders.
4. Replace demo products/prices/stock with verified inventory. Test product variants, multiple category assignment, coupon eligibility, theme/language, announcements and CSV import/export before launch.
