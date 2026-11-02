// BLITZ GAMING — offers / deals page
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Flame, Tag, CalendarClock, ShoppingCart } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { ProductCard } from '../components/ProductCard';
import { productName } from '../lib/productPresentation';
import { fmtPrice } from '../lib/i18n';
import type { OfferCollection } from '../lib/types';

function offerIsCurrent(offer: OfferCollection, now: number): boolean {
  if (!offer.active) return false;
  const starts = offer.startsAt ? new Date(offer.startsAt).getTime() : Number.NEGATIVE_INFINITY;
  const ends = offer.endsAt ? new Date(offer.endsAt).getTime() : Number.POSITIVE_INFINITY;
  return (!Number.isFinite(starts) || now >= starts) && (!Number.isFinite(ends) || now <= ends);
}

export function Offers() {
  const { db, lang, t, addToCart, toast } = useApp();
  const [searchParams] = useSearchParams();
  const selectedOfferId = searchParams.get('offer');
  const ar = lang === 'ar'; const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);
  const groupedOffers = useMemo(() => (db.store.offerCollections ?? []).filter((offer) => {
    if (!offerIsCurrent(offer, now) || Object.keys(offer.productPrices ?? {}).length === 0) return false;
    if ((offer.type ?? 'single') !== 'group') return true;
    const ids = Object.keys(offer.productPrices ?? {});
    return ids.length >= 2 && ids.every((id) => db.products.some((product) => product.id === id && product.status === 'active'));
  }), [db.store.offerCollections, db.products, now]);
  const groupedProductIds = useMemo(() => new Set((db.store.offerCollections ?? []).flatMap((offer) => Object.keys(offer.productPrices))), [db.store.offerCollections]);
  const deals = useMemo(() => db.products.filter((p) => p.status === 'active' && !groupedProductIds.has(p.id) && ((p.salePrice !== null && p.salePrice < p.price) || p.tags.includes('deal')))
    .sort((a, b) => (b.salePrice ? 1 - b.salePrice / b.price : 0) - (a.salePrice ? 1 - a.salePrice / a.price : 0)), [db.products, groupedProductIds]);

  useEffect(() => {
    if (!selectedOfferId) return;
    const timer = window.setTimeout(() => document.getElementById(`offer-${selectedOfferId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => window.clearTimeout(timer);
  }, [selectedOfferId, groupedOffers.length]);

  const formatDeadline = (value?: string) => value ? new Date(value).toLocaleString(lang === 'ar' ? 'ar' : lang === 'he' ? 'he' : 'en', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const addWholeGroup = (offerName: string, groupProducts: NonNullable<typeof db.products[number]>[]) => {
    const selections = groupProducts.map((product) => {
      if (product.variants.length) { const variant = product.variants.find((v) => v.stock > 0); return variant ? { product, variantId: variant.id } : null; }
      return product.stock > 0 ? { product, variantId: null } : null;
    });
    if (selections.some((selection) => !selection)) { toast('error', txt('This bundle is currently out of stock in at least one item.', 'إحدى قطع هذه المجموعة غير متوفرة حالياً.', 'לפחות פריט אחד בחבילה אזל מהמלאי.')); return; }
    selections.forEach((selection) => { if (selection) addToCart(selection.product.id, selection.variantId, 1); });
    toast('success', txt(`${offerName}: one of each item was added to your cart.`, `تمت إضافة قطعة من كل منتج من ${offerName} إلى السلة.`, `נוספה יחידה מכל פריט של ${offerName} לעגלה.`));
  };
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4">
      <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
        <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-2.5 text-red-400"><Flame size={26} /></div>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-white">{t('deals')}</h1>
          <p className="text-[11px] font-semibold text-mute">{groupedOffers.length + deals.length} {txt('offers available — while stock lasts', 'عروض متاحة — حتى نفاد الكمية', 'מבצעים זמינים — עד גמר המלאי')}</p>
        </div>
      </div>
      {groupedOffers.map((offer) => {
        const isGroup = (offer.type ?? 'single') === 'group';
        const products = Object.keys(offer.productPrices).map((id) => db.products.find((p) => p.id === id)).filter((p) => p && p.status === 'active' && (isGroup || (p.salePrice !== null && p.salePrice < p.price)));
        if (!products.length) return null;
        const originalTotal = products.reduce((sum, p) => sum + (isGroup ? p!.price : Math.max(0, p!.price - (p!.salePrice ?? p!.price)) + (p!.salePrice ?? p!.price)), 0);
        const bundlePrice = Math.max(0, offer.bundlePrice ?? 0);
        const bundleSaving = Math.max(0, originalTotal - bundlePrice);
        return <section id={`offer-${offer.id}`} key={offer.id} className={`mb-7 scroll-mt-24 rounded-2xl border p-3 sm:p-4 ${selectedOfferId === offer.id ? 'border-electric/70 ring-1 ring-electric/20' : 'border-line'}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="min-w-0"><h2 className="text-lg font-extrabold text-white">{offer.name || txt('Special offer', 'عرض خاص', 'מבצע מיוחד')}</h2>
              {offer.tag && <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-electric/10 px-2.5 py-1 text-[10px] font-bold text-electric"><Tag size={11}/>{offer.tag}</p>}
              {(offer.startsAt || offer.endsAt) && <p className="mt-1 flex items-center gap-1 text-[9px] text-mute"><CalendarClock size={11}/>{offer.startsAt ? `${txt('From', 'من', 'מ־')} ${formatDeadline(offer.startsAt)}` : ''}{offer.startsAt && offer.endsAt ? ' · ' : ''}{offer.endsAt ? `${txt('Until', 'حتى', 'עד')} ${formatDeadline(offer.endsAt)}` : ''}</p>}
              {isGroup && <p className="mt-2 text-[10px] text-mute">{txt('Bundle includes:', 'المجموعة تشمل:', 'החבילה כוללת:')} {products.map((p) => productName(p!, lang)).join(' · ')}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 text-end">{isGroup && <><p className="text-[10px] font-bold text-mute line-through">{fmtPrice(originalTotal, lang)}</p><p className="font-display text-lg font-extrabold text-electric">{fmtPrice(bundlePrice, lang)}</p><p className="text-[10px] font-bold text-emerald-400">{txt('Save', 'وفّر', 'חיסכון')} {fmtPrice(bundleSaving, lang)}</p><button type="button" onClick={() => addWholeGroup(offer.name || txt('Special offer', 'عرض خاص', 'מבצע מיוחד'), products.filter((item): item is NonNullable<typeof item> => Boolean(item)))} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-electric px-3 text-[10px] font-extrabold text-ink hover:brightness-110"><ShoppingCart size={14}/>{txt('Add bundle to cart', 'أضف المجموعة للسلة', 'הוסף חבילה לעגלה')}</button><span className="max-w-48 text-[9px] text-mute">{txt('Adds one of each included product. The bundle price applies automatically.', 'يضيف قطعة من كل منتج. يُطبّق سعر المجموعة تلقائياً.', 'מוסיף יחידה מכל מוצר. מחיר החבילה יחול אוטומטית.')}</span></>}{selectedOfferId === offer.id && <span className="mt-1 inline-block rounded-full bg-electric/10 px-2.5 py-1 text-[9px] font-bold text-electric">{txt('Selected offer', 'العرض المختار', 'המבצע הנבחר')}</span>}</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">{products.map((p) => p && <ProductCard key={p.id} product={p}/>)}</div>
        </section>;
      })}
      {deals.length > 0 && <section className="mb-6"><h2 className="mb-3 text-lg font-extrabold text-white">{groupedOffers.length ? txt('More deals', 'عروض أخرى', 'מבצעים נוספים') : txt('Special prices', 'أسعار خاصة', 'מחירים מיוחדים')}</h2><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">{deals.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>}
      {!groupedOffers.length && !deals.length && <p className="py-16 text-center text-mute">{txt('No current offers.', 'لا توجد عروض حالياً.', 'אין מבצעים כרגע.')}</p>}
      <div className="mt-8 text-center"><Link to="/shop?sale=1" className="inline-flex h-11 items-center rounded-xl border border-electric/50 px-8 text-[12px] font-bold text-electric hover:bg-electric hover:text-ink">{txt('All sale items', 'كل التخفيضات', 'כל המבצעים')}</Link></div>
    </div>
  );
}
