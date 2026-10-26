// BLITZ GAMING — product carousel row
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronRight as ArrowMore } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { ProductCard } from './ProductCard';
import type { Product } from '../lib/types';

interface Props {
  title: string;
  viewAllTo?: string;
  products: Product[];
}

export function ProductCarousel({ title, viewAllTo, products }: Props) {
  const { lang, dir, t } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (delta: number) => {
    ref.current?.scrollBy({ left: delta * (dir === 'rtl' ? -1 : 1), behavior: 'smooth' });
  };

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-white sm:text-xl">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-electric to-violet-accent" />
          {title}
        </h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-electric hover:text-white">
            {t('view_all')}
            <ArrowMore size={13} className={dir === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        )}
      </div>
      <div className="relative">
        <div ref={ref} className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-3 pb-2 sm:-mx-4 sm:px-4">
          {products.map((p) => (
            <div key={p.id} className="w-[168px] shrink-0 snap-start sm:w-[190px]">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        {/* arrows (desktop) */}
        <button onClick={() => scroll(-340)} className="absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/80 text-white backdrop-blur hover:border-electric hover:text-electric md:flex md:-start-4" aria-label="Scroll back">
          {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button onClick={() => scroll(340)} className="absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/80 text-white backdrop-blur hover:border-electric hover:text-electric md:flex md:-end-4" aria-label="Scroll forward">
          {dir === 'rtl' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </section>
  );
}
