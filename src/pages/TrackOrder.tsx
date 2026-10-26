import { useState, type FormEvent } from 'react';
import { PackageSearch, Search, Truck, UserRound, Phone, ExternalLink, CircleCheck, Clock3, XCircle, MapPin, BadgeCheck } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Button } from '../components/ui';
import { fmtDate, fmtPrice } from '../lib/i18n';

type TrackingStatus = 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
interface TrackedOrder {
  number: string;
  createdAt: string;
  status: TrackingStatus;
  statusUpdatedAt?: string;
  statusHistory?: { status: TrackingStatus; at: string; message?: string }[];
  areaName?: string;
  area?: string;
  city?: string;
  items: { name: string; sku?: string; variantLabel?: string; qty: number }[];
  total: number;
  carrierName?: string;
  trackingUrl?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  trackingMessage?: string;
}

const STATUS_FLOW: TrackingStatus[] = ['new', 'confirmed', 'shipped', 'delivered'];

export function TrackOrder() {
  const { lang } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const txt = (en: string, arabic: string, hebrew: string) => ar ? arabic : he ? hebrew : en;
  const labelStatus = (status: TrackingStatus) => ({
    new: txt('Order received', 'تم استلام الطلب', 'ההזמנה התקבלה'),
    confirmed: txt('Order confirmed', 'تم تأكيد الطلب', 'ההזמנה אושרה'),
    shipped: txt('On the way', 'الطلب في الطريق', 'ההזמנה בדרך'),
    delivered: txt('Delivered', 'تم التسليم', 'נמסרה'),
    cancelled: txt('Cancelled', 'ملغي', 'בוטלה'),
  })[status];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setOrder(null);
    try {
      const response = await fetch('/api/track-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: number.trim().toUpperCase(), phone: phone.trim() }),
      });
      const result = await response.json().catch(() => ({})) as { order?: TrackedOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || txt('We could not find an order matching those details.', 'لم نتمكن من العثور على طلب يطابق هذه البيانات.', 'לא נמצאה הזמנה התואמת לפרטים האלה.'));
      setOrder(result.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : txt('Tracking is temporarily unavailable. Please contact us on WhatsApp.', 'التتبع غير متاح مؤقتاً. يرجى التواصل معنا عبر واتساب.', 'המעקב אינו זמין כרגע. אפשר לפנות אלינו ב-WhatsApp.'));
    } finally { setBusy(false); }
  };

  const currentIndex = order ? STATUS_FLOW.indexOf(order.status as Exclude<TrackingStatus, 'cancelled'>) : -1;
  const historyAt = (status: TrackingStatus) => order?.statusHistory?.filter((entry) => entry.status === status).at(-1)?.at;
  return <div className="mx-auto max-w-3xl px-3 py-8 sm:px-5 sm:py-12">
    <div className="relative overflow-hidden rounded-3xl border border-electric/20 bg-gradient-to-br from-[#101b29] via-panel to-[#131024] p-5 sm:p-8">
      <div className="pointer-events-none absolute -end-10 -top-12 h-48 w-48 rounded-full bg-electric/10 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-electric/25 bg-electric/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-electric"><PackageSearch size={13}/>{txt('Order tracking', 'تتبع الطلب', 'מעקב הזמנה')}</span>
        <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">{txt('Track your order', 'تتبّع طلبك', 'עקבו אחר ההזמנה')}</h1>
        <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-white/65">{txt('Enter your BG order number and the phone number used at checkout. You do not need a customer account.', 'أدخل رقم الطلب الذي يبدأ بـ BG# ورقم الهاتف الذي استخدمته عند الطلب. لا تحتاج إلى إنشاء حساب.', 'הזינו את מספר ההזמנה שמתחיל ב-BG# ואת מספר הטלפון ששימש בעת ההזמנה. אין צורך בחשבון לקוח.')}</p>
        <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-[10px] font-bold text-white/70">{txt('Order number', 'رقم الطلب', 'מספר הזמנה')}<input required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="BG#1001" autoCapitalize="characters" className="mt-1 h-12 w-full rounded-xl border border-line bg-[#080e16] px-3 text-[13px] font-bold text-white outline-none focus:border-electric" /></label>
          <label className="text-[10px] font-bold text-white/70">{txt('Checkout phone number', 'رقم الهاتف عند الطلب', 'הטלפון בעת ההזמנה')}<input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+970…" inputMode="tel" autoComplete="tel" className="mt-1 h-12 w-full rounded-xl border border-line bg-[#080e16] px-3 text-[13px] text-white outline-none focus:border-electric" /></label>
          <div className="flex items-end"><Button type="submit" size="lg" className="w-full sm:w-auto" loading={busy}><Search size={16}/>{txt('Track', 'تتبّع', 'מעקב')}</Button></div>
        </form>
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/25 bg-red-400/5 p-3 text-[11px] text-red-300">{error}</p>}
      </div>
    </div>

    {order && <section aria-live="polite" className="mt-5 space-y-4 rounded-2xl border border-line bg-panel p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-mute">{txt('Order', 'الطلب', 'הזמנה')}</p><h2 className="mt-1 font-display text-2xl font-bold text-electric">{order.number}</h2><p className="mt-1 text-[10px] text-mute">{txt('Placed', 'تاريخ الطلب', 'תאריך ההזמנה')}: {fmtDate(order.createdAt, lang)}</p></div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold ${order.status === 'cancelled' ? 'border-red-400/30 bg-red-400/10 text-red-300' : order.status === 'delivered' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-electric/30 bg-electric/10 text-electric'}`}>{order.status === 'cancelled' ? <XCircle size={13}/> : order.status === 'delivered' ? <CircleCheck size={13}/> : <Clock3 size={13}/>}{labelStatus(order.status)}</span>
      </div>
      {order.status === 'cancelled' ? <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-[12px] text-red-200">{order.trackingMessage || txt('This order was cancelled. Contact the store if you need help.', 'تم إلغاء هذا الطلب. تواصل مع المتجر إذا كنت بحاجة إلى مساعدة.', 'ההזמנה בוטלה. צרו קשר עם החנות לקבלת עזרה.')}</p> : <div className="grid gap-3 sm:grid-cols-4">
        {STATUS_FLOW.map((status, index) => {
          const done = currentIndex >= index;
          const happenedAt = historyAt(status) || (order.status === status ? order.statusUpdatedAt : undefined) || (status === 'new' ? order.createdAt : undefined);
          return <div key={status} className={`relative rounded-xl border p-3 ${done ? 'border-emerald-400/25 bg-emerald-400/5' : 'border-line bg-panel2 opacity-60'}`}><div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-emerald-400/15 text-emerald-300' : 'bg-panel text-mute'}`}>{done ? <CircleCheck size={15}/> : <Clock3 size={15}/>}</div><p className={`text-[11px] font-bold ${done ? 'text-white' : 'text-mute'}`}>{labelStatus(status)}</p>{happenedAt && <p className="mt-1 text-[9px] text-mute">{fmtDate(happenedAt, lang)}</p>}</div>;
        })}
      </div>}
      {order.trackingMessage && order.status !== 'cancelled' && <p className="rounded-xl border border-electric/20 bg-electric/5 p-3 text-[12px] leading-relaxed text-white/85"><BadgeCheck size={14} className="me-1 inline text-electric"/>{order.trackingMessage}</p>}
      {(order.carrierName || order.deliveryPersonName || order.deliveryPersonPhone || order.trackingUrl) && <div className="rounded-xl border border-line bg-panel2 p-4"><h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/85"><Truck size={15} className="text-electric"/>{txt('Delivery details', 'تفاصيل التوصيل', 'פרטי משלוח')}</h3><div className="grid gap-3 sm:grid-cols-2">
        {order.carrierName && <div><p className="text-[9px] text-mute">{txt('Delivery company', 'شركة التوصيل', 'חברת משלוחים')}</p><p className="mt-1 text-[12px] font-bold text-white">{order.carrierName}</p></div>}
        {order.deliveryPersonName && <div><p className="text-[9px] text-mute">{txt('Courier', 'اسم المندوب', 'שליח')}</p><p className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-white"><UserRound size={13}/>{order.deliveryPersonName}</p></div>}
        {order.deliveryPersonPhone && <div><p className="text-[9px] text-mute">{txt('Courier phone', 'هاتف المندوب', 'טלפון השליח')}</p><a href={`tel:${order.deliveryPersonPhone}`} className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-bold text-electric"><Phone size={13}/>{order.deliveryPersonPhone}</a></div>}
        {order.trackingUrl && <div className="flex items-end"><a href={order.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-electric px-3 text-[10px] font-bold text-ink"><ExternalLink size={13}/>{txt('Track with carrier', 'تتبع لدى شركة التوصيل', 'מעקב אצל חברת המשלוחים')}</a></div>}
      </div></div>}
      <div className="rounded-xl border border-line p-4"><h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/85">{txt('Items in this order', 'المنتجات في الطلب', 'מוצרים בהזמנה')}</h3><ul className="space-y-2">{(order.items ?? []).map((item, index) => <li key={`${item.sku || item.name}-${index}`} className="flex items-start justify-between gap-3 text-[11px]"><span className="min-w-0"><span className="block font-semibold text-white/85">{item.name}</span>{item.variantLabel && <span className="block text-[9px] text-mute">{item.variantLabel}</span>}</span><span className="shrink-0 text-mute">× {item.qty}</span></li>)}</ul><div className="mt-3 flex justify-between border-t border-line pt-3 text-[12px]"><span className="font-bold text-white/80">{txt('Order total', 'إجمالي الطلب', 'סך ההזמנה')}</span><span className="font-display font-bold text-electric">{fmtPrice(order.total, lang)}</span></div></div>
      <p className="flex items-center gap-1.5 text-[10px] leading-relaxed text-mute"><MapPin size={12}/>{txt('Delivery area', 'منطقة التوصيل', 'אזור משלוח')}: {order.city ? `${order.city} · ` : ''}{order.areaName || order.area || '—'}</p>
    </section>}
    <p className="mt-4 text-center text-[10px] text-mute">{txt('Need help? Contact Blitz Gaming on WhatsApp using the contact link on this site.', 'تحتاج مساعدة؟ تواصل مع Blitz Gaming عبر واتساب من رابط التواصل في الموقع.', 'צריכים עזרה? פנו ל-Blitz Gaming דרך קישור WhatsApp באתר.')}</p>
  </div>;
}
