// BLITZ GAMING — cart page (persistent, editable quantities, discounts, totals)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, Zap, BadgePercent, X, ShieldCheck, Truck } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import type { ProductVariant } from '../lib/types';
import { productCategoryMembershipIds } from '../lib/categories';
import { lineTotal, unitPrice, validateCoupon } from '../lib/db';
import { fmtPrice } from '../lib/i18n';
import { productName } from '../components/ProductCard';
import { Button } from '../components/ui';

export function Cart() {
  const { db, lang, t, cart, setQty, removeFromCart, clearCart, toast, dir, customer, customerProfile } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const navigate = useNavigate();
  const [promo, setPromo] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const rows = cart.map((l) => {
    const p = db.products.find((x) => x.id === l.productId);
    if (!p) return null;
    const v = p.variants.find((x) => x.id === l.variantId);
    return { line: l, product: p, variant: v, price: unitPrice(p, l.variantId), total: lineTotal(p, l.variantId, l.qty) };
  }).filter(Boolean) as { line: { productId: string; variantId: string | null; qty: number }; product: NonNullable<ReturnType<typeof db.products.find>>; variant: ProductVariant | undefined; price: number; total: number }[];

  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const items = rows.map((r) => ({ productId: r.product.id, categoryId: r.product.categoryId, categoryIds: productCategoryMembershipIds(db.categories, r.product), qty: r.line.qty, unitPrice: r.price }));

  // Delivery is intentionally calculated only after the customer chooses an area at checkout.
  // Validate code eligibility here, but defer delivery-target discounts until the actual fee is known.
  const applied = appliedCode
    ? validateCoupon(db, appliedCode, { productSubtotal: subtotal, fullSubtotal: subtotal, eligibleSubtotal: subtotal, deliveryFee: 0, phone: '', items })
    : null;
  const discount = applied?.ok && applied.coupon?.target !== 'delivery' ? applied.discount : 0;
  const total = Math.max(0, subtotal - discount);

  const applyPromo = () => {
    const code = promo.trim();
    if (!code) return;
    const candidate = db.coupons.find((c) => c.code.trim().toUpperCase() === code.toUpperCase());
    if (candidate?.category === 'loyalty') {
      if (!customer) { setPromoMsg({ kind: 'err', text: txt('Sign in to use loyalty rewards.', 'سجّل الدخول لاستخدام مكافآت الولاء.', 'יש להתחבר כדי להשתמש בהטבות נאמנות.') }); setAppliedCode(null); return; }
      const required = candidate.pointsCost ?? 0;
      const points = customerProfile?.points ?? 0;
      if (points < required) { setPromoMsg({ kind: 'err', text: txt(`You need ${required} points; your balance is ${points}.`, `تحتاج إلى ${required} نقطة؛ رصيدك ${points}.`, `נדרשות ${required} נקודות; היתרה שלך ${points}.`) }); setAppliedCode(null); return; }
    }
    const result = validateCoupon(db, code, { productSubtotal: subtotal, fullSubtotal: subtotal, eligibleSubtotal: subtotal, deliveryFee: 0, phone: '', items });
    if (result.ok) {
      setAppliedCode(code.toUpperCase());
      setPromoMsg({ kind: 'ok', text: result.coupon?.target === 'delivery'
        ? txt('Code saved — the delivery discount will be calculated at checkout.', 'تم حفظ الكود — سيُحسب خصم التوصيل عند اختيار المنطقة في صفحة الدفع.', 'הקוד נשמר — הנחת המשלוח תחושב בקופה לאחר בחירת אזור.')
        : txt(`Code applied — you save ${fmtPrice(result.discount, lang)}.`, `تم تطبيق الكود — وفّرت ${fmtPrice(result.discount, lang)}.`, `הקוד הוחל — חסכת ${fmtPrice(result.discount, lang)}.`) });
    } else {
      setAppliedCode(null);
      const msgs: Record<string, { en: string; ar: string; he: string }> = {
        not_found: { en: 'Code not found.', ar: 'الكود غير موجود.', he: 'הקוד לא נמצא.' },
        inactive: { en: 'This code is inactive.', ar: 'هذا الكود غير مفعّل.', he: 'הקוד אינו פעיל.' },
        not_started: { en: 'This code is not active yet.', ar: 'هذا الكود لم تبدأ صلاحيته بعد.', he: 'תוקף הקוד עדיין לא התחיל.' },
        expired: { en: 'This code has expired.', ar: 'انتهت صلاحية هذا الكود.', he: 'תוקף הקוד פג.' },
        exhausted: { en: 'This code reached its usage limit.', ar: 'وصل هذا الكود للحد الأقصى للاستخدام.', he: 'הקוד הגיע למכסת השימוש שלו.' },
        min_subtotal: { en: 'Cart does not meet the minimum subtotal for this code.', ar: 'السلة لا تحقق الحد الأدنى المطلوب لهذا الكود.', he: 'סכום הסל נמוך מהמינימום הנדרש לקוד.' },
        ineligible: { en: 'This code does not apply to products in your cart.', ar: 'هذا الكود لا ينطبق على منتجات سلتك.', he: 'הקוד אינו חל על המוצרים בסל.' },
        per_customer: { en: 'You already used this code.', ar: 'لقد استخدمت هذا الكود من قبل.', he: 'כבר השתמשת בקוד זה.' },
      };
      const m = msgs[result.error ?? 'not_found'];
      setPromoMsg({ kind: 'err', text: lang === 'ar' ? m.ar : lang === 'he' ? m.he : m.en });
    }
  };

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-3xl border border-line bg-panel p-6"><ShoppingCart size={44} className="text-mute" /></div>
          <h1 className="font-display text-2xl font-bold uppercase text-white">{t('empty_cart')}</h1>
          <p className="max-w-sm text-[13px] text-mute">{txt('Browse the latest gear and fill your cart', 'تصفح أحدث المعدات وأضفها إلى سلتك', 'עיינו בציוד החדש והוסיפו אותו לעגלה')}</p>
          <Button size="lg" onClick={() => navigate('/shop')}>{t('continue_shopping')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-7">
      <h1 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold uppercase text-white"><ShoppingCart className="text-electric" />{t('cart')} <span className="text-mute">({rows.length})</span></h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* lines */}
        <div>
          <ul className="space-y-3">
            {rows.map(({ line, product, variant, price, total }) => (
              <li key={`${line.productId}-${line.variantId ?? 'base'}`} className="flex gap-3 rounded-2xl border border-line bg-panel p-3 sm:gap-4">
                <Link to={`/product/${product.slug}`} className="shrink-0">
                  <img src={variant?.imageIndex !== undefined && product.images[variant.imageIndex] ? product.images[variant.imageIndex] : product.images[0]} alt={productName(product, lang)} className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/product/${product.slug}`} className="line-clamp-2 text-[13px] font-semibold text-white/90 hover:text-electric">{productName(product, lang)}</Link>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-mute">{t('sku')}: {product.sku}{variant ? ` · ${variant.label}` : ''}</span>
                  <span className="mt-1 font-display text-base font-bold text-electric">{fmtPrice(price, lang)}</span>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="flex items-center rounded-xl border border-line bg-panel2">
                      <button onClick={() => setQty(line.productId, line.variantId, line.qty - 1)} className="flex h-9 w-9 items-center justify-center text-white/85 hover:text-electric" aria-label="Decrease"><Minus size={15} /></button>
                      <span className="w-9 text-center text-sm font-bold">{line.qty}</span>
                      <button onClick={() => setQty(line.productId, line.variantId, line.qty + 1)} className="flex h-9 w-9 items-center justify-center text-white/85 hover:text-electric" aria-label="Increase"><Plus size={15} /></button>
                    </div>
                    <span className="font-display text-base font-bold text-white sm:text-lg">{fmtPrice(total, lang)}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(line.productId, line.variantId)} className="self-start rounded-xl p-2 text-mute hover:bg-red-500/10 hover:text-red-400" aria-label="Remove"><Trash2 size={19} /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            <Link to="/shop" className="text-[12px] font-bold text-electric hover:text-white">{dir === 'rtl' ? '→ متابعة التسوق' : '← Continue shopping'}</Link>
            <button onClick={clearCart} className="text-[12px] font-bold text-mute hover:text-red-400">{txt('Clear cart', 'إفراغ السلة', 'ריקון העגלה')}</button>
          </div>
        </div>

        {/* summary */}
        <aside className="h-fit rounded-2xl border border-line bg-panel p-5 lg:sticky lg:top-36">
          <h2 className="font-display text-lg font-bold uppercase text-white">{txt('Order Summary', 'ملخص الطلب', 'סיכום ההזמנה')}</h2>

          {/* promo */}
          <div className="mt-3">
            {appliedCode ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[12px] font-bold text-emerald-400"><BadgePercent size={15} />{appliedCode}</span>
                <button onClick={() => { setAppliedCode(null); setPromoMsg(null); setPromo(''); }} className="rounded-md p-1 text-mute hover:text-white" aria-label="Remove coupon"><X size={16} /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promo}
                  onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoMsg(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                  placeholder={t('promo')}
                  className="h-11 w-full rounded-xl border border-line bg-panel2 px-3 text-[12px] font-bold uppercase tracking-wider text-white placeholder-mute outline-none focus:border-electric"
                  aria-label={t('promo')}
                />
                <Button variant="outline" size="md" onClick={applyPromo}>{t('apply_promo')}</Button>
              </div>
            )}
            {promoMsg && <p className={`mt-1.5 text-[11px] font-bold ${promoMsg.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{promoMsg.text}</p>}
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[13px]">
            <div className="flex items-center justify-between"><dt className="text-mute">{t('subtotal')}</dt><dd className="font-bold text-white/90">{fmtPrice(subtotal, lang)}</dd></div>
            {discount > 0 && <div className="flex items-center justify-between"><dt className="text-emerald-400">{t('discount')}{appliedCode ? ` (${appliedCode})` : ''}</dt><dd className="font-bold text-emerald-400">−{fmtPrice(discount, lang)}</dd></div>}
            <div className="flex items-center justify-between"><dt className="text-mute">{t('shipping')}</dt><dd className="text-end text-[11px] font-semibold text-white/70">{txt('Calculated at checkout', 'يُحسب عند الدفع', 'יחושב בקופה')}</dd></div>
            <div className="flex items-center justify-between border-t border-line pt-2"><dt className="font-display text-lg font-bold text-white">{t('total')}</dt><dd className="font-display text-2xl font-bold text-electric">{fmtPrice(total, lang)}</dd></div>
          </dl>

          <Button size="lg" className="mt-4 w-full" onClick={() => navigate('/checkout', { state: appliedCode ? { coupon: appliedCode } : undefined })}>
            <Zap size={18} strokeWidth={2.5} />{t('checkout')}
          </Button>
          <div className="mt-3 space-y-1 text-[10px] font-semibold text-mute">
            <p className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-electric" />{t('cash_on_delivery')} · {txt('No payment needed now', 'لا حاجة للدفع الآن', 'אין צורך בתשלום כעת')}</p>
            <p className="flex items-center gap-1.5"><Truck size={12} className="text-electric" />{txt('Delivery fees and delivery discounts are finalized at checkout.', 'تُحدد رسوم التوصيل وخصوماتها عند الدفع.', 'דמי המשלוח וההנחות עליהם נקבעים בקופה.')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
