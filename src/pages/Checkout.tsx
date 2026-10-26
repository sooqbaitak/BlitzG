// BLITZ GAMING — checkout: COD, delivery areas, server-validated coupons, persisted orders
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Zap, BadgePercent, X, Truck, ShieldCheck, ShoppingCart, Lock, CreditCard, Wallet, Smartphone, Building2, Banknote } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { productCategoryMembershipIds } from '../lib/categories';
import { unitPrice, lineTotal, deliveryFeeFor, deliveryAreaNameFor, validateCoupon, placeOrder } from '../lib/db';
import { cloudConfigured, createCloudOrder, fetchPaymentCapabilities, startCardPayment } from '../lib/cloud';
import { readCustomerAuth } from '../lib/cloud';
import { notifyAdminOfNewOrder } from '../lib/email';
import { fmtPrice, t as ti18n } from '../lib/i18n';
import { productName } from '../components/ProductCard';
import { Button, Input, TextArea, Select } from '../components/ui';
import type { DeliveryArea } from '../lib/types';
import { PAYMENT_METHODS, normalizePaymentMethods, hasBankTransferDetails, isOperationalPaymentMethod, type PaymentMethodId } from '../lib/payments';

export function Checkout() {
  const { db, setDb, lang, t, cart, clearCart, toast, customer, customerProfile, refreshCustomerProfile } = useApp();
  const ar = lang === 'ar';
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState<DeliveryArea>('westbank');
  const [buildPreference, setBuildPreference] = useState<'assemble' | 'parts'>('parts');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [promo, setPromo] = useState((location.state as { coupon?: string } | null)?.coupon ?? '');
  const [appliedCode, setAppliedCode] = useState<string | null>((location.state as { coupon?: string } | null)?.coupon ?? null);
  const [promoMsg, setPromoMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodId>('cod');
  const [cardGatewayReady, setCardGatewayReady] = useState(false);
  const [cardGatewayMode, setCardGatewayMode] = useState<'test' | 'live' | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchPaymentCapabilities().then((result) => { if (active) { setCardGatewayReady(result.cardReady); setCardGatewayMode(result.mode); } }).catch(() => { if (active) setCardGatewayReady(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => cart.map((l) => {
    const p = db.products.find((x) => x.id === l.productId);
    if (!p) return null;
    const v = p.variants.find((x) => x.id === l.variantId);
    return { line: l, product: p, variant: v, price: unitPrice(p, l.variantId), total: lineTotal(p, l.variantId, l.qty) };
  }).filter(Boolean) as { line: typeof cart[number]; product: NonNullable<ReturnType<typeof db.products.find>>; variant: { id: string; label: string; priceDelta: number; stock: number } | undefined; price: number; total: number }[], [cart, db.products]);

  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const items = rows.map((r) => ({ productId: r.product.id, categoryId: r.product.categoryId, categoryIds: productCategoryMembershipIds(db.categories, r.product), qty: r.line.qty, unitPrice: r.price }));
  const deliveryFee = deliveryFeeFor(db, area);
  const isPcBuildCart = rows.some((r) => { const category = db.categories.find((c) => c.id === r.product.categoryId); return r.product.categoryId === 'c-pcs' || r.product.categoryId === 'c-components' || Boolean(category?.parentId === 'c-components') || ['c-motherboards','c-gpus','c-cpus','c-ram','c-storage','c-cpu-coolers','c-fans','c-cable-management'].includes(r.product.categoryId); });

  const applied = appliedCode
    ? validateCoupon(db, appliedCode, { productSubtotal: subtotal, fullSubtotal: subtotal, eligibleSubtotal: subtotal, deliveryFee, phone: phone.trim(), items })
    : null;
  const productDiscount = applied?.ok ? applied.discount : 0;
  const personalDiscountPercent = customer ? Math.min(100, Math.max(0, Number(customerProfile?.discount_percent ?? 0))) : 0;
  const personalDiscount = customerProfile?.blocked ? 0 : Math.round(Math.max(0, subtotal - productDiscount) * personalDiscountPercent) / 100;
  const combinedProductDiscount = Math.min(subtotal, productDiscount + personalDiscount);
  const deliveryDiscount = applied?.ok ? applied.deliveryDiscount : 0;
  const effectiveDelivery = Math.max(0, deliveryFee - deliveryDiscount);
  const total = Math.max(0, subtotal - combinedProductDiscount) + effectiveDelivery;
  const enabledPaymentMethods = normalizePaymentMethods(db.store.paymentMethods).filter((method) => method.enabled);
  const bankTransferReady = cloudConfigured && hasBankTransferDetails(db.store.bankTransferDetails);
  const paymentOperational = (id: PaymentMethodId) => isOperationalPaymentMethod(id, { cloudConfigured, cardGatewayReady, bankTransferReady });

  // revalidate when phone/area/items change
  useEffect(() => {
    if (appliedCode && applied && !applied.ok) {
      setPromoMsg({ kind: 'err', text: ar ? 'الكود لم يعد صالحاً لهذا الطلب' : lang === 'he' ? 'הקוד אינו תקף עוד להזמנה זו' : 'This code is no longer valid for this order' });
      setAppliedCode(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, area, subtotal]);

  const applyPromo = () => {
    const code = promo.trim();
    if (!code) return;
    const candidate = db.coupons.find((c) => c.code.trim().toUpperCase() === code.toUpperCase());
    if (candidate?.category === 'loyalty') {
      if (!customer) { setPromoMsg({ kind: 'err', text: ar ? 'سجّل الدخول لاستخدام أكواد الولاء.' : lang === 'he' ? 'יש להתחבר כדי להשתמש בקודי נאמנות.' : 'Sign in to use loyalty reward codes.' }); return; }
      const points = customerProfile?.points ?? 0;
      const required = candidate.pointsCost ?? 0;
      if (points < required) { setPromoMsg({ kind: 'err', text: ar ? `تحتاج إلى ${required} نقطة؛ رصيدك ${points}.` : lang === 'he' ? `נדרשות ${required} נקודות; היתרה שלך ${points}.` : `You need ${required} points; your balance is ${points}.` }); return; }
    }
    const result = validateCoupon(db, code, { productSubtotal: subtotal, fullSubtotal: subtotal, eligibleSubtotal: subtotal, deliveryFee, phone: phone.trim(), items });
    if (result.ok) {
      setAppliedCode(code.toUpperCase());
      setPromoMsg({ kind: 'ok', text: ar ? `تم تطبيق ${code.toUpperCase()} — وفّرت ${fmtPrice(result.discount + result.deliveryDiscount, lang)}` : lang === 'he' ? `${code.toUpperCase()} הוחל — חסכת ${fmtPrice(result.discount + result.deliveryDiscount, lang)}` : `${code.toUpperCase()} applied — you save ${fmtPrice(result.discount + result.deliveryDiscount, lang)}` });
    } else {
      setAppliedCode(null);
      const minimum = db.coupons.find(c => c.code.toUpperCase() === code.toUpperCase())?.minSubtotal;
      const msgs: Record<string, { en: string; ar: string; he: string }> = {
        not_found: { en: 'This code does not exist or was mistyped.', ar: 'هذا الكود غير موجود أو مكتوب بشكل خاطئ.', he: 'הקוד לא קיים או הוזן באופן שגוי.' },
        inactive: { en: 'This code is currently inactive.', ar: 'هذا الكود غير مفعّل حالياً.', he: 'הקוד אינו פעיל כרגע.' },
        not_started: { en: 'This code is not valid yet.', ar: 'هذا الكود غير صالح بعد.', he: 'תוקף הקוד עדיין לא התחיל.' },
        expired: { en: 'This code has expired.', ar: 'انتهت صلاحية هذا الكود.', he: 'תוקף הקוד פג.' },
        exhausted: { en: 'This code reached its redemption limit.', ar: 'استُنفدت كل استخدامات هذا الكود.', he: 'הקוד הגיע למכסת המימוש שלו.' },
        min_subtotal: { en: `This code requires a minimum subtotal of ₪${minimum}.`, ar: `هذا الكود يتطلب حداً أدنى ${minimum} شيكل.`, he: `הקוד דורש סכום ביניים מינימלי של ₪${minimum}.` },
        ineligible: { en: 'Your cart has no eligible products for this code.', ar: 'لا توجد منتجات مؤهلة في سلتك لهذا الكود.', he: 'אין בסל מוצרים המתאימים לקוד זה.' },
        per_customer: { en: 'You have already used this code the maximum number of times.', ar: 'لقد استخدمت هذا الكود الحد الأقصى المسموح به.', he: 'השתמשת בקוד זה במספר הפעמים המרבי.' },
      };
      const m = msgs[result.error ?? 'not_found'];
      setPromoMsg({ kind: 'err', text: ar ? m.ar : lang === 'he' ? m.he : m.en });
    }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 3) e.name = ar ? 'الاسم الكامل مطلوب (3 أحرف على الأقل)' : lang === 'he' ? 'יש להזין שם מלא (לפחות 3 תווים)' : 'Full name is required (min 3 chars)';
    const normalizedPhone = phone.trim().replace(/[\s().-]/g, '');
    const validMobile = /^(?:\+9705\d{8}|\+9725\d{8}|05\d{8}|5\d{8})$/.test(normalizedPhone);
    if (!validMobile) e.phone = ar ? 'أدخل رقم جوال صالحاً يبدأ بـ 05 أو +970 أو +972' : lang === 'he' ? 'יש להזין מספר נייד תקין המתחיל ב־05, ‎+970 או ‎+972' : 'Enter a valid mobile number starting with 05, +970 or +972.';
    if (city.trim().length < 2) e.city = ar ? 'المدينة / البلدة مطلوبة' : lang === 'he' ? 'יש להזין עיר או יישוב' : 'Town / city is required';
    if (address.trim().length < 6) e.address = ar ? 'العنوان بالتفصيل مطلوب (6 أحرف على الأقل)' : lang === 'he' ? 'יש להזין כתובת מלאה (לפחות 6 תווים)' : 'Detailed address is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = ar ? 'البريد غير صالح' : lang === 'he' ? 'כתובת הדוא״ל אינה תקינה' : 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeTheOrder = async () => {
    if (customerProfile?.blocked) { toast('error', ar ? 'تم إيقاف هذا الحساب. تواصل مع المتجر للمساعدة.' : lang === 'he' ? 'החשבון חסום. פנה לחנות לקבלת עזרה.' : 'This customer account is blocked. Please contact the store for help.'); return; }
    if (!paymentOperational(selectedPaymentMethod)) {
      toast('error', selectedPaymentMethod === 'bank_transfer'
        ? (ar ? 'يلزم إعداد الحساب البنكي في إعدادات المتجر وربط قاعدة البيانات.' : lang === 'he' ? 'יש להגדיר חשבון בנק בהגדרות החנות ולחבר את מסד הנתונים.' : 'Add complete bank details in Store Settings and configure Supabase before accepting bank transfers.')
        : selectedPaymentMethod === 'card'
          ? (ar ? 'بوابة البطاقات غير مهيأة. يلزم حساب تاجر ومفاتيح Lahza في إعدادات Vercel.' : lang === 'he' ? 'סליקת הכרטיסים אינה מוגדרת. דרוש חשבון סוחר ומפתחות Lahza ב-Vercel.' : 'Card checkout is not configured. A merchant account and Lahza keys in the hosting environment are required.')
          : (ar ? 'طريقة الدفع هذه غير مهيأة بعد. اختر الدفع عند الاستلام.' : lang === 'he' ? 'שיטת תשלום זו עדיין אינה מוגדרת. בחר תשלום במסירה.' : 'This payment method is not integrated yet. Please choose Cash on Delivery.'));
      return;
    }
    if (rows.length === 0) { navigate('/shop'); return; }
    if (!validateForm()) { toast('error', ar ? 'يرجى تصحيح الحقول المحددة' : lang === 'he' ? 'נא לתקן את השדות המסומנים' : 'Please fix the highlighted fields'); return; }
    if (selectedPaymentMethod === 'card' && !email.trim()) { setErrors((current) => ({ ...current, email: ar ? 'البريد مطلوب للدفع بالبطاقة' : lang === 'he' ? 'דוא״ל נדרש לתשלום בכרטיס' : 'Email is required for card payments.' })); toast('error', ar ? 'أدخل البريد الإلكتروني للدفع بالبطاقة.' : lang === 'he' ? 'הזן דוא״ל לתשלום בכרטיס.' : 'Enter an email address for card checkout.'); return; }

    setPlacing(true);
    // final server-side revalidation of coupon inside one transaction
    let finalDiscount = 0, finalDeliveryDiscount = 0, finalCode: string | undefined;
    if (appliedCode) {
      const result = validateCoupon(db, appliedCode, { productSubtotal: subtotal, fullSubtotal: subtotal, eligibleSubtotal: subtotal, deliveryFee, phone: phone.trim(), items });
      if (!result.ok) {
        setAppliedCode(null);
        setPromoMsg({ kind: 'err', text: ar ? 'الكود لم يعد صالحاً — تم حساب الإجمالي بدون خصم' : lang === 'he' ? 'הקופון אינו תקף עוד — הסכום חושב מחדש ללא הנחה' : 'Coupon no longer valid — totals recalculated without it' });
        setPlacing(false);
        return;
      }
      finalDiscount = result.discount;
      finalDeliveryDiscount = result.deliveryDiscount;
      finalCode = result.coupon!.code;
    }
    const finalPersonalDiscount = customerProfile?.blocked ? 0 : Math.round(Math.max(0, subtotal - finalDiscount) * personalDiscountPercent) / 100;
    finalDiscount = Math.min(subtotal, finalDiscount + finalPersonalDiscount);
    const finalDelivery = Math.max(0, deliveryFee - finalDeliveryDiscount);
    const finalTotal = Math.max(0, subtotal - finalDiscount) + finalDelivery;

    const pointsFactor = Math.max(0, db.store.loyaltyPointsPer10Ils ?? 1);
    const orderItems = rows.map((r) => ({
      productId: r.product.id,
      categoryId: r.product.categoryId,
      categoryIds: productCategoryMembershipIds(db.categories, r.product),
      brandId: r.product.brandId,
      variantId: r.line.variantId ?? undefined,
      sku: r.product.sku,
      name: productName(r.product, lang),
      variantLabel: r.variant?.label,
      qty: r.line.qty,
      unitPrice: r.price,
      ...(r.product.costPrice !== undefined && r.product.costPrice !== null ? { unitCost: r.product.costPrice } : {}),
      image: r.product.images[0],
    }));
    const estimatedPoints = customer ? rows.reduce((sum, r) => sum + (r.product.loyaltyPoints !== undefined
      ? Math.max(0, Math.floor(r.product.loyaltyPoints)) * r.line.qty
      : Math.floor((r.price * r.line.qty) / 10) * pointsFactor), 0) : 0;
    const draft = {
      customerName: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      area,
      areaName: deliveryAreaNameFor(db, area, lang),
      city: city.trim(),
      address: address.trim(),
      notes: notes.trim() || undefined,
      items: orderItems,
      productSubtotal: subtotal,
      discount: finalDiscount,
      personalDiscount: finalPersonalDiscount,
      deliveryFee: finalDelivery,
      total: finalTotal,
      couponCode: finalCode,
      buildPreference: isPcBuildCart ? buildPreference : undefined,
      userId: customer?.user.id,
      loyaltyPointsEarned: estimatedPoints,
      payment: selectedPaymentMethod,
      paymentStatus: selectedPaymentMethod === 'cod' ? 'pay_on_delivery' as const : selectedPaymentMethod === 'bank_transfer' ? 'awaiting_transfer' as const : 'awaiting_payment' as const,
    };

    try {
      let order: import('../lib/types').Order;
      let nextDb: typeof db;
      if (cloudConfigured) {
        // Server RPC rechecks current prices, inventory, delivery fees, coupon limits and loyalty points atomically.
        const remote = await createCloudOrder(draft);
        const local = placeOrder(db, draft, phone.trim());
        order = { ...remote.order, userId: customer?.user.id };
        nextDb = { ...local.nextDb, orders: [order, ...db.orders.filter((old) => old.number !== order.number)] };
        order = { ...order, loyaltyPointsEarned: remote.pointsEarned };
        await refreshCustomerProfile();
        if (selectedPaymentMethod === 'card') {
          // The order has already been saved and inventory revalidated by Supabase. Only redirect to a hosted payment page; card data never passes through this site.
          setDb(() => nextDb);
          void notifyAdminOfNewOrder(order.number).catch((emailError) => console.warn('Order saved, but admin email notification failed:', emailError));
          try {
            const payment = await startCardPayment(order.number, phone.trim());
            clearCart();
            setPlacing(false);
            window.location.assign(payment.authorizationUrl);
          } catch (paymentError) {
            // The order is already saved remotely. Show the saved order and its authoritative payment state rather than leaving the customer guessing or prompting for a duplicate checkout.
            clearCart();
            setPlacing(false);
            toast('error', paymentError instanceof Error ? paymentError.message : (ar ? 'تعذر بدء الدفع بالبطاقة. يمكنك مراجعة حالة الطلب.' : lang === 'he' ? 'לא ניתן להתחיל תשלום בכרטיס. ניתן לבדוק את מצב ההזמנה.' : 'Card payment could not be started. You can review your saved order status.'));
            navigate(`/order-confirmation/${encodeURIComponent(order.number)}`);
          }
          return;
        }
      } else {
        const local = placeOrder(db, draft, phone.trim());
        order = local.order;
        nextDb = local.nextDb;
      }
      setDb(() => nextDb); // persists locally; admin/cloud state syncs through Supabase where configured
      if (customer && (order.loyaltyPointsEarned ?? 0) > 0) toast('success', ar ? `تم الطلب ${order.number}! ربحت ${order.loyaltyPointsEarned} نقطة ولاء` : lang === 'he' ? `ההזמנה ${order.number} התקבלה! צברת ${order.loyaltyPointsEarned} נקודות נאמנות` : `Order ${order.number} placed! You earned ${order.loyaltyPointsEarned} loyalty points`);
      if (cloudConfigured) {
        void notifyAdminOfNewOrder(order.number).catch((emailError) => {
          console.warn('Order saved, but admin email notification failed:', emailError);
          toast('info', ar ? 'تم حفظ الطلب، لكن تعذر إرسال إشعار البريد. تحقق من إعدادات البريد.' : lang === 'he' ? 'ההזמנה נשמרה, אך שליחת הודעת הדוא״ל נכשלה. בדקו את הגדרות הדוא״ל.' : 'Order saved, but the admin email could not be sent. Check email configuration.');
        });
      }
      clearCart();
      setPlacing(false);
      navigate(`/order-confirmation/${encodeURIComponent(order.number)}`);
    } catch (e) {
      setPlacing(false);
      toast('error', e instanceof Error ? e.message : (ar ? 'تعذر حفظ الطلب. حاول مرة أخرى.' : lang === 'he' ? 'שמירת ההזמנה נכשלה. נסו שוב.' : 'Could not save the order. Please try again.'));
    }
  };

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShoppingCart size={44} className="mx-auto text-mute" />
        <h1 className="mt-4 font-display text-2xl font-bold uppercase text-white">{t('empty_cart')}</h1>
        <Button size="lg" className="mt-5" onClick={() => navigate('/shop')}>{t('continue_shopping')}</Button>
      </div>
    );
  }

  const areaOptions: { id: DeliveryArea; label: string }[] = [
    { id: 'westbank', label: t('westbank') },
    { id: 'jerusalem', label: t('jerusalem') },
    { id: 'inside48', label: t('inside48') },
    ...(db.delivery.additionalAreas ?? []).filter((a) => a.active).map((a) => ({ id: a.id, label: lang === 'ar' ? a.nameAr : lang === 'he' ? (a.nameHe || a.nameEn) : a.nameEn })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-7">
      <h1 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold uppercase text-white"><Lock size={20} className="text-electric" />{t('checkout')}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ── form ── */}
        <form className="space-y-4 rounded-2xl border border-line bg-panel p-5" onSubmit={(e) => { e.preventDefault(); placeTheOrder(); }} noValidate>
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white/90">{ar ? 'بيانات التوصيل' : lang === 'he' ? 'פרטי משלוח' : 'Delivery Details'}</h2>
          <Input label={`${t('full_name')} *`} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder={ar ? 'الاسم الكامل' : lang === 'he' ? 'למשל: אחמד סאלח' : 'e.g. Ahmad Saleh'} autoComplete="name" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={`${t('phone')} *`} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="059 XXX XXXX / +970 or +972" inputMode="tel" autoComplete="tel" />
            <Input label={t('email_opt')} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="name@example.com" inputMode="email" autoComplete="email" />
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/70">{t('area')} *</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {areaOptions.map((o) => (
                <label key={o.id} className={`flex h-14 cursor-pointer flex-col items-center justify-center rounded-xl border text-center transition-all ${area === o.id ? 'border-electric bg-electric/15 shadow-[0_0_0_1px_#00a8ff]' : 'border-line bg-panel2 text-white/80'}`}>
                  <input type="radio" name="area" className="sr-only" checked={area === o.id} onChange={() => setArea(o.id)} />
                  <span className="text-[10.5px] font-bold leading-tight">{o.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] font-semibold text-mute">{ar ? 'تُعرض رسوم التوصيل ضمن حساب الإجمالي فقط' : lang === 'he' ? 'דמי המשלוח מופיעים בסיכום המחיר בלבד' : 'Delivery fees appear in the checkout calculation only'}</p>
          </div>
          <Input label={`${t('city')} *`} value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} placeholder={ar ? 'رام الله، نابلس، حيفا…' : lang === 'he' ? 'רמאללה, שכם, חיפה…' : 'Ramallah, Nablus, Haifa…'} autoComplete="address-level2" />
          <TextArea label={`${t('address')} *`} value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} placeholder={ar ? 'اسم الشارع، رقم المبنى، أقرب معلم، الطابق والشقة…' : lang === 'he' ? 'רחוב, מספר בית, נקודת ציון, קומה ודירה…' : 'Street, building number, landmark, floor & apartment…'} />
          <TextArea label={t('notes')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={ar ? 'أي ملاحظات للمندوب أو للمتجر' : lang === 'he' ? 'הערות לשליח או לחנות' : 'Any notes for the courier or the store'} />

          {isPcBuildCart && <div className="rounded-xl border border-electric/30 bg-electric/5 p-4"><h3 className="mb-2 text-[12px] font-bold text-white">{ar ? 'كيف تريد استلام تجميعة الكمبيوتر؟' : lang === 'he' ? 'איך תרצה לקבל את המחשב?' : 'How would you like your PC build delivered?'}</h3><div className="grid gap-2 sm:grid-cols-2"><label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${buildPreference === 'assemble' ? 'border-electric bg-electric/10' : 'border-line bg-panel2'}`}><input type="radio" name="buildPreference" checked={buildPreference === 'assemble'} onChange={() => setBuildPreference('assemble')} className="mt-1 accent-[#00a8ff]"/><span><strong className="block text-[11px] text-white">{ar ? 'تجميع الكمبيوتر لنا' : lang === 'he' ? 'הרכבת המחשב על ידינו' : 'Build the PC for me'}</strong><small className="mt-1 block text-[10px] text-mute">{ar ? 'تواصل معنا لتأكيد توافق القطع وتكلفة التجميع قبل التأكيد النهائي.' : lang === 'he' ? 'ניצור קשר לאישור תאימות הרכיבים ועלות ההרכבה לפני האישור הסופי.' : 'We will contact you to confirm compatibility and any assembly cost before final confirmation.'}</small></span></label><label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${buildPreference === 'parts' ? 'border-electric bg-electric/10' : 'border-line bg-panel2'}`}><input type="radio" name="buildPreference" checked={buildPreference === 'parts'} onChange={() => setBuildPreference('parts')} className="mt-1 accent-[#00a8ff]"/><span><strong className="block text-[11px] text-white">{ar ? 'إرسال القطع كما هي' : lang === 'he' ? 'שליחת הרכיבים כפי שהם' : 'Ship products as they are'}</strong><small className="mt-1 block text-[10px] text-mute">{ar ? 'استلام القطع منفصلة دون تجميع.' : lang === 'he' ? 'הרכיבים יישלחו בנפרד ללא הרכבה.' : 'Receive the components individually, without assembly.'}</small></span></label></div></div>}

          {/* Payment options become selectable only when their real backend prerequisites are configured. */}
          <div className="rounded-xl border border-line bg-panel2 p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[12px] font-bold text-white/90">{ar ? 'طريقة الدفع' : lang === 'he' ? 'אמצעי תשלום' : 'Payment Method'}</h3><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-300">{ar ? 'الدفع عند الاستلام متاح دائماً' : lang === 'he' ? 'תשלום במסירה זמין תמיד' : 'Cash on Delivery is always available'}</span></div>
            <div className="space-y-2">
              {enabledPaymentMethods.map((method) => {
                const meta = PAYMENT_METHODS.find((entry) => entry.id === method.id)!;
                const operational = paymentOperational(method.id);
                const label = lang === 'ar' ? meta.labelAr : lang === 'he' ? meta.labelHe : meta.labelEn;
                const detail = lang === 'ar' ? meta.detailAr : lang === 'he' ? meta.detailHe : meta.detailEn;
                const setupDetail = method.id === 'bank_transfer' && !bankTransferReady
                  ? (ar ? 'أدخل اسم البنك واسم صاحب الحساب ورقم الحساب أو IBAN في إعدادات المتجر، ثم اربط Supabase.' : lang === 'he' ? 'הזן בנק, בעל החשבון ומספר חשבון או IBAN בהגדרות החנות וחבר Supabase.' : 'Enter bank name, account holder and account number or IBAN in Store Settings, then connect Supabase.')
                  : method.id === 'card' && !cardGatewayReady
                    ? (ar ? 'يتطلب حساب تاجر مع Lahza ومفتاح API سرياً في إعدادات Vercel.' : lang === 'he' ? 'נדרש חשבון סוחר Lahza ומפתח API סודי ב-Vercel.' : 'Requires an approved Lahza merchant account and server-side API key in your hosting environment.')
                    : method.id === 'bank_transfer'
                      ? (ar ? 'حوّل المبلغ إلى حساب المتجر. يبقى الطلب بانتظار تأكيد الإدارة حتى نتحقق من التحويل.' : lang === 'he' ? 'העבר את הסכום לחשבון החנות. ההזמנה תמתין לאימות ידני של ההעברה.' : 'Transfer to the store account. The order remains awaiting manual confirmation until the transfer is verified.')
                      : method.id === 'card'
                        ? (ar ? `دفع آمن بالبطاقة عبر Lahza${cardGatewayMode ? ` (${cardGatewayMode === 'test' ? 'اختبار' : 'مباشر'})` : ''}.` : lang === 'he' ? `תשלום כרטיס מאובטח דרך Lahza${cardGatewayMode ? ` (${cardGatewayMode})` : ''}.` : `Secure hosted card payment via Lahza${cardGatewayMode ? ` (${cardGatewayMode} mode)` : ''}.`)
                        : detail;
                const Icon = method.id === 'cod' ? Banknote : method.id === 'card' ? CreditCard : (method.id === 'apple_pay' || method.id === 'google_pay') ? Smartphone : method.id === 'bank_transfer' ? Building2 : Wallet;
                return <label key={method.id} className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${operational ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'} ${selectedPaymentMethod === method.id ? 'border-emerald-400/50 bg-emerald-400/5' : 'border-line bg-panel'}`}>
                  <input type="radio" name="paymentMethod" value={method.id} checked={selectedPaymentMethod === method.id} disabled={!operational} onChange={() => setSelectedPaymentMethod(method.id)} className="mt-1 accent-[#34d399]" />
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${operational ? 'bg-emerald-400/10 text-emerald-300' : 'bg-panel2 text-mute'}`}><Icon size={18}/></span>
                  <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-[11.5px] font-bold text-white/90">{label}{operational ? <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-300">{ar ? 'متاح' : lang === 'he' ? 'זמין' : 'Available'}</span> : <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] text-amber-200">{ar ? 'يتطلب إعداداً' : lang === 'he' ? 'דורש הגדרה' : 'Setup required'}</span>}</span><span className="mt-1 block text-[10px] leading-relaxed text-mute">{operational && method.id === 'cod' ? (ar ? 'ادفع للمندوب عند استلام طلبك — بدون دفع مسبق.' : lang === 'he' ? 'שלמו לשליח עם קבלת ההזמנה — ללא תשלום מראש.' : 'Pay the courier when your order arrives — no prepayment.') : setupDetail}</span></span>
                </label>;
              })}
              {enabledPaymentMethods.length === 0 && <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-[11px] text-red-300">{ar ? 'لا توجد طريقة دفع مفعّلة. تواصل مع المتجر.' : lang === 'he' ? 'אין אמצעי תשלום פעיל. יש ליצור קשר עם החנות.' : 'No payment method is enabled. Please contact the store.'}</p>}
            </div>
            {enabledPaymentMethods.some((method) => method.id !== 'cod') && <p className="mt-2 text-[10px] leading-relaxed text-mute">{ar ? 'لا يظهر خيار كمتاح إلا بعد إعداد تكامله الحقيقي. التحويل البنكي يدوي حتى تؤكد الإدارة استلام الأموال.' : lang === 'he' ? 'שיטה תוצג כזמינה רק לאחר הגדרת האינטגרציה האמיתית שלה. העברה בנקאית ידנית עד שהמנהל מאשר קבלת כספים.' : 'A method is selectable only after its real integration is configured. Bank transfers stay manual until an administrator confirms receipt.'}</p>}
          </div>
          <button type="submit" hidden aria-hidden="true" />
        </form>

        {/* ── order summary ── */}
        <aside className="h-fit space-y-4 rounded-2xl border border-line bg-panel p-5 lg:sticky lg:top-36">
          <h2 className="flex items-center justify-between font-display text-base font-bold uppercase tracking-wide text-white/90">{ar ? 'طلبك' : lang === 'he' ? 'ההזמנה שלך' : 'Your Order'}<Link to="/cart" className="text-[10px] font-bold normal-case text-electric hover:text-white">{ar ? 'تعديل السلة' : lang === 'he' ? 'עריכת הסל' : 'Edit cart'}</Link></h2>
          <ul className="max-h-56 space-y-2 overflow-y-auto pe-1">
            {rows.map(({ line, product, variant, total }) => (
              <li key={`${line.productId}-${line.variantId ?? 'base'}`} className="flex items-center gap-2.5 text-[12px]">
                <img src={product.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <span className="min-w-0 flex-1"><span className="line-clamp-1 font-semibold text-white/85">{productName(product, lang)}</span><span className="text-[9px] font-bold uppercase text-mute">{line.qty} × {variant?.label ?? '—'}</span></span>
                <span className="font-display font-bold text-white/90">{fmtPrice(total, lang)}</span>
              </li>
            ))}
          </ul>

          {/* promo */}
          <div className="border-t border-line pt-3">
            {appliedCode ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[12px] font-bold text-emerald-400"><BadgePercent size={15} />{appliedCode}</span>
                <button onClick={() => { setAppliedCode(null); setPromo(''); setPromoMsg(null); }} className="rounded-md p-1 text-mute hover:text-white" aria-label="Remove coupon"><X size={16} /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoMsg(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } }} placeholder={t('promo')} className="h-11 w-full rounded-xl border border-line bg-panel2 px-3 text-[12px] font-bold uppercase tracking-wider outline-none focus:border-electric" aria-label={t('promo')} />
                <Button variant="outline" onClick={applyPromo} type="button">{t('apply_promo')}</Button>
              </div>
            )}
            {promoMsg && <p className={`mt-1.5 text-[11px] font-bold ${promoMsg.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{promoMsg.text}</p>}
          </div>

          <dl className="space-y-2 border-t border-line pt-3 text-[13px]">
            <div className="flex justify-between"><dt className="text-mute">{t('subtotal')}</dt><dd className="font-bold">{fmtPrice(subtotal, lang)}</dd></div>
            {productDiscount > 0 && <div className="flex justify-between"><dt className="text-emerald-400">{t('discount')} ({appliedCode})</dt><dd className="font-bold text-emerald-400">−{fmtPrice(productDiscount, lang)}</dd></div>}
            {personalDiscount > 0 && <div className="flex justify-between"><dt className="text-emerald-400">{ar ? 'خصم العميل الخاص' : lang === 'he' ? 'הנחת לקוח אישית' : 'Your customer discount'} ({personalDiscountPercent}%)</dt><dd className="font-bold text-emerald-400">−{fmtPrice(personalDiscount, lang)}</dd></div>}
            <div className="flex justify-between"><dt className="flex items-center gap-1 text-mute"><Truck size={13} />{t('shipping')}</dt><dd className="font-bold">{deliveryDiscount > 0 && effectiveDelivery === 0 ? <span className="text-emerald-400">{ar ? 'مجاني' : lang === 'he' ? 'חינם' : 'FREE'}</span> : fmtPrice(effectiveDelivery, lang)}</dd></div>
            <div className="flex items-center justify-between border-t border-line pt-2.5"><dt className="font-display text-lg font-bold text-white">{t('total')}</dt><dd className="font-display text-2xl font-bold text-electric">{fmtPrice(total, lang)}</dd></div>
          </dl>

          <Button size="lg" className="w-full" loading={placing} disabled={!paymentOperational(selectedPaymentMethod)} onClick={placeTheOrder}>
            <Zap size={18} strokeWidth={2.5} />{t('place_order')}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-mute"><ShieldCheck size={12} className="text-electric" />{ar ? 'بالضغط على تأكيد الطلب فإنك توافق على شروط المتجر' : lang === 'he' ? 'בביצוע ההזמנה אתם מסכימים לתנאי החנות' : 'By placing your order you agree to the store terms'}</p>
        </aside>
      </div>
    </div>
  );
}
