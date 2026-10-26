// BLITZ GAMING — order confirmation, payment status and transfer instructions
import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Copy, Check, Printer, Zap, Phone, Truck, Star, LoaderCircle, CreditCard, Building2, RefreshCw, CircleAlert } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { fmtPrice, fmtDate } from '../lib/i18n';
import { cloudConfigured, fetchCloudOrderByNumber, fetchPublicPaymentOrder, type PublicPaymentOrderStatus } from '../lib/cloud';
import { deliveryAreaNameFor } from '../lib/db';
import type { Order } from '../lib/types';
import { Button } from '../components/ui';

export function OrderConfirmation() {
  const { number } = useParams<{ number: string }>();
  const { db, lang, t, customer } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const [copied, setCopied] = useState(false);
  const [remoteOrder, setRemoteOrder] = useState<Order | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [paymentSnapshot, setPaymentSnapshot] = useState<PublicPaymentOrderStatus | null>(null);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const order = db.orders.find((o) => o.number === number) ?? remoteOrder;
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;

  useEffect(() => {
    let active = true;
    if (order || !number || !customer?.access_token) return;
    setLoadingRemote(true);
    fetchCloudOrderByNumber(number, customer.access_token).then((found) => { if (active) setRemoteOrder(found); }).catch(() => { /* no permission or network: show not found below */ }).finally(() => { if (active) setLoadingRemote(false); });
    return () => { active = false; };
  }, [number, order, customer?.access_token]);

  useEffect(() => {
    let active = true;
    if (!order || !cloudConfigured || order.payment === 'cod') { setPaymentSnapshot(null); return; }
    const refresh = async () => {
      setRefreshingPayment(true);
      try {
        // A few short checks cover the redirect immediately after the processor callback/webhook.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const snapshot = await fetchPublicPaymentOrder(order.number, order.phone);
          if (!active) return;
          if (snapshot) setPaymentSnapshot(snapshot);
          if (!snapshot || ['paid', 'failed', 'cancelled'].includes(snapshot.paymentStatus ?? '')) break;
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1300));
        }
      } catch { /* keep the last locally available payment status if network is offline */ }
      finally { if (active) setRefreshingPayment(false); }
    };
    void refresh();
    return () => { active = false; };
  }, [order?.number, order?.phone, order?.payment]);

  if (!order && loadingRemote) return <div className="mx-auto flex max-w-xl items-center justify-center gap-2 px-4 py-20 text-mute"><LoaderCircle size={18} className="animate-spin"/>{txt('Loading order details…', 'جارٍ تحميل تفاصيل الطلب…', 'טוען פרטי הזמנה…')}</div>;
  if (!order) return <Navigate to={customer ? '/account' : '/'} replace />;

  const areaLabel = order.areaName || deliveryAreaNameFor(db, order.area, lang);
  const payment = order.payment || 'cod';
  const paymentStatus = paymentSnapshot?.paymentStatus ?? order.paymentStatus ?? (payment === 'cod' ? 'pay_on_delivery' : payment === 'bank_transfer' ? 'awaiting_transfer' : 'awaiting_payment');
  const pointsEarned = paymentSnapshot?.loyaltyPointsEarned ?? order.loyaltyPointsEarned ?? 0;
  const bank = db.store.bankTransferDetails;
  const bankInstructions = lang === 'ar' ? bank?.instructionsAr : lang === 'he' ? bank?.instructionsHe : bank?.instructionsEn;
  const paymentMethodLabel = payment === 'cod' ? txt('Cash on Delivery', 'الدفع عند الاستلام', 'תשלום בעת המסירה')
    : payment === 'card' ? txt('Visa / Mastercard / card', 'بطاقة بنكية', 'כרטיס אשראי')
      : payment === 'bank_transfer' ? txt('Bank transfer', 'تحويل بنكي', 'העברה בנקאית')
        : payment === 'paypal' ? 'PayPal' : payment === 'apple_pay' ? 'Apple Pay' : payment === 'google_pay' ? 'Google Pay' : payment;
  const paymentStatusLabel = paymentStatus === 'paid' ? txt('Paid', 'تم الدفع', 'שולם')
    : paymentStatus === 'pay_on_delivery' ? txt('Pay when delivered', 'الدفع عند الاستلام', 'תשלום בעת המסירה')
      : paymentStatus === 'awaiting_transfer' ? txt('Awaiting bank transfer', 'بانتظار التحويل البنكي', 'ממתין להעברה בנקאית')
        : paymentStatus === 'failed' ? txt('Payment failed', 'فشل الدفع', 'התשלום נכשל')
          : paymentStatus === 'cancelled' ? txt('Payment cancelled', 'تم إلغاء الدفع', 'התשלום בוטל')
            : txt('Awaiting card payment', 'بانتظار إتمام الدفع بالبطاقة', 'ממתין לתשלום בכרטיס');
  const paymentIsFailed = payment === 'card' && ['failed', 'cancelled'].includes(paymentStatus);
  const paymentIsPending = payment === 'card' && paymentStatus !== 'paid' && !paymentIsFailed;

  const copy = async () => {
    try { await navigator.clipboard.writeText(order.number); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:py-14">
      <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border ${paymentIsFailed ? 'border-red-500/40 bg-red-500/15' : paymentIsPending ? 'border-amber-500/40 bg-amber-500/15' : 'border-emerald-500/40 bg-emerald-500/15'}`}>
        {paymentIsFailed ? <CircleAlert size={42} className="text-red-400"/> : paymentIsPending ? <CreditCard size={42} className="text-amber-300"/> : <CheckCircle2 size={44} className="text-emerald-400"/>}
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold uppercase text-white">{paymentIsFailed ? txt('Payment not completed', 'لم يكتمل الدفع', 'התשלום לא הושלם') : paymentIsPending ? txt('Order saved — payment pending', 'تم حفظ الطلب — الدفع معلّق', 'ההזמנה נשמרה — התשלום ממתין') : t('order_placed')}</h1>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-mute">{paymentIsFailed
        ? txt('The card payment was not confirmed. Do not place another payment for this order. You can choose Cash on Delivery with a new order or contact us.', 'لم يتم تأكيد الدفع بالبطاقة. لا تعِد الدفع لهذا الطلب. يمكنك تقديم طلب جديد بالدفع عند الاستلام أو التواصل معنا.', 'תשלום הכרטיס לא אומת. אל תנסה לשלם שוב עבור הזמנה זו. אפשר לבצע הזמנה חדשה בתשלום בעת המסירה או ליצור איתנו קשר.')
        : paymentIsPending ? txt('Your order is saved, but it is not paid yet. Complete the secure payment or follow the transfer instructions below.', 'تم حفظ طلبك، لكنه غير مدفوع بعد. أكمل الدفع الآمن أو اتبع تعليمات التحويل أدناه.', 'ההזמנה נשמרה אך עדיין לא שולמה. השלם את התשלום המאובטח או פעל לפי הוראות ההעברה להלן.')
          : t('thank_you')}</p>

      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-electric/30 bg-electric/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-mute">{t('order_number')}</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="font-display text-3xl font-bold tracking-wider text-electric">{order.number}</span>
          <button onClick={copy} className="rounded-lg border border-line bg-panel2 p-2 text-white/75 hover:border-electric hover:text-electric" aria-label={t('copy')}>
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
        <p className="mt-1 text-[10px] font-semibold text-white/50">{fmtDate(order.createdAt, lang)} · {areaLabel}</p>
        <div className="mt-3 flex items-center justify-center gap-2 border-t border-line pt-3 text-[11px]"><span className="text-mute">{paymentMethodLabel}</span><span className={paymentStatus === 'paid' ? 'font-bold text-emerald-300' : paymentIsFailed ? 'font-bold text-red-300' : 'font-bold text-amber-200'}>{paymentStatusLabel}</span>{refreshingPayment && <LoaderCircle size={12} className="animate-spin text-mute"/>}</div>
        {payment !== 'cod' && cloudConfigured && <button type="button" onClick={() => { setPaymentSnapshot(null); void fetchPublicPaymentOrder(order.number, order.phone).then(setPaymentSnapshot).catch(() => undefined); }} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-electric"><RefreshCw size={11}/>{txt('Refresh payment status', 'تحديث حالة الدفع', 'רענן מצב תשלום')}</button>}
      </div>

      {payment === 'bank_transfer' && paymentStatus !== 'paid' && <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-start">
        <h2 className="flex items-center gap-2 text-[13px] font-bold text-amber-200"><Building2 size={17}/>{txt('Bank transfer instructions', 'تعليمات التحويل البنكي', 'הוראות להעברה בנקאית')}</h2>
        {bank?.bankName && <p className="mt-3 text-[11px] text-white/80"><strong>{txt('Bank', 'البنك', 'בנק')}:</strong> {bank.bankName}</p>}
        {bank?.accountHolder && <p className="mt-1 text-[11px] text-white/80"><strong>{txt('Account holder', 'صاحب الحساب', 'בעל החשבון')}:</strong> {bank.accountHolder}</p>}
        {(bank?.iban || bank?.accountNumber) && <p className="mt-1 break-words text-[11px] text-white/80"><strong>{bank?.iban ? 'IBAN' : txt('Account number', 'رقم الحساب', 'מספר חשבון')}:</strong> {bank?.iban || bank?.accountNumber}</p>}
        {bank?.swiftBic && <p className="mt-1 text-[11px] text-white/80"><strong>SWIFT/BIC:</strong> {bank.swiftBic}</p>}
        {bankInstructions && <p className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed text-white/75">{bankInstructions}</p>}
        <p className="mt-3 rounded-lg border border-line bg-panel2 p-3 text-[11px] font-bold text-white">{txt('Use the order number as the transfer reference:', 'استخدم رقم الطلب كمرجع للتحويل:', 'השתמש במספר ההזמנה כאסמכתת ההעברה:')} {order.number}</p>
        <p className="mt-2 text-[10px] text-mute">{txt('Your order remains unpaid until the store verifies the funds in its bank account.', 'يبقى الطلب غير مدفوع حتى يتحقق المتجر من وصول الأموال إلى حسابه البنكي.', 'ההזמנה תישאר לא משולמת עד שהחנות תאמת את קבלת הכסף בחשבון הבנק.')}</p>
      </div>}

      {pointsEarned > 0 ? <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4 text-start"><p className="flex items-center gap-2 text-[12px] font-bold text-amber-300"><Star size={16} fill="currentColor"/>{txt('You earned loyalty points!', 'ربحت نقاط ولاء!', 'הרווחת נקודות נאמנות!')}</p><p className="mt-1 font-display text-2xl font-bold text-white">+{pointsEarned} <span className="text-sm">{txt('points', 'نقطة', 'נקודות')}</span></p><p className="mt-1 text-[10px] leading-relaxed text-white/65">{txt('These points have been added to your account.', 'تمت إضافة النقاط إلى حسابك.', 'הנקודות נוספו לחשבון שלך.')}</p></div> : payment !== 'cod' && paymentStatus !== 'paid' && order.userId ? <p className="mx-auto mt-3 max-w-sm text-[10px] text-mute">{txt('Loyalty points will be added once payment is confirmed.', 'ستضاف نقاط الولاء بعد تأكيد الدفع.', 'נקודות הנאמנות יתווספו לאחר אישור התשלום.')}</p> : null}

      <div className="mt-6 rounded-2xl border border-line bg-panel p-5 text-start">
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-[12px]">
              <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <span className="min-w-0 flex-1"><span className="line-clamp-1 font-semibold text-white/85">{item.name}</span><span className="text-[9px] font-bold uppercase text-mute">{item.qty} × {item.variantLabel ?? '—'} · {item.sku}</span></span>
              <span className="font-display font-bold text-white/90">{fmtPrice(item.unitPrice * item.qty, lang)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-[13px]">
          <div className="flex justify-between"><dt className="text-mute">{t('subtotal')}</dt><dd className="font-bold">{fmtPrice(order.productSubtotal, lang)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt className="text-emerald-400">{t('discount')}{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd className="font-bold text-emerald-400">−{fmtPrice(order.discount, lang)}</dd></div>}
          <div className="flex justify-between"><dt className="text-mute">{t('shipping')}</dt><dd className="font-bold">{fmtPrice(order.deliveryFee, lang)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2"><dt className="font-display text-base font-bold">{t('total')}</dt><dd className="font-display text-xl font-bold text-electric">{fmtPrice(order.total, lang)}</dd></div>
        </dl>
        <div className="mt-4 rounded-xl border border-line bg-panel2 p-3 text-[11px] font-semibold leading-relaxed text-white/70">
          <p className="flex items-center gap-2"><Truck size={13} className="shrink-0 text-electric" />{order.customerName} · {order.phone}</p>
          <p className="mt-1 ps-5">{order.city} — {order.address}</p>
          {order.notes && <p className="mt-1 ps-5 text-mute">{he ? 'הערות: ' : ar ? 'ملاحظات: ' : 'Notes: '}{order.notes}</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={() => window.print()}><Printer size={17} />{txt('Print', 'طباعة', 'הדפסה')}</Button>
        <a href={`https://wa.me/${db.store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`${he ? 'שלום BLITZ GAMING, מספר ההזמנה שלי הוא' : ar ? 'مرحباً BLITZ GAMING، رقم طلبي هو' : 'Hi BLITZ GAMING, my order number is'} ${order.number}`)}`} target="_blank" rel="noreferrer"><Button variant="outline"><Phone size={17} />WhatsApp</Button></a>
        <Link to="/track-order"><Button variant="outline"><Truck size={17}/>{txt('Track My Order', 'تتبع الطلب', 'מעקב הזמנה')}</Button></Link>
        <Link to="/shop"><Button><Zap size={17} strokeWidth={2.5} />{t('continue_shopping')}</Button></Link>
      </div>
    </div>
  );
}
