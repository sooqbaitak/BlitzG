// BLITZ GAMING — product card
import { memo, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, GitCompareArrows, ShoppingCart, Zap, Flame, Sparkles, Layers } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { unitPrice } from '../lib/db';
import { fmtPrice } from '../lib/i18n';
import type { Product } from '../lib/types';
import type { Lang } from '../lib/i18n';

function ProductCardInner({ product }: { product: Product }) {
  const { db, lang, t, addToCart, toggleWishlist, wishlist, compare, toggleCompare, toast } = useApp();
  const navigate = useNavigate();
  const [variantId, setVariantId] = useState<string | null>(() => (product.variants.find((v) => v.stock > 0) ?? product.variants[0])?.id ?? null);

  const brand = db.brands.find((b) => b.id === product.brandId);
  const variant = product.variants.find((v) => v.id === variantId);
  const stock = variant ? variant.stock : product.stock;
  const inStock = stock > 0;
  const regularPrice = Math.max(0, product.price + (variant?.priceDelta ?? 0));
  const discountedPrice = product.salePrice === null ? null : Math.max(0, product.salePrice + (variant?.priceDelta ?? 0));
  const price = unitPrice(product, variantId);
  const discountPct = discountedPrice !== null && discountedPrice < regularPrice
    ? Math.round((1 - discountedPrice / Math.max(1, regularPrice)) * 100) : 0;
  const savings = discountPct > 0 && discountedPrice !== null ? regularPrice - discountedPrice : 0;
  const wished = wishlist.includes(product.id);
  const compared = compare.includes(product.id);

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const isDeal = product.tags.includes('deal');
  const isNew = product.tags.includes('new');
  const isCombo = product.tags.includes('combo');

  const handleAdd = () => {
    addToCart(product.id, variantId, 1);
    toast('success', lang === 'ar' ? 'أُضيفت إلى السلة' : 'Added to cart');
  };
  const handleBuyNow = () => {
    addToCart(product.id, variantId, 1);
    navigate('/checkout');
  };

  return (
    <div className="card-glow shine group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
      {/* image */}
      <div className="relative overflow-hidden bg-panel2">
        <Link to={`/product/${product.slug}`} aria-label={name}>
          <img
            src={variant?.imageIndex !== undefined && product.images[variant.imageIndex] ? product.images[variant.imageIndex] : product.images[0]}
            alt={name}
            loading="lazy"
            className="h-44 w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.06] sm:h-48"
          />
        </Link>
        {/* badges */}
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {discountPct > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
              <Flame size={11} strokeWidth={2.5} />−{discountPct}%
            </span>
          )}
          {isNew && (
            <span className="flex items-center gap-1 rounded-md bg-violet-accent px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
              <Sparkles size={11} strokeWidth={2.5} />{lang === 'ar' ? 'جديد' : 'NEW'}
            </span>
          )}
          {isCombo && (
            <span className="flex items-center gap-1 rounded-md bg-electric px-1.5 py-0.5 text-[10px] font-bold text-ink shadow">
              <Layers size={11} strokeWidth={2.5} />{lang === 'ar' ? 'بكج' : 'COMBO'}
            </span>
          )}
        </div>
        {/* wishlist / compare */}
        <div className="absolute end-2 top-2 flex flex-col gap-1.5">
          <button
            onClick={() => toggleWishlist(product.id)}
            aria-label={t('wishlist')}
            className={`rounded-lg border p-1.5 backdrop-blur transition-colors ${wished ? 'border-red-500/50 bg-red-500/20 text-red-400' : 'border-white/10 bg-black/55 text-white/85 hover:border-electric hover:text-electric'}`}
          >
            <Heart size={16} fill={wished ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
          <button
            onClick={() => toggleCompare(product.id)}
            aria-label={t('add_to_compare')}
            className={`rounded-lg border p-1.5 backdrop-blur transition-colors ${compared ? 'border-electric/60 bg-electric/20 text-electric' : 'border-white/10 bg-black/55 text-white/85 hover:border-electric hover:text-electric'}`}
          >
            <GitCompareArrows size={16} strokeWidth={2} />
          </button>
        </div>
        {/* stock flag */}
        <div className="absolute bottom-2 start-2">
          {!inStock ? (
            <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-red-400 backdrop-blur border border-red-500/30">{t('out_of_stock')}</span>
          ) : (
            <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 backdrop-blur border border-emerald-500/30">{t('in_stock')}</span>
          )}
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-electric">{brand?.name}</span>
          <span className="text-[9px] font-medium uppercase text-mute">{product.sku}</span>
        </div>
        <Link to={`/product/${product.slug}`} className="min-h-[2.5rem] text-[13px] font-semibold leading-snug text-white/95 hover:text-electric transition-colors line-clamp-2">
          {name}
        </Link>

        {/* variants */}
        {product.variants.length > 0 && (
          <select
            value={variantId ?? ''}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-line bg-panel2 px-2 py-1.5 text-[11px] text-white/90 outline-none focus:border-electric"
            aria-label={lang === 'ar' ? 'اختر النوع' : 'Choose variant'}
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>{v.label}{v.priceDelta !== 0 ? ` (${v.priceDelta > 0 ? '+' : '−'}₪${Math.abs(v.priceDelta)})` : ''}</option>
            ))}
          </select>
        )}

        {/* price row */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-bold leading-none text-white">{fmtPrice(price, lang)}</span>
              {discountPct > 0 && (
                <span className="text-[11px] text-mute line-through">{fmtPrice(regularPrice, lang)}</span>
              )}
            </div>
            {savings > 0 && (
              <span className="text-[9px] font-semibold text-emerald-400">{t('save')} {fmtPrice(savings, lang)}</span>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-1.5 flex gap-1.5">
          <button
            onClick={handleAdd}
            disabled={!inStock}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-electric text-[12px] font-bold text-ink transition-all hover:bg-[#33baff] disabled:cursor-not-allowed disabled:bg-panel3 disabled:text-mute"
          >
            <ShoppingCart size={15} strokeWidth={2.4} />
            {t('add_to_cart')}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!inStock}
            aria-label={t('buy_now')}
            title={t('buy_now')}
            className="flex h-9 w-10 items-center justify-center rounded-xl border border-electric/50 bg-electric/10 text-electric transition-all hover:bg-electric hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:text-mute"
          >
            <Zap size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardInner);

export function categoryName(c: { nameEn: string; nameAr: string; nameHe?: string }, lang: Lang) {
  return lang === 'ar' ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn;
}
// Product/model names intentionally stay in their brand's original display language.
export function productName(p: Product, lang: Lang) {
  return lang === 'ar' ? p.nameAr : p.nameEn;
}
export function useBrand(brandId: string) {
  const { db } = useApp();
  return useMemo(() => db.brands.find((b) => b.id === brandId), [db.brands, brandId]);
}
