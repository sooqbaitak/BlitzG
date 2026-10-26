// BLITZ GAMING — homepage
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, ArrowRight, Flame, Sparkles, TrendingUp, Layers, MonitorPlay, ChevronRight, PackageSearch } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { ProductCard, productName } from '../components/ProductCard';
import { ProductCarousel } from '../components/ProductCarousel';
import { fmtPrice } from '../lib/i18n';
import { getHomeCopy } from '../lib/content';

export function Home() {
  const { db, lang, t, dir } = useApp();
  const heroSlides = (db.store.homeHeroSlides ?? []).filter((slide) => slide.active && slide.url.trim()).length
    ? (db.store.homeHeroSlides ?? []).filter((slide) => slide.active && slide.url.trim())
    : [{ id: 'legacy-home-hero', kind: 'image' as const, url: db.store.homeHeroImageUrl || '/img/hero.jpg', active: true }];
  const [heroIndex, setHeroIndex] = useState(0);
  const heroInterval = Math.min(60, Math.max(3, db.store.homeHeroIntervalSeconds ?? 6));
  const heroSlide = heroSlides[heroIndex % heroSlides.length];
  useEffect(() => { setHeroIndex(0); }, [heroSlides.length]);
  useEffect(() => {
    if (db.store.homeHeroAutoplay === false || heroSlides.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % heroSlides.length), heroInterval * 1000);
    return () => window.clearInterval(timer);
  }, [db.store.homeHeroAutoplay, heroSlides.length, heroInterval]);
  const moveHero = (step: number) => setHeroIndex((index) => (index + step + heroSlides.length) % heroSlides.length);
  const ar = lang === 'ar';
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const active = db.products.filter((p) => p.status === 'active');
  const by = (tag: string) => active.filter((p) => p.tags.includes(tag as never));
  const featured = by('featured');
  const bestSellers = active.filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 10);
  const newArrivals = by('new').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const deals = by('deal');
  const popular = by('popular').concat(active.filter((p) => p.tags.includes('combo'))).slice(0, 10);
  const combos = active.filter((p) => p.categoryId === 'c-combos' || p.tags.includes('combo'));
  const roots = db.categories.filter((c) => !c.parentId && c.visible && c.featured).sort((a, b) => a.order - b.order);
  const featuredBrands = db.brands.filter((b) => b.featured && b.visible);

  return (
    <div className="space-y-8 pb-10 sm:space-y-12">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {heroSlide.kind === 'video' ? (
            <motion.video key={heroSlide.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: db.store.homeHeroTransition === 'slide' ? 0.25 : 0.55 }} src={heroSlide.url} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover object-[70%_30%] sm:object-center" />
          ) : (
            <motion.img key={heroSlide.id} src={heroSlide.url} alt={lang === 'ar' ? (heroSlide.altAr || 'بنر بلتز قيمنق') : lang === 'he' ? (heroSlide.altHe || 'באנר BLITZ GAMING') : (heroSlide.altEn || 'BLITZ GAMING banner')} initial={{ opacity: 0, x: db.store.homeHeroTransition === 'slide' ? (dir === 'rtl' ? -26 : 26) : 0 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: db.store.homeHeroTransition === 'slide' ? 0.45 : 0.65 }} className="absolute inset-0 h-full w-full object-cover object-[70%_30%] sm:object-center" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/78 to-transparent rtl:bg-gradient-to-l" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-center gap-4 px-4 py-16 sm:py-24 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-electric/40 bg-electric/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-electric">
              <Zap size={12} strokeWidth={2.6} />{getHomeCopy(db.store, 'heroBadge', lang)}
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[0.98] text-white sm:text-6xl">
              {getHomeCopy(db.store, 'heroHeadlineOne', lang)}<br />
              <span className="bg-gradient-to-r from-electric via-[#2fd6ff] to-violet-accent bg-clip-text text-transparent">{getHomeCopy(db.store, 'heroHeadlineTwo', lang)}</span>
            </h1>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-white/80 sm:text-sm">
              {getHomeCopy(db.store, 'heroSubtitle', lang)}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link to="/shop" className="group flex h-12 items-center gap-2 rounded-xl bg-electric px-6 font-display text-base font-bold uppercase tracking-wide text-ink shadow-lg shadow-electric/25 transition-all hover:bg-[#33baff] hover:shadow-electric/40">
                {getHomeCopy(db.store, 'heroShopButton', lang)}
                <Arrow size={18} strokeWidth={2.6} className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
              <Link to="/build-your-setup" className="flex h-12 items-center gap-2 rounded-xl border border-violet-accent/60 bg-violet-accent/15 px-6 font-display text-base font-bold uppercase tracking-wide text-[#c4b0ff] transition-all hover:bg-violet-accent hover:text-white">
                <Zap size={17} strokeWidth={2.4} />{t('build_setup')}
              </Link>
              <Link to="/track-order" className="flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 font-display text-sm font-bold tracking-wide text-white/90 transition-all hover:border-electric/60 hover:bg-electric/10 hover:text-electric">
                <PackageSearch size={17} strokeWidth={2.2} />{ar ? 'تتبع الطلب' : lang === 'he' ? 'מעקב הזמנה' : 'Track My Order'}
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-[10px] font-semibold text-white/60">
              <span>{getHomeCopy(db.store, 'heroBenefitOne', lang)}</span>
              <span>{getHomeCopy(db.store, 'heroBenefitTwo', lang)}</span>
              <span>{getHomeCopy(db.store, 'heroBenefitThree', lang)}</span>
            </div>
          </motion.div>
        </div>
        {db.store.homeHeroShowControls !== false && heroSlides.length > 1 && <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-center gap-2 sm:inset-x-6 sm:bottom-5">
          <button type="button" onClick={() => moveHero(-1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur hover:border-electric" aria-label={lang === 'ar' ? 'البنر السابق' : lang === 'he' ? 'הבאנר הקודם' : 'Previous banner'}><ArrowLeft size={15}/></button>
          <div className="flex max-w-[70vw] items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 backdrop-blur">{heroSlides.map((slide, i) => <button key={slide.id} type="button" onClick={() => setHeroIndex(i)} aria-label={`${lang === 'ar' ? 'البنر' : lang === 'he' ? 'באנר' : 'Banner'} ${i + 1}`} aria-pressed={i === heroIndex} className={`h-1.5 rounded-full transition-all ${i === heroIndex ? 'w-6 bg-electric' : 'w-1.5 bg-white/55 hover:bg-white'}`}/>)}</div>
          <button type="button" onClick={() => moveHero(1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur hover:border-electric" aria-label={lang === 'ar' ? 'البنر التالي' : lang === 'he' ? 'הבאנר הבא' : 'Next banner'}><ArrowRight size={15}/></button>
        </div>}
      </section>

      {/* ── CATEGORY TILES ── */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-white sm:text-xl"><span className="h-5 w-1 rounded-full bg-gradient-to-b from-electric to-violet-accent" />{t('categories')}</h2>
          <Link to="/shop" className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-electric hover:text-white">{t('view_all')}<ChevronRight size={13} className={dir === 'rtl' ? '' : 'rotate-180'} /></Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
          {roots.slice(0, 14).map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} className="group flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-panel p-2 text-center transition-all hover:-translate-y-0.5 hover:border-electric/50 sm:p-3">
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-line transition-colors group-hover:border-electric/50 sm:h-20 sm:w-20">
                {c.image ? <img src={c.image} alt="" loading="lazy" className="h-full w-full transition-transform duration-500 group-hover:scale-110" style={{ objectFit: c.imageFit ?? 'cover' }} /> : <div className="flex h-full w-full items-center justify-center text-electric"><Zap size={26} /></div>}
              </div>
              <span className="text-[9px] font-semibold leading-tight text-white/80 group-hover:text-white sm:text-[10.5px]">{lang === 'ar' ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED ── */}
      <ProductCarousel title={t('featured')} viewAllTo="/shop?tag=featured" products={featured} />

      {/* ── DEALS banner + carousel ── */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="overflow-hidden rounded-2xl border border-red-500/25 bg-gradient-to-r from-[#1c0b0b] via-panel to-panel p-4 sm:flex sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-2.5 text-red-400"><Flame size={26} /></div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase leading-none text-white sm:text-xl">{t('deals')}</h2>
              <p className="mt-1 text-[11px] text-mute">{getHomeCopy(db.store, 'dealsSubtitle', lang)}</p>
            </div>
          </div>
          <Link to="/offers" className="mt-3 inline-flex h-10 items-center rounded-xl border border-red-500/50 px-5 text-[12px] font-bold text-red-400 hover:bg-red-500 hover:text-white sm:mt-0">
            {getHomeCopy(db.store, 'dealsButton', lang)}
          </Link>
        </div>
      </section>
      <ProductCarousel title={t('deals')} viewAllTo="/offers" products={deals} />

      {/* ── BEST SELLERS ── */}
      <ProductCarousel title={t('best_sellers')} viewAllTo="/shop?sort=popular" products={bestSellers} />

      {/* ── BUILD YOUR SETUP CTA ── */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-2xl border border-violet-accent/35 bg-gradient-to-br from-[#141026] via-panel to-[#071018] p-5 sm:p-8">
          <div className="pointer-events-none absolute -end-16 -top-16 h-64 w-64 rounded-full bg-violet-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 start-1/4 h-56 w-56 rounded-full bg-electric/15 blur-3xl" />
          <div className="relative max-w-lg">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-accent"><Sparkles size={12} />{getHomeCopy(db.store, 'setupBadge', lang)}</span>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase leading-tight text-white sm:text-3xl">{t('build_setup')}</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">{getHomeCopy(db.store, 'setupSubtitle', lang)}</p>
            <Link to="/build-your-setup" className="group mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-violet-accent px-6 font-display text-base font-bold uppercase tracking-wide text-white transition-all hover:bg-[#9d78ff]">
              {getHomeCopy(db.store, 'setupButton', lang)}<Arrow size={17} className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── NEW ARRIVALS ── */}
      <ProductCarousel title={t('new_arrivals')} viewAllTo="/shop?sort=newest" products={newArrivals} />

      {/* ── POPULAR + COMBOS ── */}
      <ProductCarousel title={t('popular')} viewAllTo="/shop?tag=popular" products={popular} />
      {combos.length > 0 && <ProductCarousel title={ar ? 'بكجات القيمنق' : lang === 'he' ? 'ערכות גיימינג' : 'Gaming Combos'} viewAllTo="/shop?cat=gaming-combos" products={combos} />}

      {/* ── PC BUILDS banner ── */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="grid overflow-hidden rounded-2xl border border-line sm:grid-cols-2">
          <div className="relative min-h-52 sm:min-h-64">
            <img src={db.store.homePcBuildImageUrl || "/img/pcbuild.jpg"} alt="BLITZ custom gaming PC build" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="flex flex-col justify-center gap-3 bg-panel p-5 sm:p-8">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-electric"><MonitorPlay size={13} />{getHomeCopy(db.store, 'pcBuildBadge', lang)}</span>
            <h2 className="font-display text-2xl font-bold uppercase leading-tight text-white">{getHomeCopy(db.store, 'pcBuildTitle', lang)}</h2>
            <p className="text-[12px] leading-relaxed text-mute">{getHomeCopy(db.store, 'pcBuildSubtitle', lang)}</p>
            <Link to="/category/gaming-pcs" className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-electric/50 bg-electric/10 px-5 text-[13px] font-bold text-electric hover:bg-electric hover:text-ink"><Layers size={16} />{getHomeCopy(db.store, 'pcBuildButton', lang)}</Link>
          </div>
        </div>
      </section>

      {/* ── BRANDS ── */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-white sm:text-xl"><TrendingUp size={19} className="text-electric" />{t('brand_strip')}</h2>
          <Link to="/brands" className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-electric hover:text-white">{t('view_all')}<ChevronRight size={13} className={dir === 'rtl' ? '' : 'rotate-180'} /></Link>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 md:grid-cols-8">
          {featuredBrands.map((b) => (
            <Link key={b.id} to={`/shop?brand=${b.slug}`} className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl border border-line bg-panel transition-all hover:border-electric/50 hover:bg-panel2 sm:w-auto">
              <span className="font-display text-[12px] font-bold uppercase tracking-wider text-white/70">{b.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
