// BLITZ GAMING — product detail page
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Heart, GitCompareArrows, ShoppingCart, Zap, Truck, ShieldCheck, RotateCcw, ChevronRight, Minus, Plus, Check, Sparkles } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { ProductCard, productName } from '../components/ProductCard';
import { unitPrice } from '../lib/db';
import { fmtPrice } from '../lib/i18n';
import { productCategoryMembershipIds } from '../lib/categories';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { db, lang, t, dir, addToCart, toggleWishlist, wishlist, toggleCompare, compare, toast, customer } = useApp();
  const navigate = useNavigate();
  const ar = lang === 'ar';

  const product = db.products.find((p) => p.slug === slug && p.status === 'active');
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const firstAvailableVariant = product?.variants.find((v) => v.stock > 0) ?? product?.variants[0];
    setVariantId(firstAvailableVariant?.id ?? null);
    setQty(1);
    const linkedImageIndex = firstAvailableVariant?.imageIndex;
    setActiveImg(linkedImageIndex !== undefined && product?.images[linkedImageIndex] ? linkedImageIndex : 0);
  }, [product?.id]);

  const brand = product ? db.brands.find((b) => b.id === product.brandId) : null;
  const category = product ? db.categories.find((c) => c.id === product.categoryId) : null;

  const related = useMemo(() => {
    if (!product) return [];
    const productCategorySet = new Set(productCategoryMembershipIds(db.categories, product));
    return db.products
      .filter((p) => p.status === 'active' && p.id !== product.id && productCategoryMembershipIds(db.categories, p).some((id) => productCategorySet.has(id)))
      .concat(db.products.filter((p) => p.status === 'active' && p.id !== product.id && p.brandId === product.brandId))
      .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
      .slice(0, 6);
  }, [product, db.products, db.categories]);

  if (!product) return <Navigate to="/shop" replace />;

  const name = productName(product, lang);
  const desc = ar ? product.descAr : lang === 'he' ? (product.descHe || product.descEn) : product.descEn;
  const variant = product.variants.find((v) => v.id === variantId);
  const price = unitPrice(product, variantId);
  const regularPrice = Math.max(0, product.price + (variant?.priceDelta ?? 0));
  const stock = variant ? variant.stock : product.stock;
  const inStock = stock > 0;
  const savings = product.salePrice !== null && price < regularPrice ? regularPrice - price : 0;
  const savingsPct = savings > 0 ? Math.round((savings / Math.max(1, regularPrice)) * 100) : 0;
  const wished = wishlist.includes(product.id);
  const compared = compare.includes(product.id);
  const rewardPoints = product.loyaltyPoints !== undefined ? Math.max(0, Math.floor(product.loyaltyPoints)) : Math.max(0, Math.floor(price / 10) * (db.store.loyaltyPointsPer10Ils ?? 1));

  const add = () => { addToCart(product.id, variantId, qty); toast('success', ar ? 'أُضيفت إلى السلة' : lang === 'he' ? 'נוסף לעגלה' : 'Added to cart'); };
  const buyNow = () => { addToCart(product.id, variantId, qty); navigate('/checkout'); };

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      {/* breadcrumb */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-mute" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-electric">{t('home')}</Link>
        <ChevronRight size={12} className={dir === 'rtl' ? 'rotate-180' : ''} />
        {category && <Link to={`/category/${category.slug}`} className="hover:text-electric">{lang === 'ar' ? category.nameAr : lang === 'he' ? (category.nameHe || category.nameEn) : category.nameEn}</Link>}
        <ChevronRight size={12} className={dir === 'rtl' ? 'rotate-180' : ''} />
        <span className="max-w-56 truncate text-electric">{name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── gallery ── */}
        <div>
          <div
            className="relative overflow-hidden rounded-2xl border border-line bg-panel2"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
          >
            <img
              src={product.images[activeImg]}
              alt={name}
              className={`h-72 w-full object-cover transition-transform duration-500 sm:h-96 lg:h-[30rem] ${zoomed ? 'scale-[1.35] cursor-zoom-out' : ''}`}
            />
            {savingsPct > 0 && <span className="absolute start-3 top-3 rounded-md bg-red-600 px-2 py-1 font-display text-[13px] font-bold text-white">−{savingsPct}%</span>}
          </div>
          {product.images.length > 1 && (
            <div className="mt-2 flex gap-2">
              {product.images.map((src, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`overflow-hidden rounded-xl border ${i === activeImg ? 'border-electric' : 'border-line'}`}>
                  <img src={src} alt="" className="h-16 w-16 object-cover sm:h-20 sm:w-20" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── info ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/shop?brand=${brand?.slug}`} className="font-display text-sm font-bold uppercase tracking-[0.2em] text-electric hover:text-white">{brand?.name}</Link>
            <span className="rounded-md border border-line bg-panel2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mute">{t('sku')}: {product.sku}</span>
          </div>

          <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">{name}</h1>

          {/* Show social proof only when real review/sales data exists. */}
          {(product.rating > 0 || product.sold > 0) && (
            <div className="flex items-center gap-3 text-[11px] font-semibold text-mute">
              {product.rating > 0 && <span className="flex items-center gap-1 text-amber-400">{'★'.repeat(Math.round(product.rating))}<span className="text-mute">({product.rating.toFixed(1)})</span></span>}
              {product.rating > 0 && product.sold > 0 && <span>·</span>}
              {product.sold > 0 && <span>{product.sold} {ar ? 'مبيعة' : lang === 'he' ? 'נמכרו' : 'sold'}</span>}
            </div>
          )}

          {/* price */}
          <div className="rounded-2xl border border-line bg-panel p-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-4xl font-bold text-white">{fmtPrice(price, lang)}</span>
              {savings > 0 && <span className="font-display text-xl text-mute line-through">{fmtPrice(regularPrice, lang)}</span>}
              {savings > 0 && <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">{t('save')} {fmtPrice(savings, lang)}</span>}
            </div>
            <p className={`mt-2 text-[11px] font-bold ${inStock ? 'text-emerald-400' : 'text-red-400'}`}>
              {inStock ? `● ${t('in_stock')}` : `● ${t('out_of_stock')}`}
            </p>
          </div>
          {rewardPoints > 0 && <div className="flex items-center gap-2 rounded-xl border border-violet-accent/30 bg-violet-accent/10 px-3 py-2 text-[11px] font-semibold text-violet-200"><Sparkles size={15} className="shrink-0"/><span>{customer ? (ar ? `ستكسب ${rewardPoints} نقطة ولاء لكل قطعة` : lang === 'he' ? `תרוויחו ${rewardPoints} נקודות נאמנות לכל יחידה` : `Earn ${rewardPoints} loyalty points per unit`) : (ar ? `اكسب ${rewardPoints} نقطة ولاء لكل قطعة عند تسجيل الدخول` : lang === 'he' ? `הרוויחו ${rewardPoints} נקודות נאמנות ליחידה לאחר התחברות` : `Earn ${rewardPoints} loyalty points per unit when signed in`)}</span></div>}

          {/* variants */}
          {product.variants.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/70">{ar ? 'اختر النوع' : lang === 'he' ? 'בחרו אפשרות' : 'Choose variant'}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setVariantId(v.id); setQty(1); if (v.imageIndex !== undefined && product.images[v.imageIndex]) setActiveImg(v.imageIndex); }}
                    className={`relative flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[12px] font-semibold transition-all ${variantId === v.id ? 'border-electric bg-electric/15 text-electric shadow-[0_0_0_1px_#00a8ff]' : 'border-line bg-panel2 text-white/85 hover:border-electric/60'}`}
                  >
                    {v.label}{v.priceDelta !== 0 && <span className="text-mute">({v.priceDelta > 0 ? '+' : '−'}₪{Math.abs(v.priceDelta)})</span>}
                    {variantId === v.id && <Check size={13} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* qty + CTAs */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div className="flex h-12 items-center rounded-xl border border-line bg-panel2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-full w-11 items-center justify-center text-white/85 hover:text-electric" aria-label="Decrease quantity"><Minus size={17} /></button>
              <span className="w-10 text-center font-display text-lg font-bold">{qty}</span>
              <button onClick={() => setQty(Math.min(stock, qty + 1))} disabled={!inStock || qty >= stock} className="flex h-full w-11 items-center justify-center text-white/85 hover:text-electric disabled:cursor-not-allowed disabled:opacity-35" aria-label="Increase quantity"><Plus size={17} /></button>
            </div>
            <button onClick={add} disabled={!inStock} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-electric font-display text-base font-bold uppercase tracking-wide text-ink transition-all hover:bg-[#33baff] disabled:cursor-not-allowed disabled:bg-panel3 disabled:text-mute">
              <ShoppingCart size={19} strokeWidth={2.4} />{t('add_to_cart')}
            </button>
            <button onClick={buyNow} disabled={!inStock} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-electric/70 bg-transparent font-display text-base font-bold uppercase tracking-wide text-electric transition-all hover:bg-electric hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:text-mute">
              <Zap size={19} strokeWidth={2.4} />{t('buy_now')}
            </button>
            <button onClick={() => toggleWishlist(product.id)} className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${wished ? 'border-red-500/60 bg-red-500/15 text-red-400' : 'border-line bg-panel2 text-white/80 hover:text-red-400'}`} aria-label={t('wishlist')}>
              <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => toggleCompare(product.id)} className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${compared ? 'border-electric/60 bg-electric/15 text-electric' : 'border-line bg-panel2 text-white/80 hover:text-electric'}`} aria-label={t('add_to_compare')}>
              <GitCompareArrows size={20} />
            </button>
          </div>

          {/* delivery & warranty honesty block */}
          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-line bg-panel p-3 text-[11px] font-semibold text-white/75 sm:grid-cols-3">
            <span className="flex items-center gap-2"><Truck size={15} className="shrink-0 text-electric" />{ar ? 'رسوم التوصيل حسب المنطقة' : lang === 'he' ? 'דמי המשלוח תלויים באזור' : 'Delivery fee depends on region'}</span>
            <span className="flex items-center gap-2"><ShieldCheck size={15} className="shrink-0 text-electric" />{ar ? 'استفسر عن الكفالة لهذا المنتج' : lang === 'he' ? 'בררו לגבי אחריות המוצר' : 'Ask us about this product’s warranty'}</span>
            <span className="flex items-center gap-2"><RotateCcw size={15} className="shrink-0 text-electric" />{ar ? 'تأكد من شروط الاسترجاع قبل الطلب' : lang === 'he' ? 'בדקו את תנאי ההחזרה לפני ההזמנה' : 'Confirm return terms before ordering'}</span>
          </div>

          <p className="text-[12px] leading-relaxed text-white/75">{desc}</p>
        </div>
      </div>

      {/* specs */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase text-white">{t('specs')}</h2>
          <dl className="divide-y divide-line">
            {product.specs.map((s) => (
              <div key={s.key} className="grid grid-cols-2 gap-3 py-2.5 text-[12px]">
                <dt className="font-bold text-mute">{s.key}</dt>
                <dd className="font-semibold text-white/90">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase text-white">{t('delivery_returns')}</h2>
          <ul className="space-y-2.5 text-[12px] leading-relaxed text-white/75">
            <li className="flex gap-2"><Truck size={15} className="mt-0.5 shrink-0 text-electric" />{ar ? `الضفة الغربية ₪${db.delivery.westbank} · القدس ₪${db.delivery.jerusalem} · مناطق ١٩٤٨ ₪${db.delivery.inside48} — رسوم واحدة لكل طلب` : lang === 'he' ? `הגדה המערבית ₪${db.delivery.westbank} · ירושלים ₪${db.delivery.jerusalem} · אזורי 1948 ₪${db.delivery.inside48} — חיוב משלוח אחד להזמנה` : `West Bank ₪${db.delivery.westbank} · Jerusalem ₪${db.delivery.jerusalem} · 1948 Areas ₪${db.delivery.inside48} — one fee per order`}</li>
            <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-electric" />{ar ? 'تواصل معنا لتأكيد تفاصيل الكفالة والمعلومات الخاصة بهذا المنتج قبل الشراء.' : lang === 'he' ? 'פנו אלינו לאישור פרטי האחריות והמידע הספציפי למוצר לפני הרכישה.' : 'Contact us to confirm warranty coverage and product-specific details before purchasing.'}</li>
            <li className="flex gap-2"><RotateCcw size={15} className="mt-0.5 shrink-0 text-electric" />{ar ? 'قد تختلف شروط الاسترجاع حسب المنتج؛ يرجى التواصل معنا قبل الطلب.' : lang === 'he' ? 'תנאי ההחזרה עשויים להשתנות לפי המוצר; פנו אלינו לפני ההזמנה.' : 'Return eligibility may vary by product; please contact us before ordering.'}</li>
          </ul>
          <a href={`https://wa.me/${db.store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-2 text-[11px] font-bold text-[#25D366]">
            WhatsApp — {db.store.phone}
          </a>
        </section>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold uppercase text-white">{t('related')}</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
