// BLITZ GAMING — offers / deals page
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { ProductCard } from '../components/ProductCard';

export function Offers() {
  const { db, lang, t } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const deals = useMemo(
    () => db.products.filter((p) => p.status === 'active' && ((p.salePrice !== null && p.salePrice < p.price) || p.tags.includes('deal')))
      .sort((a, b) => (b.salePrice ? 1 - b.salePrice / b.price : 0) - (a.salePrice ? 1 - a.salePrice / a.price : 0)),
    [db.products]
  );
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4">
      <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
        <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-2.5 text-red-400"><Flame size={26} /></div>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-white">{t('deals')}</h1>
          <p className="text-[11px] font-semibold text-mute">{deals.length} {txt('offers available — while stock lasts', 'عروض متاحة — حتى نفاد الكمية', 'מבצעים זמינים — עד גמר המלאי')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
        {deals.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      <div className="mt-8 text-center">
        <Link to="/shop?sale=1" className="inline-flex h-11 items-center rounded-xl border border-electric/50 px-8 text-[12px] font-bold text-electric hover:bg-electric hover:text-ink">{txt('All sale items', 'كل التخفيضات', 'כל המבצעים')}</Link>
      </div>
    </div>
  );
}
