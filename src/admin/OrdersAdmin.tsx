// BLITZ GAMING — admin: orders (status pipeline, expandable details)
import { Fragment, useMemo, useState } from 'react';
import { Search, ChevronDown, ShoppingBag, Phone, MapPin, Printer, Truck, Save, ExternalLink } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle, EmptyState } from '../components/ui';
import { StatusPill } from './Dashboard';
import { fmtPrice, fmtDate } from '../lib/i18n';
import type { Order } from '../lib/types';
import { cloudConfigured, updateCloudOrderStatus, updateCloudOrderDelivery, markCloudOrderPaid, cancelCloudUnpaidOrder, type CloudDeliveryUpdate } from '../lib/cloud';

const STATUSES: Order['status'][] = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const AREA_LABEL: Record<string, { en: string; ar: string }> = {
  westbank: { en: 'West Bank', ar: 'الضفة الغربية' },
  jerusalem: { en: 'Jerusalem', ar: 'القدس' },
  inside48: { en: '1948 Areas', ar: 'أراضي ١٩٤٨' },
};

type DeliveryDraft = CloudDeliveryUpdate;

function DeliveryTrackingEditor({ order, busy, lang, onSave }: { order: Order; busy: boolean; lang: string; onSave: (draft: DeliveryDraft) => void }) {
  const ar = lang === 'ar';
  const he = lang === 'he';
  const [draft, setDraft] = useState<DeliveryDraft>({
    carrierName: order.carrierName ?? '', trackingUrl: order.trackingUrl ?? '',
    deliveryPersonName: order.deliveryPersonName ?? '', deliveryPersonPhone: order.deliveryPersonPhone ?? '', trackingMessage: order.trackingMessage ?? '',
  });
  const field = (key: keyof DeliveryDraft, value: string) => setDraft((old) => ({ ...old, [key]: value }));
  const inputClass = 'h-10 w-full rounded-lg border border-line bg-panel2 px-3 text-[11px] text-white outline-none focus:border-electric';
  return <div className="mt-3 rounded-xl border border-electric/20 bg-panel p-3">
    <h4 className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white"><Truck size={14} className="text-electric"/>{ar ? 'معلومات التتبع والمندوب' : he ? 'פרטי מעקב ושליח' : 'Tracking & Courier Details'}</h4>
    <p className="mb-3 text-[10px] leading-relaxed text-mute">{ar ? 'هذه المعلومات تظهر للزبون في صفحة تتبع الطلب بعد إدخال رقم الطلب والهاتف المسجل.' : he ? 'פרטים אלה יוצגו ללקוח בעמוד מעקב ההזמנה לאחר הזנת מספר ההזמנה והטלפון.' : 'These details appear on the public tracking page after the customer enters their order number and checkout phone.'}</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-[10px] text-mute">{ar ? 'شركة التوصيل' : he ? 'חברת משלוחים' : 'Delivery company'}<input className={inputClass} value={draft.carrierName ?? ''} onChange={(e) => field('carrierName', e.target.value)} placeholder="e.g. Local courier" /></label>
      <label className="text-[10px] text-mute">{ar ? 'اسم المندوب' : he ? 'שם השליח' : 'Courier name'}<input className={inputClass} value={draft.deliveryPersonName ?? ''} onChange={(e) => field('deliveryPersonName', e.target.value)} placeholder="Courier name" /></label>
      <label className="text-[10px] text-mute">{ar ? 'هاتف المندوب' : he ? 'טלפון השליח' : 'Courier phone'}<input className={inputClass} value={draft.deliveryPersonPhone ?? ''} onChange={(e) => field('deliveryPersonPhone', e.target.value)} placeholder="+970…" /></label>
      <label className="text-[10px] text-mute">{ar ? 'رابط التتبع الخارجي' : he ? 'קישור מעקב חיצוני' : 'External tracking URL'}<input className={inputClass} value={draft.trackingUrl ?? ''} onChange={(e) => field('trackingUrl', e.target.value)} placeholder="https://carrier.example/track/…" /></label>
    </div>
    <label className="mt-2 block text-[10px] text-mute">{ar ? 'رسالة حالة للزبون' : he ? 'הודעת מצב ללקוח' : 'Customer-facing tracking message'}<textarea className="mt-1 min-h-20 w-full rounded-lg border border-line bg-panel2 p-3 text-[11px] text-white outline-none focus:border-electric" value={draft.trackingMessage ?? ''} onChange={(e) => field('trackingMessage', e.target.value)} placeholder={ar ? 'مثلاً: المندوب في الطريق إليك' : he ? 'לדוגמה: השליח בדרך אליך' : 'e.g. Your courier is on the way.'} /></label>
    <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[9px] text-mute">{ar ? 'استخدم رابط http/https آمناً فقط.' : he ? 'יש להשתמש בקישור http/https בלבד.' : 'Use an http/https URL only.'}</span><button type="button" disabled={busy} onClick={() => onSave(draft)} className="flex h-9 items-center gap-1.5 rounded-lg bg-electric px-3 text-[10px] font-bold text-ink disabled:opacity-50"><Save size={13}/>{busy ? (ar ? 'جارٍ الحفظ…' : he ? 'שומר…' : 'Saving…') : (ar ? 'حفظ معلومات التتبع' : he ? 'שמירת פרטי מעקב' : 'Save tracking details')}</button></div>
  </div>;
}

export function OrdersAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savingTrackingId, setSavingTrackingId] = useState<string | null>(null);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = db.orders;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((o) => o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.phone.replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, '')) || o.city.toLowerCase().includes(q));
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    return list;
  }, [db.orders, query, statusFilter]);

  const setStatus = async (id: string, status: Order['status']) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order || order.status === status || savingStatusId) return;
    setSavingStatusId(id);
    try {
      if (cloudConfigured) {
        if (status === 'cancelled' && order.payment === 'bank_transfer' && order.paymentStatus === 'awaiting_transfer') {
          const updated = await cancelCloudUnpaidOrder(order.number, 'Bank transfer order cancelled by administrator');
          setDb((d) => ({ ...d, orders: d.orders.map((o) => (o.number === updated.number ? { ...o, ...updated } : o)) }));
          toast('success', ar ? 'أُلغي طلب التحويل وأُعيد المخزون' : 'Bank-transfer order cancelled and stock released');
          return;
        }
        if (status === 'cancelled' && order.payment === 'card' && order.paymentStatus === 'awaiting_payment') {
          toast('error', ar ? 'لا تلغِ طلب البطاقة أثناء عملية الدفع. تحقق من حالة الدفع أولاً.' : 'Do not cancel a card order while payment is in progress. Check the payment status first.');
          return;
        }
        const updated = await updateCloudOrderStatus(order.number, status);
        setDb((d) => ({ ...d, orders: d.orders.map((o) => (o.number === updated.number ? { ...o, ...updated } : o)) }));
      } else {
        setDb((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, status, statusUpdatedAt: new Date().toISOString(), statusHistory: [...(o.statusHistory ?? []), { status, at: new Date().toISOString() }] } : o)) }));
        toast('info', ar ? 'حُفظ التغيير في هذا المتصفح فقط؛ اربط Supabase للمزامنة.' : 'Saved only in this browser. Connect Supabase for shared order updates.');
        return;
      }
      toast('success', ar ? 'حُدّثت حالة الطلب' : 'Order status updated');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : (ar ? 'تعذر تحديث الطلب' : 'Could not update order status'));
    } finally { setSavingStatusId(null); }
  };

  const confirmBankTransfer = async (order: Order) => {
    if (!cloudConfigured || order.payment !== 'bank_transfer' || order.paymentStatus !== 'awaiting_transfer' || savingPaymentId) return;
    setSavingPaymentId(order.id);
    try {
      const updated = await markCloudOrderPaid(order.number);
      setDb((d) => ({ ...d, orders: d.orders.map((o) => o.number === updated.number ? { ...o, ...updated } : o) }));
      toast('success', ar ? 'تم تأكيد التحويل البنكي وتحديث حالة الدفع' : 'Bank transfer confirmed; payment status updated');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : (ar ? 'تعذر تأكيد التحويل البنكي' : 'Could not confirm bank transfer'));
    } finally { setSavingPaymentId(null); }
  };

  const saveTracking = async (order: Order, draft: DeliveryDraft) => {
    setSavingTrackingId(order.id);
    try {
      const normalized = {
        carrierName: (draft.carrierName ?? '').trim().slice(0, 100),
        trackingUrl: (draft.trackingUrl ?? '').trim().slice(0, 1000),
        deliveryPersonName: (draft.deliveryPersonName ?? '').trim().slice(0, 100),
        deliveryPersonPhone: (draft.deliveryPersonPhone ?? '').trim().slice(0, 40),
        trackingMessage: (draft.trackingMessage ?? '').trim().slice(0, 600),
      };
      if (normalized.trackingUrl && !/^https?:\/\//i.test(normalized.trackingUrl)) throw new Error(ar ? 'رابط التتبع يجب أن يبدأ بـ https:// أو http://' : 'Tracking URL must start with https:// or http://');
      if (cloudConfigured) {
        const updated = await updateCloudOrderDelivery(order.number, normalized);
        setDb((d) => ({ ...d, orders: d.orders.map((o) => o.number === updated.number ? { ...o, ...updated } : o) }));
      } else {
        setDb((d) => ({ ...d, orders: d.orders.map((o) => o.number === order.number ? { ...o, ...normalized } : o) }));
        toast('info', ar ? 'حُفظ محلياً فقط. اربط Supabase لمشاركة بيانات التتبع مع العملاء على جميع الأجهزة.' : 'Saved locally only. Connect Supabase to share tracking details across devices.');
        return;
      }
      toast('success', ar ? 'تم حفظ معلومات التتبع' : 'Tracking details saved');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : (ar ? 'تعذر حفظ معلومات التتبع' : 'Could not save tracking details'));
    } finally { setSavingTrackingId(null); }
  };

  const counts = STATUSES.map((s) => ({ s, n: db.orders.filter((o) => o.status === s).length }));
  const areaLabel = (area: string, savedName?: string) => {
    const builtIn = AREA_LABEL[area];
    if (builtIn) return ar ? builtIn.ar : builtIn.en;
    const configured = db.delivery.additionalAreas?.find((entry) => entry.id === area);
    if (configured) return ar ? configured.nameAr : lang === 'he' ? (configured.nameHe || configured.nameEn) : configured.nameEn;
    return savedName || area;
  };

  return (
    <div>
      <SectionTitle sub={`${db.orders.length} ${ar ? 'طلب' : 'orders'} · ${ar ? 'إيرادات:' : 'revenue:'} ${fmtPrice(db.orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0), lang)}`}>{ar ? 'الطلبات' : 'Orders'}</SectionTitle>

      {/* status chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button onClick={() => setStatusFilter('')} className={`h-8 rounded-full border px-3 text-[10px] font-bold ${!statusFilter ? 'border-electric bg-electric/15 text-electric' : 'border-line text-mute'}`}>{ar ? 'الكل' : 'All'} ({db.orders.length})</button>
        {counts.map(({ s, n }) => <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} className={`h-8 rounded-full border px-3 text-[10px] font-bold ${statusFilter === s ? 'border-electric bg-electric/15 text-electric' : 'border-line text-mute'}`}><StatusPill status={s} ar={ar} /><span className="ms-1">{n}</span></button>)}
      </div>

      <div className="relative mb-3 max-w-md">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ar ? 'ابحث برقم الطلب، الاسم، الهاتف، المدينة…' : 'Search by order #, name, phone, city…'} className="h-11 w-full rounded-xl border border-line bg-panel2 ps-10 pe-3 text-[12px] outline-none focus:border-electric" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag size={34} />} title={ar ? 'لا توجد طلبات' : 'No orders yet'} hint={ar ? 'ستظهر الطلبات هنا فور تنفيذها من المتجر' : 'Orders placed in the storefront will appear here in real time'} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[760px] text-[11.5px]">
            <thead className="bg-panel2 text-[10px] font-bold uppercase tracking-wider text-mute">
              <tr>
                <th className="p-3 text-start">{ar ? 'الطلب' : 'Order'}</th>
                <th className="p-3 text-start">{ar ? 'الزبون' : 'Customer'}</th>
                <th className="p-3 text-start">{ar ? 'المنطقة' : 'Area'}</th>
                <th className="p-3 text-start">{ar ? 'الإجمالي' : 'Total'}</th>
                <th className="p-3 text-start">{ar ? 'الحالة' : 'Status'}</th>
                <th className="p-3 text-start">{ar ? 'التاريخ' : 'Date'}</th>
                <th className="w-12 p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-panel">
              {filtered.map((o) => (
                <Fragment key={o.id}>
                  <tr key={o.id} className="cursor-pointer hover:bg-panel2/60" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
                    <td className="p-3 font-display font-bold text-electric">{o.number}{o.couponCode && <span className="ms-1.5 rounded bg-violet-accent/20 px-1.5 py-0.5 text-[8.5px] font-bold text-violet-accent">{o.couponCode}</span>}</td>
                    <td className="p-3"><span className="block font-semibold text-white/90">{o.customerName}</span><a href={`tel:${o.phone}`} className="text-[9.5px] text-mute hover:text-electric" onClick={(e) => e.stopPropagation()}>{o.phone}</a></td>
                    <td className="p-3 text-mute">{areaLabel(o.area, o.areaName)}</td>
                    <td className="p-3 font-display font-bold text-white">{fmtPrice(o.total, lang)}</td>
                    <td className="p-3"><select value={o.status} disabled={savingStatusId === o.id} onClick={(e) => e.stopPropagation()} onChange={(e) => void setStatus(o.id, e.target.value as Order['status'])} className="h-8 rounded-lg border border-line bg-panel2 px-2 text-[10px] font-bold text-white outline-none focus:border-electric" aria-label="Status">{STATUSES.map((s) => <option key={s} value={s}>{ar ? { new: 'جديد', confirmed: 'مؤكد', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' }[s] : s}</option>)}</select></td>
                    <td className="p-3 text-[10px] text-mute">{fmtDate(o.createdAt, lang)}</td>
                    <td className="p-3"><ChevronDown size={17} className={`text-mute transition-transform ${openId === o.id ? 'rotate-180' : ''}`} /></td>
                  </tr>
                  {openId === o.id && (
                    <tr className="bg-panel2/50">
                      <td colSpan={7} className="p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">{ar ? 'القطع' : 'Items'}</h3>
                            <ul className="space-y-1.5">
                              {o.items.map((i, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-[11px]">
                                  <img src={i.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                                  <span className="min-w-0 flex-1"><span className="line-clamp-1 font-semibold text-white/85">{i.name}</span><span className="text-[9px] uppercase text-mute">{i.sku}{i.variantLabel ? ` · ${i.variantLabel}` : ''} · {i.qty} × {fmtPrice(i.unitPrice, lang)}</span></span>
                                  <span className="font-display font-bold">{fmtPrice(i.unitPrice * i.qty, lang)}</span>
                                </li>
                              ))}
                            </ul>
                            <dl className="mt-2 space-y-0.5 border-t border-line pt-2 text-[11px]">
                              <div className="flex justify-between"><dt className="text-mute">{ar ? 'المجموع الفرعي' : 'Subtotal'}</dt><dd>{fmtPrice(o.productSubtotal, lang)}</dd></div>
                              {o.discount > 0 && <div className="flex justify-between"><dt className="text-emerald-400">{ar ? 'خصم' : 'Discount'}</dt><dd className="text-emerald-400">−{fmtPrice(o.discount, lang)}</dd></div>}
                              <div className="flex justify-between"><dt className="text-mute">{ar ? 'التوصيل' : 'Delivery'}</dt><dd>{fmtPrice(o.deliveryFee, lang)}</dd></div>
                              <div className="flex justify-between border-t border-line pt-1 font-display text-sm font-bold"><dt>{ar ? 'الإجمالي' : 'Total'}</dt><dd className="text-electric">{fmtPrice(o.total, lang)}</dd></div>
                            </dl>
                          </div>
                          <div>
                            <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">{ar ? 'عنوان التوصيل' : 'Delivery Address'}</h3>
                            <div className="rounded-xl border border-line bg-panel p-3 text-[11.5px] leading-relaxed text-white/80">
                              <p className="flex items-center gap-1.5 font-bold"><MapPin size={13} className="text-electric" />{o.city} — {areaLabel(o.area, o.areaName)}</p>
                              <p className="mt-1">{o.address}</p>
                              <p className="mt-1.5 flex items-center gap-1.5"><Phone size={13} className="text-electric" /><a href={`tel:${o.phone}`} className="hover:text-electric">{o.phone}</a></p>
                              {o.email && <p className="mt-1 ps-5 text-mute">{o.email}</p>}
                              {o.notes && <p className="mt-1.5 border-t border-line pt-1.5 text-mute"><span className="font-bold">{ar ? 'ملاحظات: ' : 'Notes: '}</span>{o.notes}</p>}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <a href={`https://wa.me/${o.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="flex h-9 flex-1 items-center justify-center rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 text-[11px] font-bold text-[#25D366]">WhatsApp</a>
                              <button onClick={() => window.print()} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line text-[11px] font-bold text-white/80 hover:border-electric hover:text-electric"><Printer size={13} />{ar ? 'طباعة الفاتورة' : 'Print invoice'}</button>
                            </div>
                            <div className="mt-3 rounded-xl border border-line bg-panel p-3 text-[11px]">
                              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-white">{ar ? 'الدفع' : lang === 'he' ? 'תשלום' : 'Payment'}</span><span className={o.paymentStatus === 'paid' ? 'font-bold text-emerald-300' : 'font-bold text-amber-200'}>{o.paymentStatus === 'paid' ? (ar ? 'مدفوع' : lang === 'he' ? 'שולם' : 'Paid') : o.payment === 'cod' ? (ar ? 'الدفع عند الاستلام' : lang === 'he' ? 'תשלום בעת המסירה' : 'Cash on delivery') : o.paymentStatus === 'failed' || o.paymentStatus === 'cancelled' ? (ar ? 'فشل/أُلغي' : lang === 'he' ? 'נכשל/בוטל' : 'Failed / cancelled') : (ar ? 'بانتظار الدفع' : lang === 'he' ? 'ממתין לתשלום' : 'Awaiting payment')}</span></div>
                              {o.payment === 'bank_transfer' && o.paymentStatus === 'awaiting_transfer' && <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={!cloudConfigured || savingPaymentId === o.id} onClick={() => void confirmBankTransfer(o)} className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-[10px] font-bold text-white disabled:opacity-50">{savingPaymentId === o.id ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'تأكيد استلام التحويل' : lang === 'he' ? 'אשר קבלת העברה' : 'Confirm bank transfer received')}</button><span className="self-center text-[9px] text-mute">{ar ? 'استخدم هذا فقط بعد التحقق من الحساب البنكي.' : 'Only confirm after the funds appear in your bank account.'}</span></div>}
                              {!cloudConfigured && <p className="mt-1 text-[9px] text-amber-200">{ar ? 'وضع محلي: لا يمكن تأكيد الدفع عبر الأجهزة.' : 'Local demo mode: payment confirmation is not shared.'}</p>}
                            </div>
                            <DeliveryTrackingEditor key={o.number} order={o} busy={savingTrackingId === o.id} lang={lang} onSave={(draft) => void saveTracking(o, draft)} />
                            {o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-electric hover:text-white"><ExternalLink size={12}/>{ar ? 'فتح رابط تتبع شركة التوصيل' : 'Open carrier tracking link'}</a>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
