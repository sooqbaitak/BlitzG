# Blitz Gaming product CSV import guide

Use **Admin → CSV Import/Export → Products → Download template** as the starting point. The importer maps columns by header name; keep every header spelled exactly as shown. Keeping the template order is recommended. Save as UTF-8 CSV. Exporting existing products first is a good way to see valid JSON formats.

## Product CSV columns

| Column | Required? | Details / allowed values |
|---|---|---|
| `sku` | Yes | Unique product SKU/model code. Used to match and update an existing product. |
| `slug` | Recommended | Unique URL slug, e.g. `havit-ms1038`. Can be left blank for a new product; one is generated from the name. |
| `nameEn` | Yes | Product name in English. |
| `nameAr` | No | Arabic product name; falls back to the English name if blank. Product/model names are kept as entered, not automatically translated. |
| `brand` | Yes | Brand display name, e.g. `Havit`. Existing brands are matched by name; missing brands are created. |
| `category` | Yes | Primary category **slug**, e.g. `gaming-mice`. Import categories first. |
| `price` | Yes | Regular price in ILS; a non-negative number. |
| `salePrice` | No | Promotional price in ILS. Leave blank for no sale; when supplied it must be lower than `price`. |
| `stock` | Yes for reliable inventory | Non-negative whole-number stock quantity. `0` means out of stock. The storefront displays availability, not the count. |
| `status` | No | `active`, `draft`, or `archived`. Blank keeps the existing status or defaults a new product to `draft`. |
| `tags` | No | Built-in tags separated by `|`: `featured`, `bestseller`, `new`, `deal`, `combo`, `popular`. Example: `featured|new`. |
| `descEn` | No | Full English description. |
| `descAr` | No | Full Arabic description. |
| `imageUrl` | No | Fallback single image URL or site path. Use a URL/path accessible to the deployed site. |
| `imagesJson` | Recommended for multiple images | JSON array of image URLs/paths in gallery order. Example: `[` followed by quoted URLs and `]`; use the template/export as the example. This supports several images per product. A CSV cannot contain actual image files. Upload files through the product editor or host them and include their URLs. |
| `specsJson` | No | JSON array of `{ "key": "Switch", "value": "Linear Red" }` objects. |
| `variantsJson` | No | JSON array; each variant object supports `id`, `label`, `priceDelta`, `stock`, `optionName`, `optionValue`, and `imageIndex`. Example: `[{"id":"black-wireless","label":"Black / Wireless","priceDelta":15,"stock":8,"optionName":"Color / Connection","optionValue":"Black / Wireless","imageIndex":1}]`. `priceDelta` can be positive or negative and is added to the base/sale price. `imageIndex` is zero-based: `0` is the first image in `imagesJson`, `1` the second, etc. Each variant needs a unique ID within that product. |
| `lowStockAt` | No | Non-negative integer used for the admin low-stock warning threshold. |
| `descHe` | No | Hebrew description. |
| `customTagsJson` | No | JSON array of custom tags created by you, e.g. `["Wireless","RGB","Office setup"]`. |
| `costPrice` | No | Optional unit acquisition cost in ILS, for admin-only estimated profit reporting. Leave blank when unknown. |
| `loyaltyPoints` | No | Optional whole number of loyalty points earned per purchased unit. Blank uses the store-wide default. `0` means no product-specific points. |
| `categoryIdsJson` | No | JSON array of **additional category slugs**, for categories/subcategories beyond the primary `category`. Example: `["wired-mice","streaming"]`. Import those categories first. Use `[]` to explicitly clear additional category assignments. |

## Import tips

1. Import or create categories and subcategories first, including their parent-child relationship. The `category` and `categoryIdsJson` fields use category **slugs**, not category names or internal IDs.
2. Import/create brands next if you want predictable brand naming. Product import can create a missing brand automatically.
3. Keep commas, quotes, and multi-line descriptions inside valid CSV quoting. For JSON fields, the easiest safe path is to download a template or export a sample and edit it in a spreadsheet app that correctly preserves CSV quoting.
4. Start with a few products, preview the import report, correct errors, and then import the full file.
5. Export the products after importing and compare the result to confirm categories, images, variants, costs, and loyalty settings were preserved.
6. To import images from a computer, use the product editor's image-upload control. CSV can store image URLs/paths and variant image indexes, but does not embed image bytes.
7. Do not put passwords, customer data, payment credentials, or other secrets in product CSV files.
