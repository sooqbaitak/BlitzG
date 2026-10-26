// BLITZ GAMING — category landing page
import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useApp } from '../lib/AppContext';
import { ProductCard } from '../components/ProductCard';
import { categoryTreeIds, productMatchesCategoryTree } from '../lib/categories';
import { variantFacets, variantMatches } from '../lib/variants';
import { ChevronRight, Zap } from 'lucide-react';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { db, lang, t, dir } = useApp();
  const [variantFilters, setVariantFilters] = useState<Record<string, string>>({});
  const ar = lang === 'ar';
  const category = db.categories.find((c) => c.slug === slug);

  const products = useMemo(() => {
    if (!category) return [];
    const ids = categoryTreeIds(db.categories, category.id);
    return db.products.filter((p) => p.status === 'active' && productMatchesCategoryTree(p, ids)).filter((p) => !Object.keys(variantFilters).length || p.variants.some((v) => variantMatches(v, variantFilters))).sort((a, b) => Number(b.tags.includes('featured')) - Number(a.tags.includes('featured')));
  }, [category, db.categories, db.products, variantFilters]);

  if (!category) return <Navigate to="/shop" replace />;
  const name = lang === 'ar' ? category.nameAr : lang === 'he' ? (category.nameHe || category.nameEn) : category.nameEn;
  const parent = category.parentId ? db.categories.find((c) => c.id === category.parentId) : null;
  const children = db.categories.filter((c) => c.parentId === category.id && c.visible);
  const categoryIdsForFacets = categoryTreeIds(db.categories, category.id);
  const facetProducts = db.products.filter((p) => p.status === 'active' && productMatchesCategoryTree(p, categoryIdsForFacets));
  const facets = variantFacets(facetProducts.flatMap((p) => p.variants));

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4">
      {/* breadcrumb */}
      <nav className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-mute" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-electric">{t('home')}</Link>
        <ChevronRight size={12} className={dir === 'rtl' ? 'rotate-180' : ''} />
        {parent && (<><Link to={`/category/${parent.slug}`} className="hover:text-electric">{lang === 'ar' ? parent.nameAr : lang === 'he' ? (parent.nameHe || parent.nameEn) : parent.nameEn}</Link><ChevronRight size={12} className={dir === 'rtl' ? 'rotate-180' : ''} /></>)}
        <span className="text-electric">{name}</span>
      </nav>

      {/* hero band */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-line">
        {category.image && <img src={category.image} alt={name} className="absolute inset-0 h-full w-full" style={{ objectFit: category.imageFit ?? 'cover' }} />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0cee] via-[#0a0a0c99] to-transparent rtl:bg-gradient-to-l" />
        <div className="relative flex h-40 flex-col justify-center px-5 sm:h-48 sm:px-8">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-electric"><Zap size={12} />{ar ? 'الفئة' : lang === 'he' ? 'קטגוריה' : 'Category'}</span>
          <h1 className="mt-1 font-display text-2xl font-bold uppercase text-white sm:text-4xl">{name}</h1>
          <p className="mt-1 text-[11px] font-semibold text-white/70">{products.length} {ar ? 'منتج' : lang === 'he' ? 'מוצרים' : 'products'}</p>
        </div>
      </div>

      {/* subcategories */}
      {children.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {children.map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} className="rounded-full border border-line bg-panel px-4 py-2 text-[11px] font-bold text-white/80 hover:border-electric hover:text-electric">{lang === 'ar' ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn}</Link>
          ))}
        </div>
      )}

      {facets.length > 0 && <section className="mb-4 rounded-xl border border-line bg-panel p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-mute">{ar ? 'تصفية حسب خيارات المنتج' : lang === 'he' ? 'סינון לפי אפשרויות מוצר' : 'Filter by variant options'}</p><div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{facets.map((facet) => <label key={facet.name} className="text-[10px] font-bold text-white/80">{facet.name}<select value={variantFilters[facet.name] ?? ''} onChange={(e) => setVariantFilters((old) => ({ ...old, [facet.name]: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-line bg-panel2 px-3 text-[11px] text-white"><option value="">{ar ? 'كل الخيارات' : lang === 'he' ? 'כל האפשרויות' : `All ${facet.name}`}</option>{facet.values.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>)}</div><button type="button" onClick={() => setVariantFilters({})} className="mt-2 text-[10px] font-bold text-electric">{ar ? 'مسح فلاتر الخيارات' : lang === 'he' ? 'ניקוי מסננים' : 'Clear variant filters'}</button></section>}

      {/* grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {products.length === 0 && <p className="py-16 text-center text-mute">{t('no_results')}</p>}
    </div>
  );
}
