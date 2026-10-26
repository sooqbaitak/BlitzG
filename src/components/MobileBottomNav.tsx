import { Link, useLocation } from 'react-router-dom';
import { Home, Store, UserRound, Heart, ShoppingCart, PackageSearch, Gamepad2, MessageCircle, SunMoon } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import type { MobileBottomBarItemId } from '../lib/types';

type Item = { id: MobileBottomBarItemId; label: { en: string; ar: string; he: string }; to?: string; Icon: typeof Home };
const ITEMS: Item[] = [
  { id: 'home', label: { en: 'Home', ar: 'الرئيسية', he: 'ראשי' }, to: '/', Icon: Home },
  { id: 'shop', label: { en: 'Shop', ar: 'تسوّق', he: 'חנות' }, to: '/shop', Icon: Store },
  { id: 'account', label: { en: 'Account', ar: 'حسابي', he: 'חשבון' }, to: '/account', Icon: UserRound },
  { id: 'wishlist', label: { en: 'Favorites', ar: 'المفضلة', he: 'מועדפים' }, to: '/wishlist', Icon: Heart },
  { id: 'cart', label: { en: 'Cart', ar: 'السلة', he: 'סל' }, Icon: ShoppingCart },
  { id: 'whatsapp', label: { en: 'WhatsApp', ar: 'واتساب', he: 'WhatsApp' }, Icon: MessageCircle },
  { id: 'track', label: { en: 'Track', ar: 'تتبع', he: 'מעקב' }, to: '/track-order', Icon: PackageSearch },
  { id: 'build', label: { en: 'Build', ar: 'تجميعتك', he: 'בנייה' }, to: '/build-your-setup', Icon: Gamepad2 },
  { id: 'theme', label: { en: 'Theme', ar: 'المظهر', he: 'ערכת נושא' }, Icon: SunMoon },
];
const DEFAULT_ITEMS: MobileBottomBarItemId[] = ['home', 'shop', 'account', 'cart', 'whatsapp', 'theme'];

export function MobileBottomNav() {
  const { db, lang, cartCount, wishlist, setDrawerOpen, dir, storefrontTheme, toggleStorefrontTheme } = useApp();
  const location = useLocation();
  const configured = db.store.mobileBottomBarItems;
  const activeItems = (configured?.length ? configured : DEFAULT_ITEMS)
    .map((id) => ITEMS.find((item) => item.id === id))
    .filter((item): item is Item => Boolean(item))
    .filter((item) => item.id !== 'theme' || db.store.allowCustomerThemeToggle !== false)
    .slice(0, 6);
  if (!activeItems.length) return null;

  const whatsapp = `https://wa.me/${db.store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi BLITZ GAMING! I need help with my order.')}`;
  const labelFor = (item: Item) => item.label[lang] || item.label.en;

  return (
    <nav aria-label={lang === 'ar' ? 'التنقل السريع' : lang === 'he' ? 'ניווט מהיר' : 'Quick navigation'} dir={dir} className="mobile-bottom-nav md:hidden">
      <div className="mx-auto grid w-full max-w-lg" style={{ gridTemplateColumns: `repeat(${activeItems.length}, minmax(0, 1fr))` }}>
        {activeItems.map(({ id, Icon, to, label }) => {
          const selected = Boolean(to && (location.pathname === to || (to === '/shop' && location.pathname.startsWith('/category'))));
          const sharedClass = `relative flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[9px] font-semibold transition-colors ${selected ? 'text-electric' : id === 'whatsapp' ? 'text-[#25D366]' : 'text-white/70 hover:text-white'}`;
          const contents = <><span className="relative"><Icon size={19} strokeWidth={selected ? 2.5 : 2} />{id === 'cart' && cartCount > 0 && <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-accent px-1 text-[8px] font-extrabold text-white">{cartCount}</span>}{id === 'wishlist' && wishlist.length > 0 && <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-accent px-1 text-[8px] font-extrabold text-white">{wishlist.length}</span>}</span><span className="max-w-full truncate">{labelFor({ id, label, Icon })}</span></>;
          if (id === 'cart') return <button key={id} type="button" onClick={() => setDrawerOpen(true)} className={sharedClass} aria-label={labelFor({ id, label, Icon })}>{contents}</button>;
          if (id === 'whatsapp') return <a key={id} href={whatsapp} target="_blank" rel="noopener noreferrer" className={sharedClass} aria-label="WhatsApp">{contents}</a>;
          if (id === 'theme') return <button key={id} type="button" onClick={toggleStorefrontTheme} className={sharedClass} aria-label={lang === 'ar' ? 'تغيير المظهر' : lang === 'he' ? 'שינוי ערכת נושא' : 'Toggle theme'}>{contents}</button>;
          return <Link key={id} to={to || '/'} className={sharedClass} aria-current={selected ? 'page' : undefined}>{contents}</Link>;
        })}
      </div>
    </nav>
  );
}
