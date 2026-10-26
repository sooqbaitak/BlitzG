// BLITZ GAMING — customer account management (requires Supabase cloud mode)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Ban, ChevronDown, ChevronUp, Heart, Mail, RefreshCw, Send, ShieldOff, Star, Trash2, Users, UserRound, Save, Gift } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Button, EmptyState, Input, SectionTitle, StatCard, TextArea } from '../components/ui';
import { fmtDate, fmtPrice } from '../lib/i18n';
import { cloudConfigured, deleteManagedCustomer, fetchManagedCustomers, sendManagedCustomerMessage, updateManagedCustomer, type ManagedCustomer, type ManagedCustomerUpdate } from '../lib/cloud';

type CustomerDraft = { display_name: string; points: number; discount_percent: number; admin_note: string; account_message: string };
type MessageDraft = { subject: string; message: string };

export function CustomersAdmin() {
  const { db, lang, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const [customers, setCustomers] = useState<ManagedCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, CustomerDraft>>({});
  const [messages, setMessages] = useState<Record<string, MessageDraft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!cloudConfigured) return;
    setLoading(true);
    try {
      const result = await fetchManagedCustomers();
      setCustomers(result);
      setDrafts(Object.fromEntries(result.map((customer) => [customer.user_id, {
        display_name: customer.display_name || '', points: customer.points || 0,
        discount_percent: customer.discount_percent || 0, admin_note: customer.admin_note || '',
        account_message: customer.account_message || '',
      }])));
      setMessages((old) => {
        const next = { ...old };
        for (const customer of result) if (!next[customer.user_id]) next[customer.user_id] = { subject: 'A message from BLITZ GAMING', message: '' };
        return next;
      });
    } catch (error) {
      toast('error', error instanceof Error ? error.message : txt('Could not load customers.', 'تعذر تحميل الزبائن.', 'לא ניתן לטעון לקוחות.'));
    } finally { setLoading(false); }
  }, [toast, lang]);

  useEffect(() => { void loadCustomers(); }, [loadCustomers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => !query || [customer.display_name, customer.email, customer.phone, customer.user_id].some((v) => String(v || '').toLowerCase().includes(query)))
      .sort((a, b) => Number(b.highlighted) - Number(a.highlighted) || b.points - a.points || (b.last_order_at || '').localeCompare(a.last_order_at || ''));
  }, [customers, search]);
  const knownWishlistNames = (ids: string[]) => ids.map((id) => db.products.find((p) => p.id === id)?.nameEn || db.products.find((p) => p.id === id)?.sku || id).slice(0, 8);

  const updateDraft = (id: string, patch: Partial<CustomerDraft>) => setDrafts((old) => ({ ...old, [id]: { ...(old[id] || { display_name: '', points: 0, discount_percent: 0, admin_note: '', account_message: '' }), ...patch } }));
  const updateMessage = (id: string, patch: Partial<MessageDraft>) => setMessages((old) => ({ ...old, [id]: { ...(old[id] || { subject: 'A message from BLITZ GAMING', message: '' }), ...patch } }));

  const persist = async (id: string, patch: ManagedCustomerUpdate, success?: string) => {
    setBusyId(id);
    try {
      await updateManagedCustomer(id, patch);
      toast('success', success || txt('Customer saved.', 'تم حفظ بيانات الزبون.', 'פרטי הלקוח נשמרו.'));
      await loadCustomers();
    } catch (error) { toast('error', error instanceof Error ? error.message : txt('Could not save customer.', 'تعذر حفظ بيانات الزبون.', 'לא ניתן לשמור את פרטי הלקוח.')); }
    finally { setBusyId(null); }
  };

  const deleteCustomer = async (customer: ManagedCustomer) => {
    const confirmText = txt(`Permanently delete ${customer.email || customer.phone || customer.user_id}'s customer account? Historical order details are retained, but the account cannot be restored.`, `هل تريد حذف حساب ${customer.email || customer.phone || customer.user_id} نهائياً؟ ستبقى تفاصيل الطلبات السابقة لكن لا يمكن استعادة الحساب.`, `למחוק לצמיתות את חשבון ${customer.email || customer.phone || customer.user_id}? פרטי הזמנות קודמות יישמרו, אך לא ניתן לשחזר את החשבון.`);
    if (!window.confirm(confirmText)) return;
    setBusyId(customer.user_id);
    try {
      await deleteManagedCustomer(customer.user_id);
      setCustomers((old) => old.filter((c) => c.user_id !== customer.user_id));
      setExpanded((old) => old === customer.user_id ? null : old);
      toast('success', txt('Customer account deleted.', 'تم حذف حساب الزبون.', 'חשבון הלקוח נמחק.'));
    } catch (error) { toast('error', error instanceof Error ? error.message : txt('Could not delete the account.', 'تعذر حذف الحساب.', 'לא ניתן למחוק את החשבון.')); }
    finally { setBusyId(null); }
  };

  const sendMessage = async (customer: ManagedCustomer) => {
    const draft = messages[customer.user_id];
    if (!draft?.message.trim()) { toast('error', txt('Write a message first.', 'اكتب الرسالة أولاً.', 'כתוב הודעה תחילה.')); return; }
    setBusyId(customer.user_id);
    try {
      await sendManagedCustomerMessage(customer.user_id, draft.subject, draft.message);
      await updateManagedCustomer(customer.user_id, { account_message: draft.message });
      toast('success', txt('Email sent and account message saved.', 'تم إرسال البريد وحفظ الرسالة في الحساب.', 'הדוא״ל נשלח וההודעה נשמרה בחשבון.'));
      await loadCustomers();
    } catch (error) { toast('error', error instanceof Error ? error.message : txt('Message could not be sent.', 'تعذر إرسال الرسالة.', 'לא ניתן לשלוח את ההודעה.')); }
    finally { setBusyId(null); }
  };

  const localOrderCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email: string; orders: number; total: number; last: string }>();
    for (const order of db.orders) {
      const key = order.phone.replace(/[\s-]/g, '');
      const current = map.get(key);
      if (current) { current.orders += 1; current.total += order.total; if (order.createdAt > current.last) current.last = order.createdAt; if (!current.email && order.email) current.email = order.email; }
      else map.set(key, { name: order.customerName, phone: order.phone, email: order.email || '', orders: 1, total: order.total, last: order.createdAt });
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [db.orders]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle sub={txt(`${customers.length} registered accounts`, `${customers.length} حساب مسجّل`, `${customers.length} חשבונות רשומים`)}>{txt('Customers', 'الزبائن', 'לקוחות')}</SectionTitle>
        <Button variant="outline" size="sm" onClick={() => void loadCustomers()} loading={loading}><RefreshCw size={14}/>{txt('Refresh', 'تحديث', 'רענון')}</Button>
      </div>

      {!cloudConfigured && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-[12px] leading-relaxed text-amber-100"><strong>{txt('Cloud customer management is unavailable in local demo mode.', 'إدارة الحسابات السحابية غير متاحة في الوضع التجريبي المحلي.', 'ניהול לקוחות בענן אינו זמין במצב הדגמה מקומי.')}</strong><p className="mt-1">{txt('Connect Supabase and set the Vercel server variables before managing registered accounts. Existing local order contacts are shown below as read-only records.', 'اربط Supabase وأضف متغيرات الخادم في Vercel قبل إدارة الحسابات المسجّلة. تظهر بيانات الاتصال من الطلبات المحلية أدناه للقراءة فقط.', 'חבר את Supabase והגדר משתני שרת ב-Vercel לפני ניהול חשבונות. אנשי קשר מהזמנות מקומיות מוצגים למטה לקריאה בלבד.')}</p></div>}

      {cloudConfigured && <div className="grid gap-3 sm:grid-cols-3"><StatCard label={txt('Registered accounts', 'الحسابات المسجّلة', 'חשבונות רשומים')} value={customers.length}/><StatCard label={txt('Highlighted customers', 'الزبائن المميزون', 'לקוחות מודגשים')} value={customers.filter((c) => c.highlighted).length} tone="violet"/><StatCard label={txt('Blocked accounts', 'الحسابات المحظورة', 'חשבונות חסומים')} value={customers.filter((c) => c.blocked).length} tone="red"/></div>}

      {cloudConfigured && <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={txt('Search by name, email, phone or account ID…', 'ابحث بالاسم أو البريد أو الهاتف أو رقم الحساب…', 'חפש לפי שם, דוא״ל, טלפון או מזהה חשבון…')} className="max-w-xl"/>}

      {cloudConfigured ? filtered.length === 0 ? <EmptyState icon={<Users size={34}/>} title={txt('No matching customer accounts', 'لا توجد حسابات مطابقة', 'לא נמצאו חשבונות מתאימים')} hint={txt('Accounts created using Supabase OTP sign-in appear here.', 'تظهر هنا الحسابات المنشأة عبر تسجيل الدخول برمز Supabase.', 'חשבונות שנוצרו באמצעות כניסה בקוד Supabase יופיעו כאן.')}/> : <div className="space-y-3">
        {filtered.map((customer) => {
          const draft = drafts[customer.user_id] || { display_name: customer.display_name || '', points: customer.points || 0, discount_percent: customer.discount_percent || 0, admin_note: customer.admin_note || '', account_message: customer.account_message || '' };
          const message = messages[customer.user_id] || { subject: 'A message from BLITZ GAMING', message: '' };
          const isExpanded = expanded === customer.user_id;
          const customerOrders = Number(customer.order_count || 0);
          return <section key={customer.user_id} className={`overflow-hidden rounded-2xl border bg-panel ${customer.highlighted ? 'border-amber-400/50' : 'border-line'}`}>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-electric to-violet-accent font-display font-bold text-white">{(customer.display_name || customer.email || customer.phone || 'C').charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-white">{customer.display_name || customer.email || customer.phone || txt('Customer', 'زبون', 'לקוח')}</p>{customer.highlighted && <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">{txt('Highlighted', 'مميز', 'מודגש')}</span>}{customer.blocked && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-300">{txt('Blocked', 'محظور', 'חסום')}</span>}</div>
                <p className="mt-0.5 truncate text-[11px] text-mute">{customer.email || txt('No email', 'لا يوجد بريد', 'אין דוא״ל')} · {customer.phone || txt('No phone', 'لا يوجد هاتف', 'אין טלפון')}</p>
                <p className="mt-1 text-[10px] text-mute">{customerOrders} {txt('orders', 'طلبات', 'הזמנות')} · {fmtPrice(Number(customer.lifetime_value || 0), lang)} · {txt('Joined', 'تاريخ التسجيل', 'נרשם')} {fmtDate(customer.created_at, lang)}{customer.last_order_at ? ` · ${txt('Last order', 'آخر طلب', 'הזמנה אחרונה')} ${fmtDate(customer.last_order_at, lang)}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={busyId === customer.user_id} onClick={() => void persist(customer.user_id, { highlighted: !customer.highlighted }, customer.highlighted ? txt('Highlight removed.', 'تم إلغاء التمييز.', 'ההדגשה הוסרה.') : txt('Customer highlighted.', 'تم تمييز الزبون.', 'הלקוח הודגש.'))}><Star size={13} className={customer.highlighted ? 'fill-amber-300 text-amber-300' : ''}/>{customer.highlighted ? txt('Unmark', 'إلغاء التمييز', 'בטל הדגשה') : txt('Highlight', 'تمييز', 'הדגש')}</Button>
                <Button variant="outline" size="sm" onClick={() => setExpanded(isExpanded ? null : customer.user_id)}>{isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}{txt('Manage', 'إدارة', 'ניהול')}</Button>
              </div>
            </div>
            {isExpanded && <div className="space-y-4 border-t border-line bg-panel2/40 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label={txt('Display name', 'اسم العرض', 'שם תצוגה')} value={draft.display_name} onChange={(e) => updateDraft(customer.user_id, { display_name: e.target.value })}/>
                <Input label={txt('Loyalty points', 'نقاط الولاء', 'נקודות נאמנות')} type="number" min={0} max={10000000} value={draft.points} onChange={(e) => updateDraft(customer.user_id, { points: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}/>
                <div className="flex flex-wrap items-end gap-2"><Button variant="outline" size="sm" onClick={() => updateDraft(customer.user_id, { points: Math.max(0, draft.points - 100) })}>−100</Button><Button variant="outline" size="sm" onClick={() => updateDraft(customer.user_id, { points: draft.points + 100 })}><Gift size={13}/>+100 {txt('points', 'نقطة', 'נקודות')}</Button><span className="pb-2 text-[10px] text-mute">{txt('Adjust the balance, then save.', 'عدّل الرصيد ثم احفظ.', 'עדכן יתרה ואז שמור.')}</span></div>
                <Input label={txt('Personal discount (%)', 'الخصم الشخصي (%)', 'הנחה אישית (%)')} type="number" min={0} max={100} step="0.5" value={draft.discount_percent} onChange={(e) => updateDraft(customer.user_id, { discount_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}/>
              </div>
              <TextArea label={txt('Private admin note (not visible to customer)', 'ملاحظة إدارية خاصة (لا تظهر للزبون)', 'הערת מנהל פרטית (לא מוצגת ללקוח)')} value={draft.admin_note} onChange={(e) => updateDraft(customer.user_id, { admin_note: e.target.value })} rows={2}/>
              <TextArea label={txt('Message shown in the customer account', 'رسالة تظهر في حساب الزبون', 'הודעה שמוצגת בחשבון הלקוח')} value={draft.account_message} onChange={(e) => updateDraft(customer.user_id, { account_message: e.target.value })} rows={2}/>
              <div className="flex flex-wrap gap-2"><Button loading={busyId === customer.user_id} onClick={() => void persist(customer.user_id, { display_name: draft.display_name, points: draft.points, discount_percent: draft.discount_percent, admin_note: draft.admin_note, account_message: draft.account_message })}><Save size={14}/>{txt('Save customer', 'حفظ بيانات الزبون', 'שמור לקוח')}</Button><Button variant="outline" disabled={busyId === customer.user_id} onClick={() => void persist(customer.user_id, { blocked: !customer.blocked }, customer.blocked ? txt('Account unblocked.', 'تم إلغاء حظر الحساب.', 'החסימה הוסרה.') : txt('Account blocked.', 'تم حظر الحساب.', 'החשבון נחסם.'))}>{customer.blocked ? <ShieldOff size={14}/> : <Ban size={14} />}{customer.blocked ? txt('Unblock account', 'إلغاء الحظر', 'בטל חסימה') : txt('Block account', 'حظر الحساب', 'חסום חשבון')}</Button><Button variant="danger" disabled={busyId === customer.user_id} onClick={() => void deleteCustomer(customer)}><Trash2 size={14}/>{txt('Delete account', 'حذف الحساب', 'מחק חשבון')}</Button></div>
              <div className="rounded-xl border border-line bg-panel p-3">
                <h4 className="mb-2 flex items-center gap-2 text-[12px] font-bold text-white"><Mail size={14}/>{txt('Send a message', 'إرسال رسالة', 'שליחת הודעה')}</h4>
                <div className="grid gap-3"><Input label={txt('Email subject', 'عنوان البريد', 'נושא האימייל')} value={message.subject} onChange={(e) => updateMessage(customer.user_id, { subject: e.target.value })}/><TextArea label={txt('Message', 'الرسالة', 'הודעה')} value={message.message} onChange={(e) => updateMessage(customer.user_id, { message: e.target.value })} rows={3}/></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-mute">{customer.email ? txt(`Will send to ${customer.email} and save it in their account.`, `سيُرسل إلى ${customer.email} ويُحفظ في حسابه.`, `יישלח אל ${customer.email} ויישמר בחשבון.`) : txt('This customer has no email; you can still save an account message above.', 'لا يوجد بريد لهذا الزبون؛ يمكنك حفظ رسالة الحساب أعلاه.', 'ללקוח אין דוא״ל; אפשר לשמור הודעה בחשבון למעלה.')}</span><Button size="sm" disabled={!customer.email || busyId === customer.user_id} loading={busyId === customer.user_id} onClick={() => void sendMessage(customer)}><Send size={13}/>{txt('Send email', 'إرسال بريد', 'שלח דוא״ל')}</Button></div>
              </div>
              <div className="rounded-xl border border-line bg-panel p-3">
                <h4 className="mb-2 flex items-center gap-2 text-[12px] font-bold text-white"><Heart size={14} className="text-pink-400"/>{txt(`Wishlist (${customer.wishlist.length})`, `المفضلة (${customer.wishlist.length})`, `מועדפים (${customer.wishlist.length})`)}</h4>
                {customer.wishlist.length ? <p className="text-[11px] leading-relaxed text-mute">{knownWishlistNames(customer.wishlist).join(' · ')}{customer.wishlist.length > 8 ? ` · +${customer.wishlist.length - 8}` : ''}</p> : <p className="text-[11px] text-mute">{txt('No saved favorites yet.', 'لا توجد منتجات مفضلة بعد.', 'עדיין אין פריטים מועדפים.')}</p>}
                <p className="mt-2 text-[10px] text-mute"><BadgeCheck size={12} className="me-1 inline"/>{txt('Email verified', 'البريد مؤكد', 'דוא״ל מאומת')}: {customer.email_confirmed ? txt('Yes', 'نعم', 'כן') : txt('No', 'لا', 'לא')} · {txt('Phone verified', 'الهاتف مؤكد', 'טלפון מאומת')}: {customer.phone_confirmed ? txt('Yes', 'نعم', 'כן') : txt('No', 'לא', 'לא')}</p>
              </div>
            </div>}
          </section>;
        })}
      </div> : <div className="space-y-3">{localOrderCustomers.length === 0 ? <EmptyState icon={<Users size={34}/>} title={txt('No customer contacts yet', 'لا توجد بيانات زبائن بعد', 'אין עדיין פרטי לקוחות')} hint={txt('Once customers place orders, their contact details appear here.', 'ستظهر معلومات الاتصال هنا عند استلام طلبات.', 'פרטי לקוחות יוצגו כאן לאחר ביצוע הזמנות.')}/> : localOrderCustomers.map((c) => <div key={c.phone} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4"><div className="flex items-center gap-3"><UserRound size={20}/><div><strong className="text-[12px] text-white">{c.name}</strong><p className="text-[10px] text-mute">{c.email} · {c.phone}</p></div></div><div className="text-end text-[11px] text-mute">{c.orders} {txt('orders', 'طلبات', 'הזמנות')} · {fmtPrice(c.total, lang)}</div></div>)}</div>}
    </div>
  );
}
