// BLITZ GAMING — shop/catalog with search, filters, sorting, pagination
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, SearchX } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { ProductCard } from '../components/ProductCard';
import { fmtPrice } from '../lib/i18n';
import { categoryTreeIds, productMatchesCategoryTree, productIsAvailable } from '../lib/categories';
import { variantFacets, variantMatches } from '../lib/variants';

const PAGE_SIZE = 12;

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'popular' | 'newest' | 'discount';

export function Shop() {
  const { db, lang, t } = useApp();
  const [params, setParams] = useSearchParams();
  const ar = lang === 'ar';

  const q = params.get('q') ?? '';
  const catSlug = params.get('cat') ?? '';
  const brandSlug = params.get('brand') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = (params.get('sort') as SortKey) || 'featured';
  const inStockOnly = params.get('stock') === '1';
  const maxPrice = Number(params.get('max') ?? 0);
  const onSale = params.get('sale') === '1';
  const paramsKey = params.toString();
  const selectedVariantFilters = Object.fromEntries(Array.from(new URLSearchParams(paramsKey).entries()).filter(([key, value]) => key.startsWith('vf_') && value).map(([key, value]) => [key.slice(3), value]));

  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { setPage(1); }, [q, catSlug, brandSlug, tag, sort, inStockOnly, maxPrice, onSale]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key); else next.set(key, value);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const category = db.categories.find((c) => c.slug === catSlug);
  const categoryIds = useMemo(() => {
    if (!category) return null;
    return categoryTreeIds(db.categories, category.id);
  }, [category, db.categories]);

  const filtered = useMemo(() => {
    let list = db.products.filter((p) => p.status === 'active');
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((p) =>
        p.nameEn.toLowerCase().includes(needle) || p.nameAr.includes(q) ||
        p.sku.toLowerCase().includes(needle) ||
        (p.customTags ?? []).some((tagValue) => tagValue.toLowerCase().includes(needle)) ||
        p.specs.some((spec) => spec.key.toLowerCase().includes(needle) || spec.value.toLowerCase().includes(needle)) ||
        db.brands.find((b) => b.id === p.brandId)?.name.toLowerCase().includes(needle)
      );
    }
    if (categoryIds) list = list.filter((p) => productMatchesCategoryTree(p, categoryIds));
    if (brandSlug) {
      const brand = db.brands.find((b) => b.slug === brandSlug);
      if (brand) list = list.filter((p) => p.brandId === brand.id);
    }
    if (tag) list = list.filter((p) => p.tags.includes(tag as never));
    if (onSale) list = list.filter((p) => p.salePrice !== null && p.salePrice < p.price);
    if (inStockOnly) list = list.filter(productIsAvailable);
    if (maxPrice > 0) list = list.filter((p) => (p.salePrice ?? p.price) <= maxPrice);
    const selectedAttributes = Object.keys(selectedVariantFilters);
    if (selectedAttributes.length) list = list.filter((p) => p.variants.some((v) => variantMatches(v, selectedVariantFilters, lang)));

    switch (sort) {
      case 'price-asc': list = [...list].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price)); break;
      case 'price-desc': list = [...list].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price)); break;
      case 'popular': list = [...list].sort((a, b) => b.sold - a.sold); break;
      case 'newest': list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case 'discount': list = [...list].sort((a, b) => {
        const da = a.salePrice ? 1 - a.salePrice / a.price : 0, db2 = b.salePrice ? 1 - b.salePrice / b.price : 0;
        return db2 - da;
      }); break;
      default: list = [...list].sort((a, b) => Number(b.tags.includes('featured')) - Number(a.tags.includes('featured')));
    }
    return list;
  }, [db.products, db.brands, q, categoryIds, brandSlug, tag, onSale, inStockOnly, maxPrice, sort, paramsKey]);

  const variantFacetProducts = useMemo(() => {
    let list = db.products.filter((p) => p.status === 'active');
    if (q) { const needle = q.toLowerCase(); list = list.filter((p) => p.nameEn.toLowerCase().includes(needle) || p.nameAr.includes(q) || p.sku.toLowerCase().includes(needle) || (p.customTags ?? []).some((v) => v.toLowerCase().includes(needle)) || p.specs.some((spec) => spec.key.toLowerCase().includes(needle) || spec.value.toLowerCase().includes(needle)) || db.brands.find((b) => b.id === p.brandId)?.name.toLowerCase().includes(needle)); }
    if (categoryIds) list = list.filter((p) => productMatchesCategoryTree(p, categoryIds));
    if (brandSlug) { const brand = db.brands.find((b) => b.slug === brandSlug); if (brand) list = list.filter((p) => p.brandId === brand.id); }
    if (tag) list = list.filter((p) => p.tags.includes(tag as never));
    if (onSale) list = list.filter((p) => p.salePrice !== null && p.salePrice < p.price);
    if (inStockOnly) list = list.filter(productIsAvailable);
    if (maxPrice > 0) list = list.filter((p) => (p.salePrice ?? p.price) <= maxPrice);
    return list;
  }, [db.products, db.brands, q, categoryIds, brandSlug, tag, onSale, inStockOnly, maxPrice]);
  const dynamicVariantFacets = useMemo(() => variantFacets(variantFacetProducts.flatMap((p) => p.variants), lang), [variantFacetProducts, lang]);

  const shown = filtered.slice(0, page * PAGE_SIZE);
  const priceCeiling = Math.max(...db.products.map((p) => p.price));

  const title = q ? (ar ? `نتائج البحث عن “${q}”` : lang === 'he' ? `תוצאות חיפוש עבור “${q}”` : `Results for “${q}”`)
    : category ? (lang === 'ar' ? category.nameAr : lang === 'he' ? (category.nameHe || category.nameEn) : category.nameEn)
    : tag === 'featured' ? t('featured')
    : tag === 'new' ? t('new_arrivals')
    : tag === 'popular' ? t('popular')
    : onSale ? t('deals')
    : t('shop_all');

  const activeBrands = db.brands.filter((b) => b.visible);
  const subcategories = category ? db.categories.filter((c) => c.parentId === category.id && c.visible).sort((a, b) => a.order - b.order) : [];
  const categoryOptions = useMemo(() => {
    const result: { category: (typeof db.categories)[number]; depth: number }[] = [];
    const visited = new Set<string>();
    const walk = (parentId: string | null, depth: number) => {
      db.categories.filter((c) => c.parentId === parentId && c.visible).sort((a, b) => a.order - b.order).forEach((child) => {
        if (visited.has(child.id)) return;
        visited.add(child.id);
        result.push({ category: child, depth });
        walk(child.id, depth + 1);
      });
    };
    walk(null, 0);
    return result;
  }, [db.categories]);

  const filtersPanel = (
    <div className="space-y-5">
      {/* category */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-mute">{ar ? 'الفئة' : lang === 'he' ? 'קטגוריה' : 'Category'}</h3>
        <select value={catSlug} onChange={(e) => setParam('cat', e.target.value)} className="h-10 w-full rounded-xl border border-line bg-panel2 px-3 text-[12px] text-white outline-none focus:border-electric">
          <option value="">{ar ? 'كل الفئات' : lang === 'he' ? 'כל הקטגוריות' : 'All categories'}</option>
          {categoryOptions.map(({ category: c, depth }) => (
            <option key={c.id} value={c.slug}>{depth ? `${'— '.repeat(depth)}` : ''}{lang === 'ar' ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn}</option>
          ))}
        </select>
      </div>
      {/* brand */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-mute">{ar ? 'الماركة' : lang === 'he' ? 'מותג' : 'Brand'}</h3>
        <div className="flex max-h-44 flex-col gap-1 overflow-y-auto pe-1">
          {activeBrands.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-white/80 hover:bg-panel2">
              <input type="radio" name="brand" checked={brandSlug === b.slug} onChange={() => setParam('brand', brandSlug === b.slug ? null : b.slug)} className="accent-[#00a8ff]" />
              {b.name}
            </label>
          ))}
        </div>
      </div>
      {dynamicVariantFacets.length > 0 && <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-mute">{ar ? 'خيارات المنتج' : lang === 'he' ? 'אפשרויות מוצר' : 'Variant options'}</h3>
        {dynamicVariantFacets.map((facet) => <label key={facet.name} className="block text-[10px] font-bold text-white/80">{facet.name}<select value={selectedVariantFilters[facet.name] ?? ''} onChange={(e) => setParam(`vf_${facet.name}`, e.target.value || null)} className="mt-1 h-10 w-full rounded-xl border border-line bg-panel2 px-3 text-[11px] text-white outline-none focus:border-electric"><option value="">{ar ? 'كل الخيارات' : lang === 'he' ? 'כל האפשרויות' : `All ${facet.name}`}</option>{facet.values.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}
      </div>}
      {/* price */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-mute">{ar ? 'السعر حتى' : lang === 'he' ? 'מחיר מרבי' : 'Max price'}</h3>
        <input type="range" min={50} max={priceCeiling} step={50} value={maxPrice || priceCeiling} onChange={(e) => setParam('max', Number(e.target.value) >= priceCeiling ? null : e.target.value)} className="w-full accent-[#00a8ff]" />
        <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-white/70">
          <span>₪50</span>
          <span className="text-electric">{maxPrice ? `≤ ${fmtPrice(maxPrice, lang)}` : (ar ? 'الكل' : lang === 'he' ? 'כל המחירים' : 'All prices')}</span>
          <span>{fmtPrice(priceCeiling, lang)}</span>
        </div>
      </div>
      {/* toggles */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2.5 text-[12px] font-semibold text-white/85">
          {t('in_stock')}
          <input type="checkbox" className="h-4 w-4 accent-[#00a8ff]" checked={inStockOnly} onChange={(e) => setParam('stock', e.target.checked ? '1' : null)} />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2.5 text-[12px] font-semibold text-white/85">
          {ar ? 'التخفيضات فقط' : lang === 'he' ? 'במבצע בלבד' : 'On sale only'}
          <input type="checkbox" className="h-4 w-4 accent-[#00a8ff]" checked={onSale} onChange={(e) => setParam('sale', e.target.checked ? '1' : null)} />
        </label>
      </div>
      <button onClick={() => setParams({}, { replace: true })} className="w-full rounded-xl border border-line py-2.5 text-[11px] font-bold uppercase tracking-wider text-mute hover:border-red-500/50 hover:text-red-400">{t('clear_all')}</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4">
      {/* heading + sort bar */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-white">{title}</h1>
          <p className="mt-0.5 text-[11px] font-semibold text-mute">{filtered.length} {t('results')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen(true)} className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 text-[12px] font-bold text-white/90 lg:hidden">
            <SlidersHorizontal size={16} />{t('filters')}
          </button>
          <div className="relative">
            <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="h-10 appearance-none rounded-xl border border-line bg-panel2 pe-8 ps-3 text-[12px] font-semibold text-white outline-none focus:border-electric" aria-label={t('sort')}>
              <option value="featured">{ar ? 'المميزة' : lang === 'he' ? 'מומלצים' : 'Featured'}</option>
              <option value="price-asc">{ar ? 'السعر: من الأرخص' : lang === 'he' ? 'מחיר: מהנמוך לגבוה' : 'Price: Low to High'}</option>
              <option value="price-desc">{ar ? 'السعر: من الأغلى' : lang === 'he' ? 'מחיר: מהגבוה לנמוך' : 'Price: High to Low'}</option>
              <option value="popular">{ar ? 'الأكثر شعبية' : lang === 'he' ? 'הפופולריים ביותר' : 'Most Popular'}</option>
              <option value="newest">{ar ? 'الأحدث' : lang === 'he' ? 'החדשים ביותר' : 'Newest'}</option>
              <option value="discount">{ar ? 'أكبر خصم' : lang === 'he' ? 'ההנחה הגדולה ביותר' : 'Biggest Discount'}</option>
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-mute" />
          </div>
        </div>
      </div>

      {subcategories.length > 0 && (
        <nav aria-label={lang === 'ar' ? 'الفئات الفرعية' : lang === 'he' ? 'תתי קטגוריות' : 'Subcategories'} className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {subcategories.map((sub) => (
            <button key={sub.id} onClick={() => setParam('cat', sub.slug)} className="shrink-0 rounded-full border border-line bg-panel px-4 py-2 text-[11px] font-bold text-white/80 transition-colors hover:border-electric hover:text-electric">{lang === 'ar' ? sub.nameAr : lang === 'he' ? (sub.nameHe || sub.nameEn) : sub.nameEn}</button>
          ))}
        </nav>
      )}

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* sidebar filters (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-36 rounded-2xl border border-line bg-panel p-4">{filtersPanel}</div>
        </aside>

        {/* results */}
        <div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-20 text-center">
              <SearchX size={40} className="text-mute" />
              <p className="font-bold text-white/85">{t('no_results')}</p>
              <button onClick={() => setParams({}, { replace: true })} className="rounded-xl border border-electric px-5 py-2 text-[12px] font-bold text-electric hover:bg-electric hover:text-ink">{t('clear_all')}</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                {shown.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {shown.length < filtered.length && (
                <div className="mt-6 text-center">
                  <button onClick={() => setPage((p) => p + 1)} className="h-12 rounded-xl border border-electric/50 bg-electric/10 px-10 font-display text-sm font-bold uppercase tracking-wider text-electric hover:bg-electric hover:text-ink">
                    {t('load_more')} · {filtered.length - shown.length}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t('filters')}</h2>
              <button onClick={() => setFiltersOpen(false)} className="rounded-lg p-2 text-mute hover:bg-panel2"><X size={20} /></button>
            </div>
            {filtersPanel}
            <button onClick={() => setFiltersOpen(false)} className="mt-4 h-12 w-full rounded-xl bg-electric font-bold text-ink">{t('apply')} · {filtered.length} {t('results')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
