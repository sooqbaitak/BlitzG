// BLITZ GAMING — brands directory
import { Link } from 'react-router-dom';
import { useApp } from '../lib/AppContext';
import { ChevronRight } from 'lucide-react';

export function Brands() {
  const { db, lang, dir } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const visible = db.brands.filter((b) => b.visible);
  const count = (brandId: string) => db.products.filter((p) => p.status === 'active' && p.brandId === brandId).length;

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4">
      <nav className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold text-mute">
        <Link to="/" className="hover:text-electric">{txt('Home', 'الرئيسية', 'ראשי')}</Link>
        <ChevronRight size={12} className={dir === 'rtl' ? 'rotate-180' : ''} />
        <span className="text-electric">{txt('Brands', 'الماركات', 'מותגים')}</span>
      </nav>
      <h1 className="font-display text-2xl font-bold uppercase text-white sm:text-3xl">{txt('Shop by Brand', 'تسوق حسب الماركة', 'קנייה לפי מותג')}</h1>
      <p className="mt-1 text-[12px] text-mute">{txt('Explore products by brand', 'استكشف المنتجات حسب الماركة', 'גלו מוצרים לפי מותג')}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((b) => (
          <Link key={b.id} to={`/shop?brand=${b.slug}`} className="card-glow flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-panel p-3 text-center">
            <span className="font-display text-base font-bold uppercase tracking-wider text-white/85">{b.name}</span>
            <span className="text-[10px] font-semibold text-electric">{count(b.id)} {txt('products', 'منتج', 'מוצרים')}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
