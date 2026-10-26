// BLITZ GAMING — header: announcement, search+suggest, lang, account, wishlist, cart, mega-menu
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Heart, ShoppingCart, Menu, User, X, ChevronDown, ChevronLeft, Zap, SunMoon,
} from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Logo } from './Logo';
import { productName } from './ProductCard';
import { fmtPrice } from '../lib/i18n';

const NAV: { labelEn: string; labelAr: string; to: string; catSlug?: string }[] = [
  { labelEn: 'Home', labelAr: 'الرئيسية', to: '/' },
  { labelEn: 'Shop All', labelAr: 'كل المنتجات', to: '/shop' },
  { labelEn: 'Keyboards', labelAr: 'لوحات مفاتيح', to: '/shop?cat=keyboards', catSlug: 'keyboards' },
  { labelEn: 'Gaming Mice', labelAr: 'فئران قيمنق', to: '/shop?cat=gaming-mice', catSlug: 'gaming-mice' },
  { labelEn: 'Headsets', labelAr: 'سماعات', to: '/shop?cat=headsets', catSlug: 'headsets' },
  { labelEn: 'Controllers', labelAr: 'يدات تحكم', to: '/shop?cat=controllers', catSlug: 'controllers' },
  { labelEn: 'Mouse Pads', labelAr: 'ماوس باد', to: '/shop?cat=mouse-pads', catSlug: 'mouse-pads' },
  { labelEn: 'Gaming Combos', labelAr: 'بكجات', to: '/shop?cat=gaming-combos', catSlug: 'gaming-combos' },
  { labelEn: 'Cooling Pads', labelAr: 'تبريد', to: '/shop?cat=cooling-pads', catSlug: 'cooling-pads' },
  { labelEn: 'PC Cases', labelAr: 'كيسات PC', to: '/shop?cat=pc-cases', catSlug: 'pc-cases' },
  { labelEn: 'Monitors', labelAr: 'شاشات', to: '/shop?cat=monitors', catSlug: 'monitors' },
  { labelEn: 'Microphones', labelAr: 'مايكروفونات', to: '/shop?cat=microphones', catSlug: 'microphones' },
  { labelEn: 'Cables & Accessories', labelAr: 'كابلات وملحقات', to: '/shop?cat=cables-accessories', catSlug: 'cables-accessories' },
  { labelEn: 'PC Components', labelAr: 'قطع كمبيوتر', to: '/shop?cat=pc-components', catSlug: 'pc-components' },
  { labelEn: 'Gaming PCs', labelAr: 'أجهزة قيمنق', to: '/shop?cat=gaming-pcs', catSlug: 'gaming-pcs' },
  { labelEn: 'Chairs & Setup', labelAr: 'كراسي وتجهيزات', to: '/shop?cat=chairs-setup', catSlug: 'chairs-setup' },
  { labelEn: 'Brands', labelAr: 'الماركات', to: '/brands' },
  { labelEn: 'Offers', labelAr: 'العروض', to: '/offers' },
  { labelEn: 'Track My Order', labelAr: 'تتبع الطلب', to: '/track-order' },
];

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.36.22-.66.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.11 3.22 5.1 4.5.71.31 1.27.5 1.7.64.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.07-.12-.27-.2-.57-.35z"/>
      <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 2.09.55 4.13 1.6 5.93L2.1 22l4.4-1.15a9.8 9.8 0 0 0 5.5 1.74h.01c5.43 0 9.83-4.4 9.84-9.85 0-2.63-1.02-5.1-2.9-6.97A9.78 9.78 0 0 0 12.04 2zm0 18.02h-.01a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-2.6.68.7-2.52-.2-.32a8.06 8.06 0 0 1-1.25-4.32c0-4.49 3.66-8.14 8.15-8.14 2.17 0 4.22.85 5.76 2.4a8.08 8.08 0 0 1 2.38 5.76c0 4.5-3.65 8.15-8.13 8.15z"/>
    </svg>
  );
}

export function Header() {
  const { db, lang, setLang, t, cartCount, wishlist, setDrawerOpen, dir, storefrontTheme, toggleStorefrontTheme } = useApp();
  const whatsappUrl = `https://wa.me/${db.store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi BLITZ GAMING! I need help with my order.')}`;
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileMenu(false); setMegaOpen(false); }, [location.pathname, location.search]);

  // close search suggestions on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!searchRef.current?.contains(e.target as Node)) setFocused(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return db.products
      .filter((p) => p.status === 'active')
      .filter((p) =>
        p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(query.trim()) ||
        p.sku.toLowerCase().includes(q) ||
        (p.customTags ?? []).some((tagValue) => tagValue.toLowerCase().includes(q)) ||
        db.brands.find((b) => b.id === p.brandId)?.name.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, db.products, db.brands]);

  const visibleRoots = useMemo(
    () => db.categories.filter((c) => !c.parentId && c.visible).sort((a, b) => a.order - b.order),
    [db.categories]
  );

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) { navigate(`/shop?q=${encodeURIComponent(query.trim())}`); setFocused(false); }
  };

  const hasAnnouncementConfig = Array.isArray(db.store.announcementItems);
  const announcementItems = (db.store.announcementItems ?? [])
    .filter((item) => item.active)
    .map((item) => ({
      id: item.id,
      text: lang === 'ar' ? item.textAr : lang === 'he' ? (item.textHe || item.textEn) : item.textEn,
      url: item.url?.trim(),
    }))
    .filter((item) => item.text.trim());
  const visibleAnnouncements = announcementItems.length ? announcementItems : (!hasAnnouncementConfig ? [{
    id: 'legacy-announcement',
    text: lang === 'ar' ? db.store.announcementAr : lang === 'he' ? (db.store.announcementHe || db.store.announcementEn) : db.store.announcementEn,
    url: '',
  }] : []);
  const announcementSpeed = Math.min(90, Math.max(8, db.store.announcementSpeedSeconds ?? 32));
  const announcementFontSize = Math.min(28, Math.max(8, db.store.announcementFontSize ?? 12));

  return (
    <header className="sticky top-0 z-50">
      {/* ── admin-customizable multi-slot announcement bar ── */}
      {visibleAnnouncements.length > 0 && <div className={`relative flex min-h-8 items-center overflow-hidden border-b font-semibold ${db.store.announcementPauseOnHover === false ? '' : 'announcement-pause-on-hover'}`} style={{ backgroundColor: db.store.announcementBgColor || '#07131f', fontSize: `${announcementFontSize}px`, borderColor: db.store.announcementBorderColor || '#12334a', fontWeight: db.store.announcementFontWeight === 'normal' ? 400 : db.store.announcementFontWeight === 'medium' ? 500 : 700 }}>
        <div className="marquee-track flex items-center gap-8 px-4" style={{ color: db.store.announcementTextColor || '#49c6ff', animationDuration: `${announcementSpeed}s` }}>
          {[0, 1].map((copy) => (
            <span key={copy} aria-hidden={copy === 1} className="flex items-center gap-6 whitespace-nowrap px-3">
              {visibleAnnouncements.map((item) => (
                <span key={`${copy}-${item.id}`} className="inline-flex items-center gap-2">
                  {db.store.announcementShowIcon !== false && <Zap size={Math.max(10, announcementFontSize - 1)} />}
                  {item.url ? <a href={item.url} className="hover:underline" target={/^https?:/i.test(item.url) ? '_blank' : undefined} rel="noreferrer">{item.text}</a> : <span>{item.text}</span>}
                  <span aria-hidden="true" className="mx-2 opacity-50">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>}

      {/* ── main row ── */}
      <div className="border-b border-line bg-ink/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-1 px-2 sm:h-16 sm:gap-4 sm:px-4">
          <button className="shrink-0 rounded-lg p-1.5 text-white/90 hover:bg-panel2 lg:hidden sm:p-2" onClick={() => setMobileMenu(true)} aria-label="Menu">
            <Menu size={22} />
          </button>

          <div className="min-w-0 flex-1 sm:flex-none"><Logo /></div>

          {/* search */}
          <div ref={searchRef} className="relative ms-auto hidden h-10 max-w-md flex-1 md:flex">
            <form onSubmit={submitSearch} className="flex h-full w-full items-stretch overflow-hidden rounded-xl border border-line bg-panel2 focus-within:border-electric transition-colors">
              <button type="submit" className="flex w-11 items-center justify-center text-mute hover:text-electric" aria-label={t('search')}>
                <Search size={18} />
              </button>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                placeholder={t('search_ph')}
                className="w-full bg-transparent text-sm text-white placeholder-mute outline-none"
                aria-label={t('search')}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="w-9 text-mute hover:text-white" aria-label="Clear">
                  <X size={16} className="mx-auto" />
                </button>
              )}
            </form>
            {/* autocomplete */}
            {focused && suggestions.length > 0 && (
              <div className="absolute top-11 z-50 w-full overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/60">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => { navigate(`/product/${p.slug}`); setFocused(false); setQuery(''); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-panel2"
                  >
                    <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-white/90">{productName(p, lang)}</span>
                      <span className="text-[10px] font-bold uppercase text-electric">{db.brands.find((b) => b.id === p.brandId)?.name}</span>
                    </span>
                    <span className="font-display text-sm font-bold text-white">{fmtPrice(p.salePrice ?? p.price, lang)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* actions */}
          <div className="ms-auto flex shrink-0 items-center gap-0.5 min-[390px]:gap-1 sm:gap-1.5 md:ms-0">
            {/* customer theme toggle is separate from the store's default theme */}
            {db.store.allowCustomerThemeToggle !== false && <button type="button" onClick={toggleStorefrontTheme} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 text-white/80 hover:border-electric hover:text-electric lg:flex" aria-label={lang === 'ar' ? 'تغيير المظهر' : lang === 'he' ? 'שינוי ערכת נושא' : 'Toggle theme'} title={storefrontTheme === 'day' ? 'Night mode' : 'Day mode'}><SunMoon size={17}/></button>}

            {/* lang */}
            <div className="flex h-8 shrink-0 items-center rounded-lg border border-line bg-panel2 p-0.5 text-[8px] font-bold min-[390px]:h-9 min-[390px]:text-[10px]" aria-label="Language selector">
              {([['ar', 'عربي'], ['en', 'EN'], ['he', 'עב']] as const).map(([value, label]) => <button key={value} onClick={() => setLang(value)} className={`h-7 rounded-md px-1 transition-colors min-[390px]:h-8 min-[390px]:px-1.5 ${lang === value ? 'bg-electric/15 text-electric' : 'text-white/65 hover:text-white'}`} aria-pressed={lang === value}>{label}</button>)}
            </div>

            {/* whatsapp */}
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 text-[#25D366] hover:border-[#25D366]/60 min-[390px]:flex" aria-label="WhatsApp">
              <WhatsAppIcon size={18} />
            </a>

            {/* account */}
            <Link to="/account" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2 text-white/85 hover:border-electric hover:text-electric sm:flex" aria-label={t('account')}>
              <User size={18} />
            </Link>

            {/* wishlist */}
            <Link to="/wishlist" className="relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 text-white/85 hover:border-electric hover:text-electric min-[360px]:flex" aria-label={t('wishlist')}>
              <Heart size={18} />
              {wishlist.length > 0 && <span className="absolute -top-1.5 -end-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-accent px-1 text-[9px] font-bold text-white">{wishlist.length}</span>}
            </Link>

            {/* cart */}
            <button onClick={() => setDrawerOpen(true)} className="relative flex h-8 shrink-0 items-center gap-1 rounded-lg bg-electric px-2 font-bold text-ink hover:bg-[#33baff] min-[390px]:h-9 min-[390px]:gap-1.5 min-[390px]:px-2.5 sm:px-3" aria-label={t('cart')}>
              <ShoppingCart size={18} strokeWidth={2.4} />
              <span className="hidden font-display text-base font-bold xs:inline sm:inline">{cartCount}</span>
              <span className="absolute -top-1.5 -end-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-accent px-1 text-[9px] font-bold text-white">{cartCount}</span>
            </button>
          </div>
        </div>

        {/* mobile search */}
        <div className="mx-auto max-w-7xl px-3 pb-2 md:hidden">
          <form onSubmit={submitSearch} className="flex h-10 items-stretch overflow-hidden rounded-xl border border-line bg-panel2 focus-within:border-electric">
            <button type="submit" className="flex w-11 items-center justify-center text-mute" aria-label={t('search')}><Search size={18} /></button>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search_ph')} className="w-full bg-transparent text-sm text-white placeholder-mute outline-none" aria-label={t('search')} />
          </form>
        </div>
      </div>

      {/* ── nav row (desktop) ── */}
      <div className="hidden border-b border-line bg-[#0d0d10]/95 backdrop-blur lg:block" onMouseLeave={() => setMegaOpen(false)}>
        <div className="mx-auto flex max-w-7xl items-center px-4">
          <button
            onMouseEnter={() => setMegaOpen(true)}
            className="flex h-11 items-center gap-1.5 border-e border-line px-4 text-[12px] font-bold text-electric hover:bg-panel2"
          >
            <Menu size={16} />{lang === 'ar' ? 'كل الفئات' : lang === 'he' ? 'כל הקטגוריות' : 'All Categories'}<ChevronDown size={14} className={`transition-transform ${megaOpen ? 'rotate-180' : ''}`} />
          </button>
          <nav className="no-scrollbar flex items-center overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex h-11 items-center whitespace-nowrap px-2.5 text-[11.5px] font-semibold transition-colors hover:text-electric ${item.labelEn === 'Offers' ? 'text-violet-accent' : 'text-white/80'}`}
              >
                {lang === 'ar' ? item.labelAr : lang === 'he' ? ({ Home: 'ראשי', 'Shop All': 'כל המוצרים', Keyboards: 'מקלדות', 'Gaming Mice': 'עכברי גיימינג', Headsets: 'אוזניות', Controllers: 'בקרים', 'Mouse Pads': 'משטחי עכבר', 'Gaming Combos': 'ערכות גיימינג', 'Cooling Pads': 'משטחי קירור', 'PC Cases': 'מארזי מחשב', Monitors: 'מסכים', Microphones: 'מיקרופונים', 'Cables & Accessories': 'כבלים ואביזרים', 'PC Components': 'רכיבי מחשב', 'Gaming PCs': 'מחשבי גיימינג', 'Chairs & Setup': 'כיסאות ועמדות', Offers: 'מבצעים', Brands: 'מותגים', 'Track My Order': 'מעקב הזמנה' }[item.labelEn] || item.labelEn) : item.labelEn}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── mega menu panel ── */}
        {megaOpen && (
          <div className="absolute inset-x-0 top-full border-b border-line bg-panel/98 shadow-2xl shadow-black/70 backdrop-blur-xl">
            <div className="mx-auto grid max-w-7xl grid-cols-4 gap-1 p-5 xl:grid-cols-5">
              {visibleRoots.slice(0, 15).map((c) => {
                const children = db.categories.filter((x) => x.parentId === c.id && x.visible).sort((a, b) => a.order - b.order);
                return (
                  <div key={c.id} className="group/m rounded-xl p-2 hover:bg-panel2">
                    <Link to={`/category/${c.slug}`} className="flex items-center justify-between text-[12.5px] font-bold text-white/90 hover:text-electric">
                      {lang === 'ar' ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn}
                      <ChevronLeft size={13} className={dir === 'rtl' ? '' : 'rotate-180'} />
                    </Link>
                    {children.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {children.slice(0, 3).map((ch) => (
                          <Link key={ch.id} to={`/category/${ch.slug}`} className="block text-[11px] text-mute hover:text-white">
                            {lang === 'ar' ? ch.nameAr : lang === 'he' ? (ch.nameHe || ch.nameEn) : ch.nameEn}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── mobile drawer ── */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenu(false)} />
          <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-[85vw] max-w-sm overflow-y-auto border-e border-line bg-panel p-4`}>
            <div className="mb-4 flex items-center justify-between">
              <Logo compact />
              <button onClick={() => setMobileMenu(false)} className="rounded-lg p-2 text-white/80 hover:bg-panel2" aria-label="Close"><X size={22} /></button>
            </div>
            <nav className="space-y-0.5">
              {NAV.map((item) => (
                <Link key={item.to} to={item.to} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-white/85 hover:bg-panel2 hover:text-electric">
                  {lang === 'ar' ? item.labelAr : lang === 'he' ? ({ Home: 'ראשי', 'Shop All': 'כל המוצרים', Keyboards: 'מקלדות', 'Gaming Mice': 'עכברי גיימינג', Headsets: 'אוזניות', Controllers: 'בקרים', 'Mouse Pads': 'משטחי עכבר', 'Gaming Combos': 'ערכות גיימינג', 'Cooling Pads': 'משטחי קירור', 'PC Cases': 'מארזי מחשב', Monitors: 'מסכים', Microphones: 'מיקרופונים', 'Cables & Accessories': 'כבלים ואביזרים', 'PC Components': 'רכיבי מחשב', 'Gaming PCs': 'מחשבי גיימינג', 'Chairs & Setup': 'כיסאות ועמדות', Offers: 'מבצעים', Brands: 'מותגים', 'Track My Order': 'מעקב הזמנה' }[item.labelEn] || item.labelEn) : item.labelEn}
                  <ChevronLeft size={15} className={dir === 'rtl' ? '' : 'rotate-180'} />
                </Link>
              ))}
            </nav>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 py-3 text-sm font-bold text-[#25D366]">
              <WhatsAppIcon size={18} /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
