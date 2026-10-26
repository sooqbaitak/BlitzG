// BLITZ GAMING — category-driven build-your-setup product selector
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Keyboard, Mouse, Headphones, Gamepad2, Monitor, Armchair, Cpu, MemoryStick,
  CircuitBoard, Fan, Speaker, Mic, ShoppingCart, Zap, Check, Plus, Minus,
} from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { fmtPrice } from '../lib/i18n';
import { unitPrice } from '../lib/db';
import { productName } from '../components/ProductCard';
import { categoryTreeIds, productMatchesCategoryTree } from '../lib/categories';
import type { Category, Product } from '../lib/types';

const DEFAULT_CATEGORY_IDS = ['c-keyboards', 'c-mice', 'c-headsets', 'c-controllers', 'c-monitors', 'c-chairs'];
const iconForCategory = (category: Category) => {
  const key = `${category.slug} ${category.nameEn}`.toLowerCase();
  if (key.includes('keyboard')) return Keyboard;
  if (key.includes('mice') || key.includes('mouse')) return Mouse;
  if (key.includes('headset') || key.includes('headphone')) return Headphones;
  if (key.includes('controller') || key.includes('gamepad')) return Gamepad2;
  if (key.includes('monitor') || key.includes('screen')) return Monitor;
  if (key.includes('chair')) return Armchair;
  if (key.includes('cpu') || key.includes('processor')) return Cpu;
  if (key.includes('ram') || key.includes('memory')) return MemoryStick;
  if (key.includes('motherboard') || key.includes('board')) return CircuitBoard;
  if (key.includes('fan') || key.includes('cooler')) return Fan;
  if (key.includes('speaker')) return Speaker;
  if (key.includes('microphone') || key.includes('mic')) return Mic;
  return Zap;
};

export function BuildSetup() {
  const { db, lang, t, addToCart, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const navigate = useNavigate();
  const configuredIds = db.store.buildSetupCategoryIds?.length ? db.store.buildSetupCategoryIds : DEFAULT_CATEGORY_IDS;
  const categories = useMemo(() => configuredIds
    .map((id) => db.categories.find((c) => c.id === id && c.visible !== false))
    .filter((c): c is Category => Boolean(c)), [configuredIds, db.categories]);
  const [activeCategoryId, setActiveCategoryId] = useState(configuredIds[0] ?? '');
  const [picks, setPicks] = useState<Record<string, Product | null>>({});
  const currentCategory = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
  const treeIds = useMemo(() => currentCategory ? categoryTreeIds(db.categories, currentCategory.id) : [], [db.categories, currentCategory?.id]);
  const products = useMemo(() => db.products
    .filter((p) => p.status === 'active' && productMatchesCategoryTree(p, treeIds))
    .sort((a, b) => (b.salePrice !== null ? 1 : 0) - (a.salePrice !== null ? 1 : 0) || b.sold - a.sold || a.nameEn.localeCompare(b.nameEn)), [db.products, treeIds]);

  const pickedProducts = categories.map((c) => picks[c.id]).filter((p): p is Product => Boolean(p));
  const purchasableVariant = (p: Product) => p.variants.length ? p.variants.find((v) => v.stock > 0) ?? null : null;
  const isAvailable = (p: Product) => p.variants.length ? p.variants.some((v) => v.stock > 0) : p.stock > 0;
  const selectedUnitPrice = (p: Product) => unitPrice(p, purchasableVariant(p)?.id ?? null);
  const total = pickedProducts.reduce((sum, p) => sum + selectedUnitPrice(p), 0);
  const selectedForCurrent = currentCategory ? picks[currentCategory.id] : null;
  const notice = ar ? db.store.buildSetupNoticeAr : he ? db.store.buildSetupNoticeHe : db.store.buildSetupNoticeEn;
  const localizedCategory = (c: Category) => ar ? c.nameAr : he ? (c.nameHe || c.nameEn) : c.nameEn;
  const chooseProduct = (p: Product) => {
    if (!isAvailable(p)) return;
    if (!currentCategory) return;
    setPicks((prev) => ({ ...prev, [currentCategory.id]: p }));
    toast('success', txt(`${productName(p, lang)} selected`, `تم اختيار ${productName(p, lang)}`, `נבחר ${productName(p, lang)}`));
  };
  const addAllToCart = () => {
    if (pickedProducts.length === 0) { toast('error', txt('Choose at least one product first.', 'اختر منتجاً واحداً على الأقل أولاً.', 'בחרו לפחות מוצר אחד.')); return; }
    for (const p of pickedProducts) addToCart(p.id, purchasableVariant(p)?.id ?? null, 1);
    toast('success', txt(`Added ${pickedProducts.length} products to your cart.`, `تمت إضافة ${pickedProducts.length} منتجات إلى السلة.`, `${pickedProducts.length} מוצרים נוספו לסל.`));
    navigate('/cart');
  };
  const removePick = (categoryId: string) => setPicks((prev) => ({ ...prev, [categoryId]: null }));

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-accent/40 bg-violet-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-accent"><Zap size={12} />{txt('Setup Builder', 'مصمم التجميعة', 'בונה הסטאפ')}</span>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase text-white sm:text-4xl">{t('build_setup')}</h1>
        <p className="mx-auto mt-1 max-w-2xl text-[12px] text-mute">{txt('Choose a category, then browse every available product in it. Select one item per category and build your setup.', 'اختر فئة ثم تصفح جميع منتجاتها المتاحة. اختر قطعة من كل فئة لتكوين إعدادك.', 'בחרו קטגוריה ועיינו בכל המוצרים הזמינים בה. בחרו פריט מכל קטגוריה כדי לבנות את הסטאפ.')}</p>
      </div>

      {notice?.trim() && <div role="status" className="mx-auto mb-5 max-w-5xl rounded-2xl border border-electric/30 bg-gradient-to-r from-electric/10 via-violet-accent/10 to-transparent px-4 py-3 text-center text-sm font-semibold text-white/90 shadow-lg shadow-electric/5"><Zap size={15} className="me-2 inline text-electric" />{notice}</div>}

      {categories.length === 0 ? <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center text-sm text-mute">{txt('Setup categories have not been configured yet.', 'لم يتم إعداد فئات التجميعة بعد.', 'קטגוריות הסטאפ עדיין לא הוגדרו.')}</div> : <>
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => {
            const Icon = iconForCategory(c);
            const active = c.id === (currentCategory?.id ?? activeCategoryId);
            const picked = Boolean(picks[c.id]);
            return <button key={c.id} onClick={() => setActiveCategoryId(c.id)} className={`flex min-w-[112px] flex-col items-center justify-center gap-1 rounded-xl border px-4 py-3 text-center transition-all ${active ? 'border-electric bg-electric/15 text-electric shadow-[0_0_0_1px_rgba(0,168,255,.2)]' : picked ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-line bg-panel text-white/65 hover:border-electric/40 hover:text-white'}`}>
              <Icon size={18}/><span className="max-w-36 text-[10px] font-bold">{localizedCategory(c)}</span>{picked && <Check size={12}/>}
            </button>;
          })}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-electric">{txt('SELECT A PRODUCT', 'اختر منتجاً', 'בחרו מוצר')}</p><h2 className="mt-1 font-display text-xl font-bold text-white">{currentCategory ? localizedCategory(currentCategory) : ''}</h2></div>
              <span className="text-[11px] text-mute">{products.length} {txt('products', 'منتج', 'מוצרים')}</span>
            </div>
            {products.length === 0 ? <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center"><ShoppingCart size={30} className="mx-auto text-mute"/><p className="mt-3 text-sm font-bold text-white">{txt('No products in this category yet', 'لا توجد منتجات في هذه الفئة حالياً', 'אין מוצרים בקטגוריה זו עדיין')}</p><p className="mt-1 text-[11px] text-mute">{txt('Add active products from the admin dashboard.', 'أضف منتجات منشورة من لوحة الإدارة.', 'הוסיפו מוצרים פעילים מלוח הניהול.')}</p></div> : <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {products.map((p) => {
                const chosen = selectedForCurrent?.id === p.id;
                const price = selectedUnitPrice(p);
                const available = isAvailable(p);
                const variantForSetup = purchasableVariant(p);
                const regularPrice = Math.max(0, p.price + (variantForSetup?.priceDelta ?? 0));
                const brand = db.brands.find((b) => b.id === p.brandId)?.name;
                return <article key={p.id} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-panel transition-all ${chosen ? 'border-electric shadow-[0_0_0_1px_rgba(0,168,255,.35)]' : 'border-line hover:border-electric/40'}`}>
                  <div className="relative h-40 bg-panel2 sm:h-44"><img src={(variantForSetup?.imageIndex !== undefined ? p.images[variantForSetup.imageIndex] : p.images[0]) || '/img/keyboard.jpg'} alt={productName(p, lang)} loading="lazy" className="h-full w-full object-cover"/><span className={`absolute end-2 top-2 rounded-md px-2 py-1 text-[9px] font-bold ${available ? 'bg-black/70 text-emerald-300' : 'bg-red-600/90 text-white'}`}>{available ? txt('Available', 'متوفر', 'זמין') : txt('Out of stock', 'نفد المخزون', 'אזל מהמלאי')}</span></div>
                  <div className="flex flex-1 flex-col p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-electric">{brand || 'BLITZ GAMING'} · {p.sku}</p><h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-snug text-white">{productName(p, lang)}</h3><div className="mt-auto flex items-end justify-between gap-2 pt-3"><div><p className="font-display text-xl font-bold text-white">{fmtPrice(price, lang)}</p>{p.salePrice !== null && <p className="text-[10px] text-mute line-through">{fmtPrice(regularPrice, lang)}</p>}{variantForSetup && <p className="mt-1 text-[9px] text-mute">{variantForSetup.label}</p>}</div><button disabled={!available} onClick={() => chooseProduct(p)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${chosen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-electric text-ink hover:bg-white'}`}>{chosen ? <Check size={14}/> : <Plus size={14}/>}{chosen ? txt('Selected', 'تم الاختيار', 'נבחר') : txt('Choose', 'اختر', 'בחרו')}</button></div></div>
                </article>;
              })}
            </div>}
          </section>

          <aside className="rounded-2xl border border-line bg-panel p-4 xl:sticky xl:top-24">
            <div className="flex items-center justify-between"><h2 className="font-display text-base font-bold uppercase text-white">{txt('Your Setup', 'تجميعتك', 'הסטאפ שלכם')}</h2><span className="rounded-full border border-line bg-panel2 px-2 py-1 text-[10px] font-bold text-mute">{pickedProducts.length}/{categories.length}</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel3"><div className="h-full bg-gradient-to-r from-electric to-violet-accent transition-all" style={{ width: `${categories.length ? pickedProducts.length / categories.length * 100 : 0}%` }}/></div>
            <div className="mt-3 space-y-2">{categories.map((c) => { const p = picks[c.id]; const variantForPreview = p?.variants.find((v) => v.stock > 0); const previewImage = p && variantForPreview?.imageIndex !== undefined ? p.images[variantForPreview.imageIndex] : p?.images[0]; return <div key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel2 p-2">{p ? <><img src={previewImage || '/img/keyboard.jpg'} alt="" className="h-11 w-11 rounded-lg object-cover"/><div className="min-w-0 flex-1"><p className="text-[9px] font-bold text-electric">{localizedCategory(c)}</p><p className="line-clamp-1 text-[10px] font-semibold text-white">{productName(p, lang)}</p><p className="text-[10px] text-mute">{fmtPrice(selectedUnitPrice(p), lang)}</p></div><button onClick={() => removePick(c.id)} className="rounded-lg p-1 text-mute hover:text-red-400" title={txt('Remove', 'إزالة', 'הסר')}><Minus size={14}/></button></> : <button onClick={() => setActiveCategoryId(c.id)} className="flex w-full items-center gap-2 text-start text-[10px] font-semibold text-mute hover:text-electric"><Plus size={14}/><span className="flex-1">{localizedCategory(c)}</span><span>{txt('Choose item', 'اختر قطعة', 'בחרו פריט')}</span></button>}</div>; })}</div>
            <div className="mt-4 border-t border-line pt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">{txt('Estimated total', 'الإجمالي التقديري', 'סכום משוער')}</p><p className="mt-1 font-display text-3xl font-bold text-white">{fmtPrice(total, lang)}</p><p className="mt-1 text-[9px] text-mute">{txt('Delivery is calculated at checkout.', 'يتم احتساب التوصيل عند إتمام الطلب.', 'המשלוח מחושב בקופה.')}</p><button onClick={addAllToCart} disabled={pickedProducts.length === 0} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric to-violet-accent font-display text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><ShoppingCart size={16}/>{txt('Add setup to cart', 'أضف التجميعة للسلة', 'הוסיפו את הסטאפ לסל')}</button></div>
          </aside>
        </div>
      </>}
    </div>
  );
}
