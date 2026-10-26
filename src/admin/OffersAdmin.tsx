import { useEffect, useMemo, useState } from 'react';
import { Flame, Search, Filter, Plus, Trash2, Save, CalendarClock, Tag, CheckCircle2 } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle, Button } from '../components/ui';
import { productName } from '../components/ProductCard';
import { fmtPrice } from '../lib/i18n';
import type { OfferCollection } from '../lib/types';

const makeOffer = (): OfferCollection => ({ id: `offer-${Date.now()}`, name: 'New offer', tag: '', active: true, productPrices: {} });

export function OffersAdmin() {
  const { db, setDb, lang, toast } = useApp(); const ar = lang === 'ar'; const he = lang === 'he';
  const txt = (en: string, arText: string, heText = en) => ar ? arText : he ? heText : en;
  const offers = db.store.offerCollections ?? [];
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [query, setQuery] = useState(''); const [categoryId, setCategoryId] = useState(''); const [brandId, setBrandId] = useState(''); const [saleOnly, setSaleOnly] = useState(false);

  useEffect(() => { if (!offers.some((o) => o.id === selectedOfferId)) setSelectedOfferId(offers[0]?.id ?? ''); }, [offers, selectedOfferId]);
  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId) ?? null;
  const products = useMemo(() => db.products.filter((p) => p.status === 'active')
    .filter((p) => !query || [p.nameEn, p.nameAr, p.sku, db.brands.find((b) => b.id === p.brandId)?.name ?? ''].some((v) => v.toLowerCase().includes(query.toLowerCase())))
    .filter((p) => !categoryId || p.categoryId === categoryId || (p.categoryIds ?? []).includes(categoryId))
    .filter((p) => !brandId || p.brandId === brandId)
    .filter((p) => !saleOnly || (p.salePrice !== null && p.salePrice < p.price)),
    [db.products, db.brands, query, categoryId, brandId, saleOnly]);

  const patchOffer = (id: string, patch: Partial<OfferCollection>) => setDb((old) => ({ ...old, store: { ...old.store, offerCollections: (old.store.offerCollections ?? []).map((o) => o.id === id ? { ...o, ...patch } : o) } }));
  const addOffer = () => { const offer = makeOffer(); setDb((old) => ({ ...old, store: { ...old.store, offerCollections: [...(old.store.offerCollections ?? []), offer] } })); setSelectedOfferId(offer.id); };
  const deleteOffer = (offer: OfferCollection) => {
    if (!window.confirm(txt(`Delete offer “${offer.name}”? Products will keep their current sale prices, if any.`, `حذف العرض «${offer.name}»؟ ستبقى أسعار التخفيض الحالية للمنتجات كما هي.`, `למחוק את המבצע “${offer.name}”? מחירי המבצע במוצרים יישארו כפי שהם.`))) return;
    setDb((old) => ({ ...old, store: { ...old.store, offerCollections: (old.store.offerCollections ?? []).filter((o) => o.id !== offer.id), seasonalCampaigns: (old.store.seasonalCampaigns ?? []).map((c) => c.offerCollectionId === offer.id ? { ...c, offerCollectionId: undefined } : c) } }));
    setSelectedOfferId('');
  };
  const toggleProduct = (productId: string, checked: boolean) => {
    if (!selectedOffer) return;
    const product = db.products.find((p) => p.id === productId);
    if (!product) return;
    setDb((old) => {
      const currentOffers = old.store.offerCollections ?? [];
      const nextOffers = currentOffers.map((offer) => {
        if (offer.id === selectedOffer.id) {
          const prices = { ...offer.productPrices };
          if (checked) prices[productId] = product.salePrice !== null && product.salePrice < product.price ? product.salePrice : Math.max(0, Math.round(product.price * 0.9 * 100) / 100);
          else delete prices[productId];
          return { ...offer, productPrices: prices };
        }
        // A product has one active offer price at a time to avoid competing discounts.
        if (checked && Object.prototype.hasOwnProperty.call(offer.productPrices, productId)) {
          const prices = { ...offer.productPrices }; delete prices[productId]; return { ...offer, productPrices: prices };
        }
        return offer;
      });
      const chosenPrice = checked ? (nextOffers.find((o) => o.id === selectedOffer.id)?.productPrices[productId]) : undefined;
      const productsNext = old.products.map((p) => p.id !== productId ? p : checked && chosenPrice !== undefined && chosenPrice >= 0 && chosenPrice < p.price
        ? { ...p, salePrice: chosenPrice, tags: p.tags.includes('deal') ? p.tags : [...p.tags, 'deal' as const] }
        : { ...p, salePrice: checked ? null : null, tags: p.tags.filter((tag) => tag !== 'deal') });
      return { ...old, products: productsNext, store: { ...old.store, offerCollections: nextOffers } };
    });
  };
  const updateOfferPrice = (productId: string, raw: string) => {
    if (!selectedOffer) return;
    const parsed = raw.trim() === '' ? undefined : Number(raw);
    const product = db.products.find((p) => p.id === productId);
    if (!product) return;
    setDb((old) => {
      const offerCollections = (old.store.offerCollections ?? []).map((offer) => {
        if (offer.id !== selectedOffer.id) return offer;
        const productPrices = { ...offer.productPrices };
        if (parsed === undefined || !Number.isFinite(parsed)) delete productPrices[productId]; else productPrices[productId] = Math.max(0, parsed);
        return { ...offer, productPrices };
      });
      return { ...old, store: { ...old.store, offerCollections }, products: old.products.map((p) => {
        if (p.id !== productId) return p;
        if (parsed !== undefined && Number.isFinite(parsed) && parsed >= 0 && parsed < p.price) return { ...p, salePrice: parsed, tags: p.tags.includes('deal') ? p.tags : [...p.tags, 'deal' as const] };
        return { ...p, salePrice: null, tags: p.tags.filter((tag) => tag !== 'deal') };
      }) };
    });
  };
  const clearAllOffers = () => {
    if (!selectedOffer || !window.confirm(txt('Remove this offer from all its products?', 'إزالة هذا العرض من جميع منتجاته؟', 'להסיר את המבצע מכל המוצרים שלו?'))) return;
    const ids = new Set(Object.keys(selectedOffer.productPrices));
    setDb((old) => ({ ...old, products: old.products.map((p) => ids.has(p.id) ? { ...p, salePrice: null, tags: p.tags.filter((tag) => tag !== 'deal') } : p), store: { ...old.store, offerCollections: (old.store.offerCollections ?? []).map((o) => o.id === selectedOffer.id ? { ...o, productPrices: {} } : o) } }));
  };

  const today = new Date();
  const currentOfferCount = selectedOffer ? Object.keys(selectedOffer.productPrices).length : 0;
  return <div className="mx-auto max-w-6xl space-y-4">
    <SectionTitle sub={txt('Create named offers containing multiple products. Each product price updates the storefront; tags and dates can be linked to seasonal banners.', 'أنشئ عروضاً بأسماء تضم عدة منتجات. يتحدث سعر كل منتج في المتجر، ويمكن ربط الوسوم والتواريخ بالإعلانات الموسمية.', 'צרו מבצעים בשם הכוללים מספר מוצרים. מחיר כל מוצר מתעדכן בחנות וניתן לקשר תגים ותאריכים לבאנרים עונתיים.')}><span className="flex items-center gap-2"><Flame size={19}/>{txt('Offers manager', 'إدارة العروض', 'ניהול מבצעים')}</span></SectionTitle>

    <section className="rounded-2xl border border-line bg-panel p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold text-white">{txt('Named offers', 'العروض المسماة', 'מבצעים בשם')}</h2><Button onClick={addOffer}><Plus size={14}/>{txt('Create offer', 'إنشاء عرض', 'יצירת מבצע')}</Button></div>
      {offers.length > 0 && <div className="flex flex-wrap gap-2">{offers.map((offer, index) => <button type="button" key={offer.id} onClick={() => setSelectedOfferId(offer.id)} className={`rounded-xl border px-3 py-2 text-start text-[11px] ${offer.id === selectedOfferId ? 'border-electric bg-electric/10 text-electric' : 'border-line bg-panel2 text-white/80'}`}><span className="font-bold">{offer.name || `${txt('Offer', 'عرض', 'מבצע')} ${index + 1}`}</span><span className="ms-2 text-[9px] opacity-70">{Object.keys(offer.productPrices).length} {txt('products', 'منتج', 'מוצרים')}</span></button>)}</div>}
      {!offers.length && <p className="rounded-xl border border-dashed border-line p-5 text-center text-xs text-mute">{txt('Create an offer to group products and attach a display tag or date range.', 'أنشئ عرضاً لتجميع المنتجات وإضافة وسم أو فترة عرض.', 'צרו מבצע כדי לקבץ מוצרים ולהוסיף תג או טווח תאריכים.')}</p>}
      {selectedOffer && <div className="space-y-3 rounded-xl border border-electric/25 bg-panel2/50 p-3">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-bold text-mute">{txt('Offer name (admin + storefront)', 'اسم العرض (للإدارة والمتجر)', 'שם המבצע (מנהל וחנות)')}<input value={selectedOffer.name} onChange={(e) => patchOffer(selectedOffer.id, { name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-3 text-[11px] text-white" placeholder="Black Friday Setup Deals"/></label><label className="text-[10px] font-bold text-mute">{txt('Offer tag / deadline message', 'وسم العرض / رسالة النهاية', 'תג מבצע / הודעת סיום')}<input value={selectedOffer.tag} onChange={(e) => patchOffer(selectedOffer.id, { tag: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-3 text-[11px] text-white" placeholder="Ends this month · Ramadan special"/></label></div>
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-[10px] font-bold text-mute">{txt('Start time (optional)', 'وقت البداية (اختياري)', 'זמן התחלה (אופציונלי)')}<input type="datetime-local" value={selectedOffer.startsAt ?? ''} onChange={(e) => patchOffer(selectedOffer.id, { startsAt: e.target.value || undefined })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-3 text-[11px] text-white"/></label><label className="text-[10px] font-bold text-mute">{txt('End time (optional)', 'وقت النهاية (اختياري)', 'זמן סיום (אופציונלי)')}<input type="datetime-local" value={selectedOffer.endsAt ?? ''} onChange={(e) => patchOffer(selectedOffer.id, { endsAt: e.target.value || undefined })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-3 text-[11px] text-white"/></label><label className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-[11px] text-white/80"><input type="checkbox" checked={selectedOffer.active} onChange={(e) => patchOffer(selectedOffer.id, { active: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Offer is active', 'العرض نشط', 'המבצע פעיל')}</label></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-mute"><Tag size={12} className="me-1 inline"/>{currentOfferCount} {txt('products included; products can belong to only one named offer at a time.', 'منتجات ضمن العرض؛ يمكن أن يكون المنتج ضمن عرض مسمى واحد في الوقت نفسه.', 'מוצרים כלולים; מוצר יכול להיות במבצע בשם אחד בכל פעם.')}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={clearAllOffers}><Trash2 size={13}/>{txt('Clear products', 'إزالة المنتجات', 'ניקוי מוצרים')}</Button><Button variant="danger" size="sm" onClick={() => deleteOffer(selectedOffer)}><Trash2 size={13}/>{txt('Delete offer', 'حذف العرض', 'מחיקת מבצע')}</Button></div></div>
      </div>}
    </section>

    <div className="grid gap-2 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="relative sm:col-span-2"><Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={txt('Search product / SKU / brand…','ابحث عن منتج أو SKU أو ماركة…','חיפוש מוצר / מק״ט / מותג…')} className="h-10 w-full rounded-xl border border-line bg-panel2 ps-9 pe-3 text-[11px] text-white"/></label><select value={categoryId} onChange={(e)=>setCategoryId(e.target.value)} className="h-10 rounded-xl border border-line bg-panel2 px-3 text-[11px] text-white"><option value="">{txt('All categories','كل الفئات','כל הקטגוריות')}</option>{db.categories.map((c)=><option key={c.id} value={c.id}>{ar?c.nameAr:he?(c.nameHe||c.nameEn):c.nameEn}</option>)}</select><select value={brandId} onChange={(e)=>setBrandId(e.target.value)} className="h-10 rounded-xl border border-line bg-panel2 px-3 text-[11px] text-white"><option value="">{txt('All brands','كل الماركات','כל המותגים')}</option>{db.brands.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select><label className="flex items-center gap-2 text-[11px] text-white/80"><input type="checkbox" checked={saleOnly} onChange={(e)=>setSaleOnly(e.target.checked)} className="accent-[#00a8ff]"/>{txt('Show offers only','العروض فقط','מבצעים בלבד')}</label></div>

    <div className="overflow-x-auto rounded-2xl border border-line bg-panel"><table className="w-full min-w-[760px] text-start"><thead><tr className="border-b border-line text-[9px] font-bold uppercase tracking-wide text-mute"><th className="p-3">{txt('Include','إضافة','כלול')}</th><th className="p-3">{txt('Product','المنتج','מוצר')}</th><th className="p-3">{txt('Original','الأصلي','מקורי')}</th><th className="p-3">{txt('Offer price','سعر العرض','מחיר מבצע')}</th><th className="p-3">{txt('Savings','التوفير','חיסכון')}</th></tr></thead><tbody>
      {products.map((p)=> { const included = Boolean(selectedOffer && Object.prototype.hasOwnProperty.call(selectedOffer.productPrices, p.id)); const offerPrice = selectedOffer?.productPrices[p.id]; const priceOkay = offerPrice !== undefined && offerPrice >= 0 && offerPrice < p.price; return <tr key={p.id} className="border-b border-line/70 last:border-0"><td className="p-3"><input aria-label={`Include ${p.nameEn} in offer`} type="checkbox" checked={included} disabled={!selectedOffer} onChange={(e)=>toggleProduct(p.id,e.target.checked)} className="h-4 w-4 accent-[#00a8ff]"/></td><td className="p-3"><div className="flex min-w-0 items-center gap-2"><img src={p.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover"/><div className="min-w-0"><p className="line-clamp-2 text-[10px] font-bold text-white/90">{productName(p,lang)}</p><p className="mt-0.5 truncate text-[9px] text-mute">{p.sku} · {db.brands.find((b)=>b.id===p.brandId)?.name}</p></div></div></td><td className="p-3 text-[10px] font-semibold text-white/75">{fmtPrice(p.price,lang)}</td><td className="p-3"><input aria-label={`Offer price for ${p.nameEn}`} type="number" min="0" max={Math.max(0,p.price-0.01)} step="0.01" disabled={!included} value={included ? String(offerPrice ?? '') : ''} onChange={(e)=>updateOfferPrice(p.id,e.target.value)} placeholder="—" className="h-9 w-28 rounded-lg border border-line bg-panel2 px-2 text-[11px] text-white disabled:opacity-40"/>{included && !priceOkay && <span className="mt-1 block text-[9px] text-amber-300">{txt('Enter a price below original.', 'أدخل سعراً أقل من الأصلي.', 'הזינו מחיר הנמוך מהמקורי.')}</span>}</td><td className="p-3 text-[10px] font-bold text-emerald-400">{priceOkay ? fmtPrice(p.price-offerPrice!,lang) : '—'}</td></tr>; })}
      {!products.length && <tr><td colSpan={5} className="p-10 text-center text-xs text-mute">{txt('No matching products.', 'لا توجد منتجات مطابقة.', 'לא נמצאו מוצרים מתאימים.')}</td></tr>}
    </tbody></table></div>
    <div className="flex items-start gap-2 rounded-xl border border-line bg-panel p-3 text-[10px] leading-relaxed text-mute"><CalendarClock size={14} className="mt-0.5 shrink-0 text-electric"/><p>{txt('Offer names, tags and date ranges are stored in Store Settings and can be selected from Seasonal Campaigns. Product sale prices are reflected in the storefront Offers page. The Offers page hides the group after its end time; product sale prices remain until changed here.', 'يتم حفظ أسماء العروض ووسومها وتواريخها ضمن إعدادات المتجر ويمكن اختيارها من الحملات الموسمية. تظهر أسعار المنتجات في صفحة العروض. تخفي صفحة العروض المجموعة بعد موعد الانتهاء؛ تبقى أسعار التخفيض حتى تعديلها هنا.', 'שמות המבצעים, התגים והתאריכים נשמרים בהגדרות החנות וניתנים לבחירה בקמפיינים עונתיים. מחירי המוצרים מופיעים בעמוד המבצעים. עמוד המבצעים מסתיר את הקבוצה לאחר מועד הסיום; מחירי המבצע נשארים עד לשינוי כאן.')} </p></div>
  </div>;
}
