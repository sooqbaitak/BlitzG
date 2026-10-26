// BLITZ GAMING — admin: CSV import/export center with data dictionary
import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, BookOpen, CheckCircle2, AlertTriangle, Package, Boxes, TicketPercent, ShoppingBag, Users } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { toCsv, parseCsv, downloadFile } from '../lib/db';
import { Button, SectionTitle } from '../components/ui';
import type { Coupon, Category, Brand, Order, OrderItem, ProductVariant } from '../lib/types';

interface CsvSpec {
  id: string;
  icon: typeof Package;
  en: string;
  ar: string;
  headers: string[];
  sample: string[][];
  dictionary: { col: string; descEn: string; descAr: string }[];
  exportRows: () => string[][];
  import: (rows: string[][]) => { ok: number; errors: string[] };
}

export function CsvTools() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [report, setReport] = useState<{ spec: string; ok: number; errors: string[] } | null>(null);

  const specs: CsvSpec[] = [
    {
      id: 'products', icon: Package, en: 'Products', ar: 'المنتجات',
      headers: ['sku', 'slug', 'nameEn', 'nameAr', 'brand', 'category', 'price', 'salePrice', 'stock', 'status', 'tags', 'descEn', 'descAr', 'imageUrl', 'imagesJson', 'specsJson', 'variantsJson', 'lowStockAt', 'descHe', 'customTagsJson', 'costPrice', 'loyaltyPoints', 'categoryIdsJson'],
      sample: [['BZ-NEW-0001', 'blitz-example-pro', 'BLITZ Example Pro', 'بلتز مثال برو', 'Razer', 'keyboards', '499', '399', '25', 'draft', 'new', 'Full description EN', 'الوصف الكامل بالعربية', '/img/keyboard.jpg', '["/img/keyboard.jpg"]', '[{"key":"Switch","value":"Linear"}]', '[{"id":"var-black","label":"Black","priceDelta":0,"stock":25,"optionName":"Color","optionValue":"Black","imageIndex":0}]', '5', 'תיאור לדוגמה', '["featured"]', '250', '4', '[]']],
      dictionary: [
        { col: 'sku', descEn: 'Unique product code (required)', descAr: 'رمز المنتج الفريد (مطلوب)' },
        { col: 'slug', descEn: 'URL handle — lowercase, hyphens', descAr: 'رابط المنتج — حروف صغيرة وشرطات' },
        { col: 'brand', descEn: 'Brand NAME as shown (created if missing)', descAr: 'اسم الماركة كما يظهر (تُنشأ إن لم توجد)' },
        { col: 'category', descEn: 'Category slug, e.g. keyboards', descAr: 'slug الفئة مثلاً keyboards' },
        { col: 'price / salePrice', descEn: 'ILS numbers; empty salePrice = no discount', descAr: 'أرقام بالشيكل؛ سعر العرض الفارغ = بلا خصم' },
        { col: 'stock', descEn: 'Integer units on hand', descAr: 'عدد القطع المتوفرة' },
        { col: 'status', descEn: 'active | draft | archived', descAr: 'active منشور · draft مسودة · archived مؤرشف' },
        { col: 'tags', descEn: 'Pipe-separated: featured|bestseller|new|deal|combo|popular', descAr: 'مفصولة بـ |: featured|bestseller|new|deal|combo|popular' },
        { col: 'imagesJson', descEn: 'JSON array of image paths/URLs; imageUrl remains a fallback', descAr: 'مصفوفة JSON لمسارات/روابط الصور؛ imageUrl بديل احتياطي' },
        { col: 'specsJson / variantsJson', descEn: 'Valid JSON arrays; use exported examples as the schema', descAr: 'مصفوفات JSON صحيحة؛ استخدم أمثلة التصدير لمعرفة البنية' },
        { col: 'lowStockAt', descEn: 'Optional low-stock warning threshold', descAr: 'حد تنبيه انخفاض المخزون (اختياري)' },
        { col: 'costPrice', descEn: 'Optional confidential acquisition cost in ILS; only admins can read it in cloud mode', descAr: 'سعر التكلفة بالشيكل (اختياري؛ خاص بالإدارة في وضع السحابة)' },
        { col: 'loyaltyPoints', descEn: 'Optional points awarded per purchased unit; blank uses the store default', descAr: 'نقاط الولاء لكل قطعة (اختياري؛ الفارغ يستخدم افتراضي المتجر)' },
        { col: 'categoryIdsJson', descEn: 'Optional JSON array of additional category slugs, including subcategories; example [\"wired-mice\",\"gaming\"]', descAr: 'مصفوفة JSON اختيارية لروابط الفئات الإضافية والفرعية، مثال [\"wired-mice\"]' },
        { col: 'variantsJson', descEn: 'Array of variants: id, label, priceDelta (can be negative), stock, optionName, optionValue, imageIndex (zero-based gallery index)', descAr: 'مصفوفة الخيارات: المعرّف والاسم وتعديل السعر (قد يكون سالباً) والمخزون واسم/قيمة الخيار ورقم الصورة يبدأ من صفر' },
      ],
      exportRows: () => db.products.map((p) => [p.sku, p.slug, p.nameEn, p.nameAr, db.brands.find((b) => b.id === p.brandId)?.name ?? '', db.categories.find((c) => c.id === p.categoryId)?.slug ?? '', String(p.price), p.salePrice === null ? '' : String(p.salePrice), String(p.stock), p.status, p.tags.join('|'), p.descEn, p.descAr, p.images[0] ?? '', JSON.stringify(p.images ?? []), JSON.stringify(p.specs ?? []), JSON.stringify(p.variants ?? []), p.lowStockAt === undefined ? '' : String(p.lowStockAt), p.descHe ?? '', JSON.stringify(p.customTags ?? []), p.costPrice === undefined || p.costPrice === null ? '' : String(p.costPrice), p.loyaltyPoints === undefined ? '' : String(p.loyaltyPoints), JSON.stringify((p.categoryIds ?? []).filter((id) => id !== p.categoryId).map((id) => db.categories.find((c) => c.id === id)?.slug).filter((slug): slug is string => Boolean(slug)))]),
      import: (rows) => {
        let ok = 0; const errors: string[] = [];
        setDb((d) => {
          const next = { ...d, products: [...d.products], brands: [...d.brands], categories: [...d.categories] };
          rows.forEach((r, i) => {
            const [sku, slug, nameEn, nameAr, brand, category, price, salePrice, stock, status, tags, descEn, descAr, imageUrl, imagesJson, specsJson, variantsJson, lowStockAt, descHe, customTagsJson, costPrice, loyaltyPoints, categoryIdsJson] = r;
            if (!sku || !nameEn) { errors.push(`Row ${i + 2}: sku & nameEn required`); return; }
            if (!brand?.trim()) { errors.push(`Row ${i + 2}: brand is required`); return; }
            if (price === '' || !Number.isFinite(Number(price)) || Number(price) < 0) { errors.push(`Row ${i + 2}: price must be a non-negative number`); return; }
            if (salePrice !== '' && salePrice !== undefined && (!Number.isFinite(Number(salePrice)) || Number(salePrice) < 0 || Number(salePrice) >= Number(price))) { errors.push(`Row ${i + 2}: salePrice must be non-negative and lower than price`); return; }
            if (stock !== '' && stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) { errors.push(`Row ${i + 2}: stock must be a non-negative integer`); return; }
            if (lowStockAt !== '' && lowStockAt !== undefined && (!Number.isInteger(Number(lowStockAt)) || Number(lowStockAt) < 0)) { errors.push(`Row ${i + 2}: lowStockAt must be a non-negative integer`); return; }
            if (costPrice !== '' && costPrice !== undefined && (!Number.isFinite(Number(costPrice)) || Number(costPrice) < 0)) { errors.push(`Row ${i + 2}: costPrice must be a non-negative number`); return; }
            if (loyaltyPoints !== '' && loyaltyPoints !== undefined && (!Number.isInteger(Number(loyaltyPoints)) || Number(loyaltyPoints) < 0)) { errors.push(`Row ${i + 2}: loyaltyPoints must be a non-negative integer`); return; }
            if (status && !['active', 'draft', 'archived'].includes(status)) { errors.push(`Row ${i + 2}: status must be active, draft or archived`); return; }
            const categoryEntry = next.categories.find((c) => c.slug.toLowerCase() === (category || '').toLowerCase());
            if (!categoryEntry) { errors.push(`Row ${i + 2}: category slug "${category}" not found`); return; }
            let parsedImages: string[] | undefined;
            let parsedSpecs: { key: string; value: string }[] | undefined;
            let parsedVariants: ProductVariant[] | undefined;
            let parsedCustomTags: string[] | undefined;
            let parsedCategorySlugs: string[] | undefined;
            try { if (imagesJson) parsedImages = JSON.parse(imagesJson); if (specsJson) parsedSpecs = JSON.parse(specsJson); if (variantsJson) parsedVariants = JSON.parse(variantsJson); if (customTagsJson) parsedCustomTags = JSON.parse(customTagsJson); if (categoryIdsJson !== undefined && categoryIdsJson !== '') parsedCategorySlugs = JSON.parse(categoryIdsJson); }
            catch { errors.push(`Row ${i + 2}: imagesJson/specsJson/variantsJson/customTagsJson/categoryIdsJson must contain valid JSON`); return; }
            if (parsedImages && (!Array.isArray(parsedImages) || parsedImages.some((x) => typeof x !== 'string'))) { errors.push(`Row ${i + 2}: imagesJson must be a JSON array of strings`); return; }
            if (parsedSpecs && (!Array.isArray(parsedSpecs) || parsedSpecs.some((x) => !x || typeof x.key !== 'string' || typeof x.value !== 'string'))) { errors.push(`Row ${i + 2}: specsJson must be an array of {key,value} objects`); return; }
            if (parsedVariants && (!Array.isArray(parsedVariants) || parsedVariants.some((x) => !x || typeof x.id !== 'string' || typeof x.label !== 'string' || !Number.isFinite(Number(x.priceDelta)) || !Number.isInteger(Number(x.stock)) || Number(x.stock) < 0 || (x.imageIndex !== undefined && (!Number.isInteger(Number(x.imageIndex)) || Number(x.imageIndex) < 0)) || (x.optionName !== undefined && typeof x.optionName !== 'string') || (x.optionValue !== undefined && typeof x.optionValue !== 'string')))) { errors.push(`Row ${i + 2}: variantsJson needs id, label, numeric priceDelta (positive or negative), non-negative integer stock and valid optional image/option fields`); return; }
            if (parsedCustomTags && (!Array.isArray(parsedCustomTags) || parsedCustomTags.some((x) => typeof x !== 'string'))) { errors.push(`Row ${i + 2}: customTagsJson must be a JSON array of strings`); return; }
            if (parsedCategorySlugs && (!Array.isArray(parsedCategorySlugs) || parsedCategorySlugs.some((x) => typeof x !== 'string'))) { errors.push(`Row ${i + 2}: categoryIdsJson must be a JSON array of category slugs`); return; }
            if (parsedCategorySlugs && parsedCategorySlugs.some((slugValue) => !next.categories.some((c) => c.slug.toLowerCase() === slugValue.toLowerCase()))) { errors.push(`Row ${i + 2}: one or more categoryIdsJson slugs do not exist; import categories first`); return; }
            let brandId = next.brands.find((b) => b.name.toLowerCase() === (brand || '').toLowerCase())?.id;
            if (!brandId && brand) { brandId = `b-${Date.now()}-${i}`; next.brands.push({ id: brandId, slug: brand.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: brand, visible: true, featured: false }); }
            const catId = categoryEntry.id;
            const existing = next.products.findIndex((p) => p.sku === sku);
            const effectiveImageCount = parsedImages?.length || (imageUrl ? 1 : existing >= 0 ? next.products[existing].images.length : 1);
            if (parsedVariants?.some((variant) => variant.imageIndex !== undefined && variant.imageIndex >= effectiveImageCount)) { errors.push(`Row ${i + 2}: variant imageIndex must match an image in the product gallery (zero-based)`); return; }
            const extraCategoryIds = parsedCategorySlugs?.map((slugValue) => next.categories.find((c) => c.slug.toLowerCase() === slugValue.toLowerCase())!.id);
            const product = {
              ...(existing >= 0 ? next.products[existing] : {
                id: `p-${Date.now()}-${i}`, slug: (slug || nameEn).toLowerCase().replace(/[^a-z0-9]+/g, '-'), rating: 0, sold: 0, specs: [], variants: [], images: imageUrl ? [imageUrl] : ['/img/keyboard.jpg'], createdAt: new Date().toISOString(),
              }),
              sku, nameEn, nameAr: nameAr || nameEn,
              brandId: brandId ?? next.brands[0].id,
              categoryId: catId,
              categoryIds: [...new Set([catId, ...(extraCategoryIds ?? (existing >= 0 ? (next.products[existing].categoryIds ?? []).filter((id) => id !== next.products[existing].categoryId) : []))])],
              price: Number(price),
              salePrice: salePrice === '' || salePrice === undefined ? null : Number(salePrice),
              stock: stock === '' || stock === undefined ? (existing >= 0 ? next.products[existing].stock : 0) : Number(stock),
              status: status ? status as 'active' | 'draft' | 'archived' : (existing >= 0 ? next.products[existing].status : 'draft'),
              tags: (tags ? String(tags).split('|').filter((t) => ['featured', 'bestseller', 'new', 'deal', 'combo', 'popular'].includes(t)) : []) as never[],
              descEn: descEn || '', descAr: descAr || nameAr || nameEn, descHe: descHe || (existing >= 0 ? next.products[existing].descHe : ''),
              customTags: parsedCustomTags ?? (existing >= 0 ? next.products[existing].customTags ?? [] : []),
              images: parsedImages?.length ? parsedImages : imageUrl ? [imageUrl] : existing >= 0 ? next.products[existing].images : ['/img/keyboard.jpg'],
              specs: parsedSpecs ?? (existing >= 0 ? next.products[existing].specs : []),
              variants: parsedVariants ?? (existing >= 0 ? next.products[existing].variants : []),
              lowStockAt: lowStockAt === '' || lowStockAt === undefined ? (existing >= 0 ? next.products[existing].lowStockAt : undefined) : Math.max(0, Number(lowStockAt)),
              costPrice: costPrice === '' || costPrice === undefined ? (existing >= 0 ? next.products[existing].costPrice : undefined) : Math.max(0, Number(costPrice)),
              loyaltyPoints: loyaltyPoints === '' || loyaltyPoints === undefined ? (existing >= 0 ? next.products[existing].loyaltyPoints : undefined) : Math.max(0, Math.floor(Number(loyaltyPoints))),
            };
            if (existing >= 0) next.products[existing] = product as never; else next.products.unshift(product as never);
            ok++;
          });
          return next;
        });
        return { ok, errors };
      },
    },
    {
      id: 'categories', icon: Package, en: 'Categories', ar: 'الفئات',
      headers: ['slug', 'nameEn', 'nameAr', 'parentSlug', 'imageUrl', 'order', 'visible', 'featured', 'nameHe'],
      sample: [['keyboards', 'Keyboards', 'لوحات مفاتيح', '', '/img/keyboard.jpg', '1', 'true', 'true', 'מקלדות']],
      dictionary: [
        { col: 'slug', descEn: 'Unique category URL slug; used for matching/updating', descAr: 'رابط فئة فريد يُستخدم للمطابقة والتحديث' },
        { col: 'parentSlug', descEn: 'Optional parent category slug; blank means top-level', descAr: 'رابط الفئة الأب اختياري؛ اتركه فارغاً للفئة الرئيسية' },
        { col: 'imageUrl', descEn: 'Image path or URL', descAr: 'مسار الصورة أو رابطها' },
        { col: 'visible / featured', descEn: 'true/false, 1/0 or yes/no', descAr: 'true/false أو 1/0 أو yes/no' },
      ],
      exportRows: () => db.categories.map((c) => [c.slug, c.nameEn, c.nameAr, db.categories.find((parent) => parent.id === c.parentId)?.slug ?? '', c.image ?? '', String(c.order), String(c.visible), String(c.featured), c.nameHe ?? '']),
      import: (rows) => {
        let ok = 0; const errors: string[] = [];
        setDb((d) => {
          const categories = [...d.categories];
          rows.forEach((r, i) => {
            const [slugRaw, nameEn, nameAr, parentSlug, imageUrl, order, visible, featured, nameHe] = r;
            const slug = slugRaw.trim().toLowerCase();
            if (!slug || !nameEn.trim()) { errors.push(`Row ${i + 2}: slug and nameEn are required`); return; }
            const existingIndex = categories.findIndex((c) => c.slug.toLowerCase() === slug);
            const existing = existingIndex >= 0 ? categories[existingIndex] : undefined;
            let parentId: string | null = null;
            if (parentSlug?.trim()) {
              const parent = categories.find((c) => c.slug.toLowerCase() === parentSlug.trim().toLowerCase());
              if (!parent) { errors.push(`Row ${i + 2}: parentSlug "${parentSlug}" not found`); return; }
              if (existing && parent.id === existing.id) { errors.push(`Row ${i + 2}: a category cannot be its own parent`); return; }
              parentId = parent.id;
            }
            const nOrder = order.trim() === '' ? (existing?.order ?? categories.length + 1) : Number(order);
            if (!Number.isFinite(nOrder)) { errors.push(`Row ${i + 2}: order must be numeric`); return; }
            const asBool = (v: string | undefined, fallback: boolean) => v === undefined || v.trim() === '' ? fallback : ['true', '1', 'yes', 'y'].includes(v.trim().toLowerCase());
            const category: Category = { id: existing?.id ?? `c-csv-${Date.now()}-${i}`, slug, nameEn: nameEn.trim(), nameAr: nameAr.trim() || nameEn.trim(), nameHe: nameHe?.trim() || existing?.nameHe || nameEn.trim(), parentId, image: imageUrl.trim() || undefined, order: nOrder, visible: asBool(visible, true), featured: asBool(featured, true) };
            if (existingIndex >= 0) categories[existingIndex] = category; else categories.push(category);
            ok++;
          });
          return { ...d, categories };
        });
        return { ok, errors };
      },
    },
    {
      id: 'brands', icon: Package, en: 'Brands', ar: 'الماركات',
      headers: ['slug', 'name', 'visible', 'featured'],
      sample: [['havit', 'Havit', 'true', 'true']],
      dictionary: [
        { col: 'slug', descEn: 'Unique brand slug; used for matching/updating', descAr: 'رابط ماركة فريد للمطابقة والتحديث' },
        { col: 'name', descEn: 'Brand display name', descAr: 'اسم الماركة الظاهر' },
        { col: 'visible / featured', descEn: 'true/false, 1/0 or yes/no', descAr: 'true/false أو 1/0 أو yes/no' },
      ],
      exportRows: () => db.brands.map((b) => [b.slug, b.name, String(b.visible), String(b.featured)]),
      import: (rows) => {
        let ok = 0; const errors: string[] = [];
        setDb((d) => {
          const brands = [...d.brands];
          rows.forEach((r, i) => {
            const [slugRaw, nameRaw, visible, featured] = r;
            const slug = slugRaw.trim().toLowerCase(); const name = nameRaw.trim();
            if (!slug || !name) { errors.push(`Row ${i + 2}: slug and name are required`); return; }
            const existingIndex = brands.findIndex((b) => b.slug.toLowerCase() === slug);
            const existing = existingIndex >= 0 ? brands[existingIndex] : undefined;
            const asBool = (v: string | undefined, fallback: boolean) => v === undefined || v.trim() === '' ? fallback : ['true', '1', 'yes', 'y'].includes(v.trim().toLowerCase());
            const brand: Brand = { id: existing?.id ?? `b-csv-${Date.now()}-${i}`, slug, name, visible: asBool(visible, true), featured: asBool(featured, false) };
            if (existingIndex >= 0) brands[existingIndex] = brand; else brands.push(brand);
            ok++;
          });
          return { ...d, brands };
        });
        return { ok, errors };
      },
    },
    {
      id: 'inventory', icon: Boxes, en: 'Inventory', ar: 'المخزون',
      headers: ['sku', 'variantId', 'variantLabel', 'stock', 'price', 'salePrice'],
      sample: [['BZ-KB-1001', '', '', '24', '749', '649'], ['BZ-HS-3002', 'v-blk', 'Black', '33', '', '']],
      dictionary: [
        { col: 'sku', descEn: 'Existing product SKU (required)', descAr: 'SKU المنتج الموجود (مطلوب)' },
        { col: 'variantId / variantLabel', descEn: 'Leave both blank for product stock; set variantId (preferred) or exact variantLabel to update a variant', descAr: 'اتركهما فارغين لمخزون المنتج؛ حدّد variantId (أفضل) أو اسم الخيار المطابق لتحديث خيار' },
        { col: 'stock', descEn: 'New absolute stock count; must be a non-negative integer', descAr: 'العدد النهائي للمخزون؛ عدد صحيح غير سالب' },
        { col: 'price / salePrice', descEn: 'Optional product-level price updates only; blank means unchanged, use __CLEAR__ to remove a sale price', descAr: 'تحديث السعر على مستوى المنتج فقط؛ الفارغ يعني بلا تغيير، واستخدم __CLEAR__ لإزالة سعر العرض' },
      ],
      exportRows: () => db.products.flatMap((p) => [
        [p.sku, '', '', String(p.stock), String(p.price), p.salePrice === null ? '' : String(p.salePrice)],
        ...p.variants.map((v) => [p.sku, v.id, v.label, String(v.stock), '', '']),
      ]),
      import: (rows) => {
        let ok = 0; const errors: string[] = [];
        setDb((d) => {
          const products = d.products.map((p) => ({ ...p, variants: [...p.variants] }));
          rows.forEach((r, i) => {
            const [sku, variantId, variantLabel, stock, price, salePrice] = r;
            const target = products.find((p) => p.sku === sku);
            if (!target) { errors.push(`Row ${i + 2}: SKU ${sku} not found`); return; }
            if (stock !== '' && stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) { errors.push(`Row ${i + 2}: stock must be a non-negative integer`); return; }
            const hasVariant = Boolean((variantId ?? '').trim() || (variantLabel ?? '').trim());
            if (hasVariant) {
              const variantIndex = target.variants.findIndex((v) => (variantId ?? '').trim() ? v.id === variantId.trim() : v.label.toLowerCase() === variantLabel.trim().toLowerCase());
              if (variantIndex < 0) { errors.push(`Row ${i + 2}: variant ${variantId || variantLabel} not found for SKU ${sku}`); return; }
              if ((price !== '' && price !== undefined) || (salePrice !== '' && salePrice !== undefined)) { errors.push(`Row ${i + 2}: price and salePrice must be blank on variant rows`); return; }
              if (stock !== '' && stock !== undefined) target.variants[variantIndex] = { ...target.variants[variantIndex], stock: Number(stock) };
            } else {
              if (price !== '' && price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) { errors.push(`Row ${i + 2}: price must be non-negative`); return; }
              if (salePrice !== '' && salePrice !== undefined && salePrice !== '__CLEAR__' && (!Number.isFinite(Number(salePrice)) || Number(salePrice) < 0 || (price !== '' && Number(salePrice) >= Number(price)) || (price === '' && Number(salePrice) >= target.price))) { errors.push(`Row ${i + 2}: salePrice must be non-negative and lower than the effective product price`); return; }
              if (stock !== '' && stock !== undefined) target.stock = Number(stock);
              if (price !== '' && price !== undefined) target.price = Number(price);
              if (salePrice === '__CLEAR__') target.salePrice = null;
              else if (salePrice !== undefined && salePrice !== '') target.salePrice = Number(salePrice);
            }
            ok++;
          });
          return { ...d, products };
        });
        return { ok, errors };
      },
    },
    {
      id: 'coupons', icon: TicketPercent, en: 'Coupons', ar: 'أكواد الخصم',
      headers: ['code', 'description', 'type', 'value', 'target', 'minSubtotal', 'startsAt', 'expiresAt', 'usageLimit', 'perCustomerLimit', 'active', 'category', 'pointsCost', 'productIdsJson', 'categoryIdsJson'],
      sample: [['BLITZVIP15', 'Sample 15% promotion — review before activating', 'percent', '15', 'products', '0', '2026-10-24', '2027-12-31', '', '', 'false', 'standard', '0', '[]', '[]']],
      dictionary: [
        { col: 'type', descEn: 'percent | fixed', descAr: 'percent للنسبة · fixed لمبلغ ثابت' },
        { col: 'target', descEn: 'products | delivery (delivery + value 0 = free delivery)', descAr: 'products المنتجات · delivery رسوم التوصيل (0 = مجاني)' },
        { col: 'usageLimit', descEn: 'Empty = unlimited', descAr: 'فارغ = بلا حد' },
        { col: 'active', descEn: 'true | false', descAr: 'true مفعّل · false موقوف' },
      ],
      exportRows: () => db.coupons.map((c) => [c.code, c.description, c.type, String(c.value), c.target, String(c.minSubtotal), c.startsAt, c.expiresAt, c.usageLimit === null ? '' : String(c.usageLimit), c.perCustomerLimit === null ? '' : String(c.perCustomerLimit), String(c.active), c.category ?? 'standard', String(c.pointsCost ?? 0), JSON.stringify(c.productIds ?? []), JSON.stringify(c.categoryIds ?? [])]),
      import: (rows) => {
        let ok = 0; const errors: string[] = [];
        setDb((d) => {
          const coupons = [...d.coupons];
          rows.forEach((r, i) => {
            const [code, description, type, value, target, minSubtotal, startsAt, expiresAt, usageLimit, perCustomerLimit, active, category, pointsCost, productIdsJson, categoryIdsJson] = r;
            if (!code?.trim()) { errors.push(`Row ${i + 2}: code required`); return; }
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue) || numericValue < 0 || (type === 'percent' && numericValue > 100)) { errors.push(`Row ${i + 2}: discount must be non-negative${type === 'percent' ? ' and no more than 100%' : ''}`); return; }
            if (type && !['fixed', 'percent'].includes(type)) { errors.push(`Row ${i + 2}: type must be fixed or percent`); return; }
            if (target && !['products', 'delivery'].includes(target)) { errors.push(`Row ${i + 2}: target must be products or delivery`); return; }
            let productIds: string[] = []; let categoryIds: string[] = [];
            try { if (productIdsJson) productIds = JSON.parse(productIdsJson); if (categoryIdsJson) categoryIds = JSON.parse(categoryIdsJson); } catch { errors.push(`Row ${i + 2}: productIdsJson/categoryIdsJson must be JSON arrays`); return; }
            if (!Array.isArray(productIds) || productIds.some((x) => typeof x !== 'string') || !Array.isArray(categoryIds) || categoryIds.some((x) => typeof x !== 'string')) { errors.push(`Row ${i + 2}: coupon scope values must be arrays of IDs`); return; }
            if (category && !['standard', 'loyalty'].includes(category)) { errors.push(`Row ${i + 2}: category must be standard or loyalty`); return; }
            if (pointsCost !== '' && (!Number.isInteger(Number(pointsCost)) || Number(pointsCost) < 0)) { errors.push(`Row ${i + 2}: pointsCost must be a non-negative integer`); return; }
            const coupon: Coupon = {
              id: `cp-${Date.now()}-${i}`,
              code: code.trim().toUpperCase(),
              description: description || '',
              type: type === 'fixed' ? 'fixed' : 'percent',
              value: numericValue,
              target: target === 'delivery' ? 'delivery' : 'products',
              minSubtotal: Math.max(0, Number(minSubtotal) || 0),
              productIds, categoryIds, category: category === 'loyalty' ? 'loyalty' : 'standard', pointsCost: Math.max(0, Number(pointsCost) || 0),
              startsAt: startsAt || new Date().toISOString().slice(0, 10),
              expiresAt: expiresAt || '2027-12-31',
              usageLimit: usageLimit === '' || usageLimit === undefined ? null : Math.max(1, Number(usageLimit) || 1),
              perCustomerLimit: perCustomerLimit === '' || perCustomerLimit === undefined ? null : Math.max(1, Number(perCustomerLimit) || 1),
              usedCount: 0,
              active: active === 'true' || active === '1' || active === 'yes',
            };
            const idx = coupons.findIndex((c) => c.code.toUpperCase() === coupon.code);
            if (idx >= 0) coupons[idx] = { ...coupons[idx], ...coupon, usedCount: coupons[idx].usedCount }; else coupons.unshift(coupon);
            ok++;
          });
          return { ...d, coupons };
        });
        return { ok, errors };
      },
    },
    {
      id: 'orders', icon: ShoppingBag, en: 'Orders', ar: 'الطلبات',
      headers: ['id', 'number', 'createdAt', 'customerName', 'phone', 'email', 'area', 'city', 'address', 'notes', 'itemsJson', 'productSubtotal', 'discount', 'deliveryFee', 'total', 'couponCode', 'payment', 'status', 'areaName', 'buildPreference', 'userId', 'loyaltyPointsEarned'],
      sample: [],
      dictionary: [
        { col: 'number', descEn: 'Stable order number; used for upsert/matching', descAr: 'رقم الطلب الثابت للمطابقة والتحديث' },
        { col: 'area', descEn: 'westbank | jerusalem | inside48', descAr: 'westbank الضفة · jerusalem القدس · inside48 أراضي ١٩٤٨' },
        { col: 'itemsJson', descEn: 'JSON array of complete order lines. Export a real order first to see the exact structure.', descAr: 'مصفوفة JSON لبنود الطلب الكاملة. صدّر طلباً حقيقياً لرؤية البنية المطلوبة.' },
        { col: 'status', descEn: 'new | confirmed | shipped | delivered | cancelled', descAr: 'حالة الطلب' },
        { col: 'import policy', descEn: 'Imported orders are historical records and do not adjust stock or coupon usage.', descAr: 'الطلبات المستوردة سجلات تاريخية ولا تغيّر المخزون أو استخدام الكوبونات.' },
      ],
      exportRows: () => db.orders.map((o) => [o.id, o.number, o.createdAt, o.customerName, o.phone, o.email ?? '', o.area, o.city, o.address, o.notes ?? '', JSON.stringify(o.items), String(o.productSubtotal), String(o.discount), String(o.deliveryFee), String(o.total), o.couponCode ?? '', o.payment, o.status, o.areaName ?? '', o.buildPreference ?? '', o.userId ?? '', String(o.loyaltyPointsEarned ?? 0)]),
      import: (rows) => {
        let ok = 0; const errors: string[] = [];
        setDb((d) => {
          const orders = [...d.orders];
          rows.forEach((r, i) => {
            const [id, number, createdAt, customerName, phone, email, area, city, address, notes, itemsJson, productSubtotal, discount, deliveryFee, total, couponCode, payment, status, areaName, buildPreference, userId, loyaltyPointsEarned] = r;
            if (!number.trim() || !customerName.trim() || !phone.trim()) { errors.push(`Row ${i + 2}: number, customerName and phone are required`); return; }
            if (!['westbank', 'jerusalem', 'inside48'].includes(area) && !db.delivery.additionalAreas?.some((a) => a.id === area)) { errors.push(`Row ${i + 2}: area must be a known delivery area ID`); return; }
            if (!['new', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) { errors.push(`Row ${i + 2}: invalid order status`); return; }
            if (payment && payment !== 'cod') { errors.push(`Row ${i + 2}: payment must be cod in this version`); return; }
            let items: OrderItem[];
            try { items = JSON.parse(itemsJson) as OrderItem[]; }
            catch { errors.push(`Row ${i + 2}: itemsJson must be a valid JSON array`); return; }
            if (!Array.isArray(items) || items.length === 0 || items.some((item) => !item || typeof item.productId !== 'string' || typeof item.sku !== 'string' || typeof item.name !== 'string' || !Number.isInteger(Number(item.qty)) || Number(item.qty) < 1 || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0)) { errors.push(`Row ${i + 2}: itemsJson contains invalid order line data`); return; }
            const money = [productSubtotal, discount, deliveryFee, total].map(Number);
            if (money.some((n) => !Number.isFinite(n) || n < 0)) { errors.push(`Row ${i + 2}: totals must be non-negative numbers`); return; }
            const imported: Order = {
              id: id.trim() || `o-import-${Date.now()}-${i}`,
              number: number.trim(),
              createdAt: createdAt.trim() && !Number.isNaN(Date.parse(createdAt)) ? createdAt : new Date().toISOString(),
              customerName: customerName.trim(), phone: phone.trim(), email: email.trim() || undefined,
              area: area as Order['area'], areaName: areaName.trim() || undefined, buildPreference: buildPreference === 'assemble' || buildPreference === 'parts' ? buildPreference : undefined, userId: userId.trim() || undefined, loyaltyPointsEarned: Math.max(0, Number(loyaltyPointsEarned) || 0), city: city.trim(), address: address.trim(), notes: notes.trim() || undefined,
              items, productSubtotal: money[0], discount: money[1], deliveryFee: money[2], total: money[3],
              couponCode: couponCode.trim() || undefined, payment: 'cod', status: status as Order['status'],
            };
            const existingIndex = orders.findIndex((o) => o.number === imported.number);
            if (existingIndex >= 0) orders[existingIndex] = { ...orders[existingIndex], ...imported, id: orders[existingIndex].id };
            else orders.unshift(imported);
            ok++;
          });
          return { ...d, orders };
        });
        return { ok, errors };
      },
    },
    {
      id: 'customers', icon: Users, en: 'Customers', ar: 'الزبائن',
      headers: ['name', 'phone', 'email', 'orders', 'lifetimeValue', 'lastOrder'],
      sample: [],
      dictionary: [
        { col: 'name / phone', descEn: 'Derived from completed orders', descAr: 'يُشتق تلقائياً من الطلبات' },
        { col: 'lifetimeValue', descEn: 'Total ILS spent (all time)', descAr: 'إجمالي الإنفاق بالشيكل' },
      ],
      exportRows: () => {
        const map = new Map<string, { name: string; phone: string; email?: string; orders: number; total: number; last: string }>();
        for (const o of db.orders) {
          const key = o.phone.replace(/[\s-]/g, '');
          const cur = map.get(key);
          if (cur) { cur.orders++; cur.total += o.total; if (o.createdAt > cur.last) cur.last = o.createdAt; }
          else map.set(key, { name: o.customerName, phone: o.phone, email: o.email, orders: 1, total: o.total, last: o.createdAt });
        }
        return [...map.values()].map((c) => [c.name, c.phone, c.email ?? '', String(c.orders), String(c.total), c.last.slice(0, 10)]);
      },
      import: () => ({ ok: 0, errors: [ar ? 'سجل الزبائن يُبنى تلقائياً من الطلبات — التصدير فقط' : 'Customer registry is derived from orders — export only'] }),
    },
  ];

  const downloadTemplate = (spec: CsvSpec) => {
    downloadFile(`blitz-${spec.id}-template.csv`, toCsv(spec.headers, spec.sample.length ? spec.sample : [spec.headers.map(() => '')]));
  };
  const exportCsv = (spec: CsvSpec) => {
    downloadFile(`blitz-${spec.id}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(spec.headers, spec.exportRows()));
    toast('success', ar ? 'تم تنزيل الملف' : 'File downloaded');
  };
  const importCsv = (spec: CsvSpec, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''));
      if (rows.length < 2) { setReport({ spec: spec.id, ok: 0, errors: [ar ? 'الملف فارغ أو بلا صفوف بيانات' : 'File is empty or has no data rows'] }); return; }
      const header = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ''));
      const data = rows.slice(1).map((r) => spec.headers.map((h) => {
        const idx = header.findIndex((x) => x.toLowerCase() === h.toLowerCase());
        return idx >= 0 ? r[idx]?.trim() ?? '' : '';
      }));
      const result = spec.import(data);
      setReport({ spec: spec.id, ok: result.ok, errors: result.errors });
      if (result.ok > 0) toast('success', ar ? `تم استيراد ${result.ok} سجل` : `Imported ${result.ok} record(s)`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <SectionTitle sub={ar ? 'قوالب جاهزة لرفع منتجاتك ومخزونك وأكوادك دفعة واحدة — بدون خبرة تقنية' : 'Ready-made templates to bulk-load your catalog, stock and coupons — no technical skills needed'}>{ar ? 'استيراد / تصدير CSV' : 'CSV Import / Export'}</SectionTitle>

      {/* general mapping note */}
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-electric/30 bg-electric/5 p-4 text-[11px] leading-relaxed text-white/75">
        <BookOpen size={18} className="mt-0.5 shrink-0 text-electric" />
        <span>
          <strong className="text-electric">{ar ? 'كيف يعمل: ' : 'How it works: '}</strong>
          {ar ? 'نزّل القالب ← عدّله في Excel ← احفظه بصيغة UTF-8 CSV ← ارفعه هنا. تُطابق الأعمدة حسب الاسم. تُحدّث المنتجات حسب SKU والفئات/الماركات حسب slug والطلبات حسب رقم الطلب. راجع الملف واحتفظ بنسخة احتياطية قبل الاستيراد.' : 'Download a template → edit it in Excel → save as UTF-8 CSV → upload. Columns match by header name. Products update by SKU; categories and brands update by slug; orders upsert by order number. Validate each file and keep a backup before importing.'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {specs.map((spec) => {
          const Icon = spec.icon;
          return (
            <div key={spec.id} className="flex flex-col rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2.5 border-b border-line pb-3">
                <div className="rounded-xl border border-electric/30 bg-electric/10 p-2 text-electric"><Icon size={19} /></div>
                <div>
                  <h2 className="font-display text-[15px] font-bold uppercase text-white/90">{ar ? spec.ar : spec.en}</h2>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-mute">{spec.headers.length} {ar ? 'عمود' : 'columns'}</p>
                </div>
              </div>

              {/* dictionary */}
              <dl className="mt-2 max-h-36 space-y-1 overflow-y-auto text-[9.5px]">
                {spec.dictionary.map((d) => (
                  <div key={d.col} className="grid grid-cols-[72px_1fr] gap-2">
                    <dt className="font-mono font-bold text-electric/90">{d.col}</dt>
                    <dd className="text-mute">{ar ? d.descAr : d.descEn}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={() => downloadTemplate(spec)}><Download size={13} />{ar ? 'القالب' : 'Template'}</Button>
                <Button variant="outline" size="sm" onClick={() => exportCsv(spec)}><FileSpreadsheet size={13} />{ar ? 'تصدير' : 'Export'}</Button>
                <Button variant="primary" size="sm" onClick={() => fileRefs.current[spec.id]?.click()}><Upload size={13} />{ar ? 'استيراد CSV' : 'Import CSV'}</Button>
                <input
                  ref={(el) => { fileRefs.current[spec.id] = el; }}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(spec, f); e.target.value = ''; }}
                />
              </div>

              {report?.spec === spec.id && (
                <div className={`mt-2 rounded-xl border p-2.5 text-[10.5px] font-semibold ${report.errors.length ? 'border-amber-500/40 bg-amber-500/5 text-amber-300' : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'}`}>
                  <p className="flex items-center gap-1.5">{report.errors.length ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}{ar ? `تمت معالجة ${report.ok} سجل بنجاح` : `Processed ${report.ok} record(s) successfully`}</p>
                  {report.errors.map((err, i) => <p key={i} className="mt-1 ps-5 text-amber-400/90">{err}</p>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* column reference quick table */}
      <div className="mt-5 rounded-2xl border border-line bg-panel p-4">
        <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase text-white/85"><BookOpen size={15} className="text-violet-accent" />{ar ? 'مرجع الأعمدة الكامل' : 'Full Column Dictionary'}</h2>
        <div className="grid gap-x-6 gap-y-1 text-[10px] text-mute sm:grid-cols-2 lg:grid-cols-3">
          {specs.filter((s) => s.id === 'products' || s.id === 'coupons').flatMap((s) => s.dictionary).map((d, i) => <p key={i}><span className="font-mono font-bold text-electric/80">{d.col}</span> — {ar ? d.descAr : d.descEn}</p>)}
        </div>
      </div>
    </div>
  );
}
