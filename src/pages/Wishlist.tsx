// BLITZ GAMING — wishlist
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/AppContext';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui';

export function Wishlist() {
  const { db, lang, t, wishlist } = useApp();
  const ar = lang === 'ar';
  const products = db.products.filter((p) => wishlist.includes(p.id));
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4">
      <h1 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold uppercase text-white"><Heart className="text-red-400" />{t('wishlist')} <span className="text-mute">({products.length})</span></h1>
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Heart size={44} className="text-mute" />
          <p className="text-mute">{t('wishlist_empty')}</p>
          <Link to="/shop"><Button size="lg">{t('continue_shopping')}</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
