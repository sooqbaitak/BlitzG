// BLITZ GAMING — customer account, OTP sign-in, loyalty, wishlist and order history
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, PackageSearch, Phone, CheckCircle2, Truck, PackageCheck, XCircle, Clock, Mail, LogOut, Star, Heart, RefreshCw, ShieldCheck, TicketPercent, Gift, LockKeyhole } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { fmtPrice, fmtDate } from '../lib/i18n';
import { Button, Input } from '../components/ui';
import { cloudConfigured, fetchCloudOrders } from '../lib/cloud';
import type { Order } from '../lib/types';

const STATUS_META: Record<string, { en: string; ar: string; he: string; cls: string; icon: typeof Clock }> = {
  new: { en: 'New — being confirmed', ar: 'جديد — قيد التأكيد', he: 'חדשה — ממתינה לאישור', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10', icon: Clock },
  confirmed: { en: 'Confirmed', ar: 'مؤكد', he: 'אושרה', cls: 'text-electric border-electric/40 bg-electric/10', icon: CheckCircle2 },
  shipped: { en: 'Out for delivery', ar: 'مع المندوب', he: 'בדרך אליך', cls: 'text-violet-accent border-violet-accent/40 bg-violet-accent/10', icon: Truck },
  delivered: { en: 'Delivered', ar: 'تم التسليم', he: 'נמסרה', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', icon: PackageCheck },
  cancelled: { en: 'Cancelled', ar: 'ملغي', he: 'בוטלה', cls: 'text-red-400 border-red-500/40 bg-red-500/10', icon: XCircle },
};

export function Account() {
  const { db, lang, t, customer, customerProfile, requestCustomerOtp, verifyCustomerOtp, signOutCustomer, refreshCustomerProfile, wishlist } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const navigate = useNavigate();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const nowDate = new Date().toISOString().slice(0, 10);
  const loyaltyCoupons = db.coupons.filter((c) => c.active && c.category === 'loyalty' && c.startsAt <= nowDate && c.expiresAt >= nowDate && (c.usageLimit === null || c.usedCount < c.usageLimit));

  useEffect(() => {
    let alive = true;
    if (!customer?.access_token) { setOrders([]); return; }
    setOrdersLoading(true);
    fetchCloudOrders(customer.access_token).then((remote) => {
      if (!alive) return;
      const joined = [...remote, ...db.orders.filter((o) => o.userId === customer.user.id && !remote.some((r) => r.number === o.number))];
      setOrders(joined.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }).catch(() => {
      if (alive) setOrders(db.orders.filter((o) => o.userId === customer.user.id));
    }).finally(() => { if (alive) setOrdersLoading(false); });
    return () => { alive = false; };
  }, [customer, db.orders]);

  const requestCode = async () => {
    setError(''); setMessage('');
    if (!cloudConfigured) { setError(txt('Customer sign-in needs the Supabase setup described in DEPLOY_NETLIFY.md. It is not safe to create customer accounts in browser storage.', 'تسجيل العملاء يحتاج إعداد Supabase الموضح في DEPLOY_NETLIFY.md. لا يمكن إنشاء حسابات آمنة باستخدام تخزين المتصفح فقط.', 'כניסת לקוחות דורשת הגדרת Supabase לפי DEPLOY_NETLIFY.md. לא בטוח ליצור חשבונות בדפדפן בלבד.')); return; }
    if (method === 'email' && !/^\S+@\S+\.\S+$/.test(identifier.trim())) { setError(txt('Enter a valid email address.', 'أدخل بريداً إلكترونياً صحيحاً.', 'הזן כתובת דוא״ל תקינה.')); return; }
    if (method === 'phone' && identifier.trim().replace(/[\s()-]/g, '').length < 9) { setError(txt('Enter a valid phone number with country code.', 'أدخل رقم هاتف صحيحاً مع رمز الدولة.', 'הזן מספר טלפון תקין כולל קידומת מדינה.')); return; }
    setBusy(true);
    try { await requestCustomerOtp(identifier, method); setSent(true); setMessage(txt('A verification code was sent. Check your inbox or SMS.', 'تم إرسال رمز التحقق. افحص البريد الوارد أو الرسائل.', 'קוד אימות נשלח. בדוק את הדוא״ל או הודעת ה-SMS.')); }
    catch (e) { setError(e instanceof Error ? e.message : txt('Could not send a code. Check account settings.', 'تعذر إرسال الرمز. تحقق من إعدادات الحساب.', 'לא ניתן לשלוח קוד. בדוק את הגדרות החשבון.')); }
    finally { setBusy(false); }
  };
  const verifyCode = async () => {
    setError(''); setMessage(''); setBusy(true);
    try { await verifyCustomerOtp(identifier, code, method); setMessage(txt('You are signed in.', 'تم تسجيل الدخول بنجاح.', 'התחברת בהצלחה.')); setSent(false); setCode(''); await refreshCustomerProfile(); }
    catch (e) { setError(e instanceof Error ? e.message : txt('The code is invalid or expired.', 'رمز التحقق غير صحيح أو انتهت صلاحيته.', 'הקוד שגוי או פג תוקפו.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-electric/30 bg-electric/10 text-electric"><User size={23} /></div>
        <div><h1 className="font-display text-2xl font-bold uppercase text-white">{txt('My Account', 'حسابي', 'החשבון שלי')}</h1><p className="mt-1 text-[11px] text-mute">{txt('Your orders, favorites and BLITZ loyalty rewards', 'طلباتك ومفضلاتك ونقاط BLITZ', 'ההזמנות, המועדפים ונקודות הנאמנות שלך')}</p></div>
      </div>

      {!customer ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-panel p-5 sm:p-7">
          <h2 className="font-display text-lg font-bold text-white">{txt('Sign in or create an account', 'تسجيل الدخول أو إنشاء حساب', 'כניסה או יצירת חשבון')}</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-mute">{txt('Use your Gmail address or mobile number. We will send a one-time verification code.', 'استخدم Gmail أو رقم هاتفك المحمول. سنرسل رمز تحقق لمرة واحدة.', 'השתמש בכתובת Gmail או במספר נייד. נשלח קוד אימות חד-פעמי.')}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => { setMethod('email'); setSent(false); }} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-bold ${method === 'email' ? 'border-electric bg-electric/10 text-electric' : 'border-line text-white/65'}`}><Mail size={15}/>Gmail / Email</button>
            <button onClick={() => { setMethod('phone'); setSent(false); }} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-bold ${method === 'phone' ? 'border-electric bg-electric/10 text-electric' : 'border-line text-white/65'}`}><Phone size={15}/>{txt('Mobile number', 'رقم الجوال', 'מספר נייד')}</button>
          </div>
          <div className="mt-4"><Input label={method === 'email' ? 'Gmail / Email' : txt('Phone number (include +970)', 'رقم الهاتف (مع +970)', 'מספר טלפון (כולל +970)')} value={identifier} onChange={(e) => setIdentifier(e.target.value)} type={method === 'email' ? 'email' : 'tel'} placeholder={method === 'email' ? 'you@gmail.com' : '+970 59 000 0000'} /></div>
          {sent && <div className="mt-3"><Input label={txt('Verification code', 'رمز التحقق', 'קוד אימות')} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="123456" /></div>}
          {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">{error}</p>}
          {message && <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">{message}</p>}
          <Button className="mt-4 w-full" size="lg" loading={busy} onClick={sent ? verifyCode : requestCode}>{sent ? txt('Verify and sign in', 'تحقق وتسجيل الدخول', 'אמת והתחבר') : txt('Send verification code', 'إرسال رمز التحقق', 'שלח קוד אימות')}</Button>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-panel2 p-3 text-[10px] leading-relaxed text-mute"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-electric"/>{txt('Accounts require the shared cloud backend to work across devices. Phone verification also requires an SMS provider configured in Supabase.', 'تحتاج الحسابات إلى قاعدة بيانات سحابية مشتركة للعمل على جميع الأجهزة. يتطلب التحقق برقم الهاتف إعداد خدمة رسائل SMS في Supabase.', 'חשבונות דורשים מסד נתונים ענני משותף כדי לפעול בין מכשירים. אימות טלפון דורש ספק SMS ב-Supabase.')}</div>
        </div>
      ) : (
        <div className="space-y-5">
          {customerProfile?.account_message && <div className="rounded-2xl border border-electric/30 bg-electric/10 p-4"><div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-electric"><Mail size={15}/>{txt('Message from BLITZ GAMING', 'رسالة من بلتز قيمنق', 'הודעה מ-BLITZ GAMING')}</div><p className="whitespace-pre-wrap text-[12px] leading-relaxed text-white/85">{customerProfile.account_message}</p></div>}
          {customerProfile?.blocked && <div role="alert" className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4 text-[12px] text-red-200">{txt('This account is blocked. Please contact customer support.', 'هذا الحساب موقوف. يرجى التواصل مع خدمة العملاء.', 'החשבון חסום. יש לפנות לתמיכת הלקוחות.')}</div>}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-panel p-4"><div className="flex items-center gap-2 text-[11px] font-bold text-mute"><Star size={15} className="text-amber-300"/>{txt('LOYALTY POINTS', 'نقاط الولاء', 'נקודות נאמנות')}</div><p className="mt-2 font-display text-3xl font-bold text-electric">{customerProfile?.points ?? 0}</p><p className="mt-1 text-[10px] text-mute">{txt('Earn points with completed orders and unlock loyalty coupons.', 'اجمع النقاط من الطلبات واستخدمها لفتح أكواد الولاء.', 'צבור נקודות מהזמנות ופתח קופוני נאמנות.')}</p></div>
            <div className="rounded-2xl border border-line bg-panel p-4"><div className="flex items-center gap-2 text-[11px] font-bold text-mute"><PackageSearch size={15} className="text-electric"/>{txt('ORDERS', 'الطلبات', 'הזמנות')}</div><p className="mt-2 font-display text-3xl font-bold text-white">{orders.length}</p><p className="mt-1 text-[10px] text-mute">{txt('Your purchase history', 'سجل مشترياتك', 'היסטוריית הרכישות שלך')}</p></div>
            <div className="rounded-2xl border border-line bg-panel p-4"><div className="flex items-center gap-2 text-[11px] font-bold text-mute"><Heart size={15} className="text-rose-400"/>{txt('FAVORITES', 'المفضلة', 'מועדפים')}</div><p className="mt-2 font-display text-3xl font-bold text-white">{wishlist.length}</p><Link to="/wishlist" className="mt-1 inline-block text-[10px] font-bold text-electric">{txt('View saved products →', 'عرض المنتجات المحفوظة ←', 'צפה במוצרים השמורים ←')}</Link></div>
          </div>
          <div className="rounded-2xl border border-violet-accent/30 bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-display text-lg font-bold text-white"><Gift size={18} className="text-violet-accent"/>{txt('Loyalty rewards', 'مكافآت الولاء', 'הטבות נאמנות')}</h2><p className="mt-1 text-[11px] text-mute">{txt('Use your points to unlock special promo codes. Points are deducted only when an order using the reward is successfully placed.', 'استخدم نقاطك لفتح أكواد خصم خاصة. تُخصم النقاط فقط عند تأكيد طلب يستخدم المكافأة.', 'השתמשו בנקודות כדי לפתוח קופונים מיוחדים. הנקודות ינוכו רק לאחר ביצוע הזמנה מוצלחת עם ההטבה.')}</p></div><span className="rounded-full border border-violet-accent/40 bg-violet-accent/10 px-3 py-1 text-[11px] font-bold text-violet-200">{customerProfile?.points ?? 0} {txt('points available', 'نقطة متاحة', 'נקודות זמינות')}</span></div>
            {loyaltyCoupons.length === 0 ? <p className="mt-4 text-[11px] text-mute">{txt('No loyalty rewards are available right now.', 'لا توجد مكافآت ولاء متاحة حالياً.', 'אין כרגע הטבות נאמנות זמינות.')}</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{loyaltyCoupons.map((coupon) => { const cost = coupon.pointsCost ?? 0; const eligible = (customerProfile?.points ?? 0) >= cost; const label = coupon.target === 'delivery' ? txt('delivery', 'التوصيل', 'משלוח') : txt('products', 'المنتجات', 'מוצרים'); const discountText = coupon.type === 'percent' ? `${coupon.value}% ${label}` : `${coupon.value} ₪ ${txt('off', 'خصم', 'הנחה')} ${label}`; return <div key={coupon.id} className="rounded-xl border border-line bg-panel2 p-4"><div className="flex items-start justify-between gap-2"><div><span className="inline-flex items-center gap-1 rounded-full border border-violet-accent/40 bg-violet-accent/10 px-2 py-1 text-[9px] font-bold uppercase text-violet-200"><TicketPercent size={11}/>{txt('Reward coupon', 'كود مكافأة', 'קופון הטבה')}</span><h3 className="mt-2 font-display text-base font-bold text-white">{coupon.code}</h3><p className="mt-1 text-[11px] text-white/70">{coupon.description || discountText}</p></div><div className="text-end"><p className="font-display text-lg font-bold text-electric">{discountText}</p><p className="mt-1 text-[10px] font-bold text-amber-300"><Star size={11} className="inline"/> {cost} {txt('points', 'نقطة', 'נקודות')}</p></div></div><Button className="mt-3 w-full" size="sm" disabled={!eligible} onClick={() => navigate('/checkout', { state: { coupon: coupon.code } })}>{eligible ? txt('Use reward at checkout', 'استخدم المكافأة عند الدفع', 'השתמשו בהטבה בקופה') : <><LockKeyhole size={13}/>{txt(`Need ${Math.max(0, cost - (customerProfile?.points ?? 0))} more points`, `تحتاج ${Math.max(0, cost - (customerProfile?.points ?? 0))} نقطة إضافية`, `חסרות ${Math.max(0, cost - (customerProfile?.points ?? 0))} נקודות`)}</>}</Button></div>; })}</div>}
          </div>
          <div className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-white">{txt('Account details', 'بيانات الحساب', 'פרטי החשבון')}</h2><p className="mt-1 text-[12px] text-mute">{customer.user.email || customer.user.phone}</p></div><Button variant="outline" onClick={() => void signOutCustomer()}><LogOut size={15}/>{txt('Sign out', 'تسجيل الخروج', 'התנתק')}</Button></div>
            <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setOrdersLoading(true); void fetchCloudOrders(customer.access_token).then(setOrders).catch((e) => setError(String(e))).finally(() => setOrdersLoading(false)); }}><RefreshCw size={14}/>{txt('Refresh history', 'تحديث السجل', 'רענן היסטוריה')}</Button><Button variant="outline" onClick={() => void refreshCustomerProfile()}><Star size={14}/>{txt('Refresh points', 'تحديث النقاط', 'רענן נקודות')}</Button></div>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white"><PackageSearch size={18} className="text-electric"/>{txt('Purchase history', 'سجل المشتريات', 'היסטוריית רכישות')}</h2>
            {ordersLoading ? <p className="py-5 text-center text-[12px] text-mute">{txt('Loading…', 'جارٍ التحميل…', 'טוען…')}</p> : orders.length === 0 ? <p className="py-6 text-center text-[12px] text-mute">{txt('No orders linked to this account yet. Make sure to sign in before checkout.', 'لا توجد طلبات مرتبطة بهذا الحساب. سجّل الدخول قبل إتمام الطلب.', 'אין עדיין הזמנות בחשבון. יש להתחבר לפני ביצוע הזמנה.')}</p> : <div className="space-y-3">{orders.map((order) => { const meta = STATUS_META[order.status] ?? STATUS_META.new; const Icon = meta.icon; return <div key={order.number} className="rounded-xl border border-line bg-panel2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono text-[12px] font-bold text-electric">{order.number}</p><p className="mt-1 text-[10px] text-mute">{fmtDate(order.createdAt, lang)} · {order.items.length} {txt('item lines', 'أنواع', 'פריטים')}</p></div><span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${meta.cls}`}><Icon size={12}/>{he ? meta.he : ar ? meta.ar : meta.en}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3"><span className="text-[11px] text-mute">{txt('Total', 'الإجمالي', 'סה״כ')}</span><strong className="font-display text-lg text-white">{fmtPrice(order.total, lang)}</strong><Link to={`/order-confirmation/${encodeURIComponent(order.number)}`} className="text-[10px] font-bold text-electric">{txt('View details →', 'عرض التفاصيل ←', 'צפה בפרטים ←')}</Link></div>{order.loyaltyPointsEarned ? <p className="mt-2 text-[10px] font-bold text-amber-300">+{order.loyaltyPointsEarned} {txt('loyalty points earned', 'نقطة ولاء مكتسبة', 'נקודות נאמנות שנצברו')}</p> : null}</div>; })}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
