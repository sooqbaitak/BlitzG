import { Link, Navigate } from 'react-router-dom';
import { Film, PlayCircle, ArrowUpRight, Tag, FolderTree, Package } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { fmtPrice } from '../lib/i18n';
import { unitPrice } from '../lib/db';
import { productName, categoryName } from '../lib/productPresentation';

const safeMediaUrl = (value?: string) => {
  const url = (value ?? '').trim();
  return /^https:\/\//i.test(url) ? url : '';
};

export function VideoAds() {
  const { db, lang } = useApp();
  const ar = lang === 'ar'; const he = lang === 'he';
  if (!db.store.videoAdsPageEnabled) return <Navigate to="/" replace />;
  const videos = (db.store.videoAds ?? []).filter((video) => video.active && safeMediaUrl(video.videoUrl)).sort((a, b) => Number(b.featured === true) - Number(a.featured === true) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const title = ar ? 'فيديوهات BLITZ' : he ? 'סרטוני BLITZ' : 'BLITZ Videos';
  const subtitle = ar ? 'شاهد المنتجات عن قرب واكتشف تفاصيلها قبل الشراء.' : he ? 'צפו במוצרים מקרוב והכירו את הפרטים לפני הקנייה.' : 'See our gaming gear in action and discover products before you buy.';

  return <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-9">
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-electric/25 bg-gradient-to-br from-[#061b2a] via-panel to-[#171026] p-5 sm:p-8">
      <div className="pointer-events-none absolute -end-12 -top-16 h-64 w-64 rounded-full bg-electric/15 blur-3xl"/>
      <div className="relative flex items-center gap-3"><span className="rounded-2xl border border-electric/30 bg-electric/10 p-3 text-electric"><Film size={28}/></span><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-electric">BLITZ GAMING</p><h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{title}</h1></div></div>
      <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-white/70">{subtitle}</p>
    </div>

    {videos.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => {
        const videoTitle = he ? (video.titleHe || video.titleEn) : ar ? video.titleAr : video.titleEn;
        const description = he ? (video.descriptionHe || video.descriptionEn) : ar ? (video.descriptionAr || video.descriptionEn) : video.descriptionEn;
        const linkedProducts = (video.productIds ?? []).map((id) => db.products.find((product) => product.id === id && product.status === 'active')).filter((product): product is NonNullable<typeof product> => product !== undefined);
        const linkedCategories = (video.categoryIds ?? []).map((id) => db.categories.find((category) => category.id === id && category.visible)).filter((category): category is NonNullable<typeof category> => category !== undefined);
        const linkedBrands = (video.brandIds ?? []).map((id) => db.brands.find((brand) => brand.id === id && brand.visible)).filter((brand): brand is NonNullable<typeof brand> => brand !== undefined);
        return <article key={video.id} className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl shadow-black/10">
          <div className="relative bg-black">
            <video src={safeMediaUrl(video.videoUrl)} poster={safeMediaUrl(video.posterUrl) || undefined} controls playsInline preload="none" className="aspect-video max-h-[420px] w-full object-contain" aria-label={videoTitle}/>
            {video.featured && <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full border border-electric/30 bg-black/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-electric"><PlayCircle size={12}/>{ar ? 'مميز' : he ? 'מומלץ' : 'Featured'}</span>}
          </div>
          <div className="p-4">
            <h2 className="font-display text-lg font-bold leading-tight text-white">{videoTitle}</h2>
            {description && <p className="mt-1.5 text-[11px] leading-relaxed text-mute">{description}</p>}
            {(linkedProducts.length > 0 || linkedCategories.length > 0 || linkedBrands.length > 0) && <div className="mt-3 space-y-2 border-t border-line pt-3">
              {linkedProducts.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-1 text-[9px] font-bold text-mute"><Package size={12}/>{ar ? 'المنتجات' : he ? 'מוצרים' : 'Products'}:</span>{linkedProducts.map((product) => <Link key={product.id} to={`/product/${product.slug}`} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-[10px] font-semibold text-white/85 hover:border-electric hover:text-electric">{productName(product, lang)}</Link>)}</div>}
              {linkedCategories.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-1 text-[9px] font-bold text-mute"><FolderTree size={12}/>{ar ? 'الفئات' : he ? 'קטגוריות' : 'Categories'}:</span>{linkedCategories.map((category) => <Link key={category.id} to={`/category/${category.slug}`} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-[10px] font-semibold text-white/85 hover:border-electric hover:text-electric">{categoryName(category, lang)}</Link>)}</div>}
              {linkedBrands.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-1 text-[9px] font-bold text-mute"><Tag size={12}/>{ar ? 'الماركات' : he ? 'מותגים' : 'Brands'}:</span>{linkedBrands.map((brand) => <Link key={brand.id} to={`/shop?brand=${brand.slug}`} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-[10px] font-semibold text-white/85 hover:border-electric hover:text-electric">{brand.name}</Link>)}</div>}
            </div>}
            {linkedProducts.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{linkedProducts.slice(0, 4).map((product) => <Link key={product.id} to={`/product/${product.slug}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-panel2 p-2 hover:border-electric/50">
              <img src={product.images[0]} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-lg object-cover"/>
              <span className="min-w-0 flex-1"><span className="block line-clamp-2 text-[10px] font-semibold text-white">{productName(product, lang)}</span><span className="mt-0.5 block font-display text-xs font-bold text-electric">{fmtPrice(unitPrice(product, null), lang)}</span></span><ArrowUpRight size={13} className="shrink-0 text-mute"/>
            </Link>)}</div>}
          </div>
        </article>;
      })}
    </div> : <div className="rounded-2xl border border-dashed border-line bg-panel px-6 py-16 text-center"><Film size={34} className="mx-auto text-mute"/><p className="mt-3 font-bold text-white">{ar ? 'لا توجد فيديوهات متاحة حالياً' : he ? 'אין סרטונים זמינים כרגע' : 'No videos available right now'}</p><p className="mt-1 text-[11px] text-mute">{ar ? 'تابعنا لاكتشاف أحدث المنتجات والعروض.' : he ? 'עקבו אחרינו כדי לגלות מוצרים ומבצעים חדשים.' : 'Check back soon for new product videos and offers.'}</p></div>}
  </div>;
}
