// BLITZ GAMING — admin: store settings
import { useEffect, useState } from 'react';
import { Save, Store, Upload, Image as ImageIcon, Plus, Trash2, Link2, Mail, CreditCard, ShieldCheck, Building2, Bell, BellRing, SunMoon } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle, Button, Input, TextArea } from '../components/ui';
import { imageFileToDataUrl } from '../lib/images';
import { cloudConfigured, fetchPaymentCapabilities, uploadImageFile } from '../lib/cloud';
import type { SocialLink, MobileBottomBarItemId } from '../lib/types';
import { PAYMENT_METHODS, normalizePaymentMethods, hasBankTransferDetails } from '../lib/payments';

export function StoreSettingsAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const [s, setS] = useState({ ...db.store, paymentMethods: normalizePaymentMethods(db.store.paymentMethods) });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => typeof Notification === 'undefined' ? 'denied' : Notification.permission);
  const mobileItems: MobileBottomBarItemId[] = s.mobileBottomBarItems ?? ['home', 'shop', 'account', 'cart', 'whatsapp', 'theme'];
  const mobileOptions: { id: MobileBottomBarItemId; en: string; ar: string; he: string }[] = [
    { id: 'home', en: 'Home', ar: 'الرئيسية', he: 'ראשי' }, { id: 'shop', en: 'Shop', ar: 'تسوّق', he: 'חנות' },
    { id: 'account', en: 'Account', ar: 'حسابي', he: 'חשבון' }, { id: 'wishlist', en: 'Wishlist', ar: 'المفضلة', he: 'מועדפים' },
    { id: 'cart', en: 'Cart', ar: 'السلة', he: 'סל' }, { id: 'whatsapp', en: 'WhatsApp', ar: 'واتساب', he: 'WhatsApp' },
    { id: 'track', en: 'Track order', ar: 'تتبع الطلب', he: 'מעקב הזמנה' }, { id: 'build', en: 'Build setup', ar: 'تجميعتك', he: 'בניית סטאפ' },
  ];
  const [cardGatewayReady, setCardGatewayReady] = useState(false);
  useEffect(() => {
    let active = true;
    void fetchPaymentCapabilities().then((result) => { if (active) setCardGatewayReady(result.cardReady); }).catch(() => { if (active) setCardGatewayReady(false); });
    return () => { active = false; };
  }, []);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => db.store.socialLinks !== undefined ? db.store.socialLinks : [
    ...(db.store.facebook ? [{ id: 'social-facebook', label: 'Facebook', platform: 'facebook', url: db.store.facebook, active: true }] : []),
    ...(db.store.instagram ? [{ id: 'social-instagram', label: 'Instagram', platform: 'instagram', url: db.store.instagram, active: true }] : []),
    ...(db.store.email ? [{ id: 'social-email', label: 'Gmail', platform: 'email', url: `mailto:${db.store.email}`, active: true }] : []),
  ]);

  const updateBankTransferDetail = (key: keyof NonNullable<typeof s.bankTransferDetails>, value: string) => {
    setS((old) => ({
      ...old,
      bankTransferDetails: {
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        iban: '',
        swiftBic: '',
        instructionsEn: '',
        instructionsAr: '',
        instructionsHe: '',
        ...(old.bankTransferDetails ?? {}),
        [key]: value,
      },
    }));
  };

  const uploadBrandImage = async (file: File, field: 'logoUrl' | 'faviconUrl') => {
    const setUploading = field === 'logoUrl' ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);
    try {
      const target = field === 'faviconUrl' ? 256 : 1200;
      const dataUrl = await imageFileToDataUrl(file, target);
      if (cloudConfigured) {
        const blob = await (await fetch(dataUrl)).blob();
        const uploaded = await uploadImageFile(new File([blob], field === 'faviconUrl' ? 'store-favicon.webp' : 'store-logo.webp', { type: 'image/webp' }));
        setS((prev) => ({ ...prev, [field]: uploaded }));
      } else { setS((prev) => ({ ...prev, [field]: dataUrl })); }
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Image upload failed.'); }
    finally { setUploading(false); }
  };

  const moveMobileItem = (index: number, step: -1 | 1) => setS((old) => {
    const items = [...(old.mobileBottomBarItems ?? ['home', 'shop', 'account', 'cart', 'whatsapp', 'theme'])];
    const next = index + step; if (next < 0 || next >= items.length) return old;
    [items[index], items[next]] = [items[next], items[index]];
    return { ...old, mobileBottomBarItems: items };
  });
  const toggleMobileItem = (id: MobileBottomBarItemId, enabled: boolean) => setS((old) => {
    const items = [...(old.mobileBottomBarItems ?? ['home', 'shop', 'account', 'cart', 'whatsapp', 'theme'])];
    if (enabled) { if (items.includes(id) || items.length >= 6) return old; return { ...old, mobileBottomBarItems: [...items, id] }; }
    return { ...old, mobileBottomBarItems: items.filter((item) => item !== id) };
  });

  const save = () => {
    const paymentMethods = normalizePaymentMethods(s.paymentMethods);
    if (!paymentMethods.some((method) => method.id === 'cod' && method.enabled)) {
      toast('error', ar ? 'أبقِ الدفع عند الاستلام مفعّلاً حتى يتم ربط بوابة دفع أخرى واختبارها.' : 'Keep Cash on Delivery enabled until another payment gateway is connected and tested.');
      return;
    }
    const activeLinks = socialLinks.filter((link) => link.label.trim() && link.url.trim());
    const facebook = activeLinks.find((link) => (link.platform ?? '').toLowerCase() === 'facebook')?.url ?? '';
    const instagram = activeLinks.find((link) => (link.platform ?? '').toLowerCase() === 'instagram')?.url ?? '';
    setDb((d) => ({ ...d, store: { ...s, paymentMethods, facebook, instagram, socialLinks: activeLinks } }));
    toast('success', ar ? 'حُفظت إعدادات المتجر' : 'Store settings saved');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle sub={ar ? 'هوية المتجر وبيانات التواصل — تظهر في كامل الموقع' : 'Store identity & contact info — shown across the whole site'}><span className="flex items-center gap-2"><Store size={19} />{ar ? 'إعدادات المتجر' : 'Store Settings'}</span></SectionTitle>
      <div className="space-y-3 rounded-2xl border border-line bg-panel p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Store name (EN)" value={s.nameEn} onChange={(e) => setS({ ...s, nameEn: e.target.value })} />
          <Input label="اسم المتجر (AR)" value={s.nameAr} onChange={(e) => setS({ ...s, nameAr: e.target.value })} dir="rtl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="WhatsApp (intl format)" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} placeholder="+970595210647" />
          <Input label={ar ? 'الهاتف الظاهر' : 'Display phone'} value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} placeholder="+970595210647" />
        </div>
        <Input label={ar ? 'البريد الإلكتروني' : 'Email'} type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} />
        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-white/80"><ImageIcon size={15} className="text-electric"/>{ar ? 'شعار المتجر' : 'Store logo'}</div>
          <div className="flex flex-wrap items-center gap-3"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-panel">{s.logoUrl ? <img src={s.logoUrl} alt="Store logo preview" className="h-full w-full object-contain"/> : <span className="text-[10px] text-mute">Logo</span>}</div><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-electric/40 px-3 text-[10px] font-bold text-electric hover:bg-electric/10"> <Upload size={14}/>{uploadingLogo ? (ar ? 'جارٍ الرفع…' : 'Uploading…') : (ar ? 'رفع شعار من الجهاز' : 'Upload logo from device')}<input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={async (e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; if (!file) return; setUploadingLogo(true); try { if (cloudConfigured) { const dataUrl = await imageFileToDataUrl(file, 900); const blob = await (await fetch(dataUrl)).blob(); const uploaded = await uploadImageFile(new File([blob], 'store-logo.webp', { type: 'image/webp' })); setS((prev) => ({ ...prev, logoUrl: uploaded })); } else { const dataUrl = await imageFileToDataUrl(file, 900); setS((prev) => ({ ...prev, logoUrl: dataUrl })); } } catch (err) { toast('error', err instanceof Error ? err.message : 'Logo upload failed.'); } finally { setUploadingLogo(false); } }}/></label></div>
          <Input label={ar ? 'أو رابط الشعار' : 'Or logo image URL'} value={s.logoUrl ?? ''} onChange={(e) => setS({ ...s, logoUrl: e.target.value })} placeholder="https://…" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-bold text-mute">{ar ? 'نسبة أبعاد الشعار' : 'Logo aspect ratio'}<select value={s.logoAspectRatio ?? 'square'} onChange={(e) => setS({ ...s, logoAspectRatio: e.target.value as NonNullable<typeof s.logoAspectRatio> })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-3 text-[11px] text-white"><option value="natural">{ar ? 'طبيعي' : 'Natural'}</option><option value="square">1:1 Square</option><option value="wide">Wide 1.9:1</option><option value="landscape">Landscape 1.4:1</option><option value="portrait">Portrait 0.8:1</option></select></label>
            <label className="text-[10px] font-bold text-mute">{ar ? 'ملاءمة الصورة' : 'Image fit'}<select value={s.logoObjectFit ?? 'contain'} onChange={(e) => setS({ ...s, logoObjectFit: e.target.value as NonNullable<typeof s.logoObjectFit> })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-3 text-[11px] text-white"><option value="contain">Contain (show whole logo)</option><option value="cover">Cover (fill frame)</option><option value="fill">Fill (stretch)</option></select></label>
          </div>
          <p className="mt-1 text-[10px] text-mute">{cloudConfigured ? (ar ? 'سيظهر الشعار لجميع الزوار بعد الحفظ.' : 'The logo appears for all visitors after saving.') : (ar ? 'في المعاينة يُحفظ الملف على هذا المتصفح فقط.' : 'Preview mode stores the upload in this browser only.')}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-white/80"><ImageIcon size={15} className="text-electric"/>{ar ? 'أيقونة المتصفح (Favicon)' : 'Browser tab icon (Favicon)'}</div>
          <div className="flex flex-wrap items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-line bg-panel">{s.faviconUrl ? <img src={s.faviconUrl} alt="Favicon preview" className="h-full w-full object-contain"/> : <span className="text-[9px] text-mute">ICON</span>}</div><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-electric/40 px-3 text-[10px] font-bold text-electric hover:bg-electric/10"><Upload size={14}/>{uploadingFavicon ? (ar ? 'جارٍ الرفع…' : 'Uploading…') : (ar ? 'رفع أيقونة' : 'Upload favicon')}<input type="file" accept="image/*,.ico" className="hidden" disabled={uploadingFavicon} onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value=''; if (file) void uploadBrandImage(file, 'faviconUrl'); }}/></label></div>
          <Input label={ar ? 'أو رابط الأيقونة' : 'Or favicon URL'} value={s.faviconUrl ?? ''} onChange={(e) => setS({ ...s, faviconUrl: e.target.value })} placeholder="https://…/favicon.png"/>
          <p className="mt-1 text-[10px] text-mute">{ar ? 'بعد الحفظ تُحدّث أيقونة علامة تبويب المتصفح. قد تحتاج إلى تحديث قوي بسبب التخزين المؤقت.' : 'After saving, the browser-tab icon updates. Browsers may cache favicons; a hard refresh may be needed.'}</p>
        </div>

        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/80"><Store size={15} className="text-electric"/>{ar ? 'شريط التنقل السفلي للهاتف' : 'Mobile fixed bottom navigation'}</div>
          <p className="mb-3 text-[10px] leading-relaxed text-mute">{ar ? 'اختر الأزرار ورتبها. يظهر حتى 6 أزرار على الهواتف، مع استمرار ظهور رأس الموقع عند الصعود للأعلى.' : 'Choose and reorder shortcuts. Up to six appear on phones; the regular header remains available at the top.'}</p>
          <div className="space-y-1.5">{mobileOptions.map((item) => { const index = mobileItems.indexOf(item.id); const enabled = index >= 0; return <div key={item.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel p-2"><input aria-label={`Show ${item.en}`} type="checkbox" checked={enabled} onChange={(e) => toggleMobileItem(item.id, e.target.checked)} disabled={!enabled && mobileItems.length >= 6} className="accent-[#00a8ff]"/><span className="min-w-0 flex-1 text-[11px] font-semibold text-white/80">{lang === 'ar' ? item.ar : lang === 'he' ? item.he : item.en}</span>{enabled && <span className="text-[9px] text-electric">#{index + 1}</span>}<button type="button" disabled={!enabled || index === 0} onClick={() => moveMobileItem(index, -1)} className="rounded border border-line p-1 text-mute disabled:opacity-25" aria-label="Move up">↑</button><button type="button" disabled={!enabled || index === mobileItems.length - 1} onClick={() => moveMobileItem(index, 1)} className="rounded border border-line p-1 text-mute disabled:opacity-25" aria-label="Move down">↓</button></div>; })}</div>
          <p className="mt-2 text-[10px] text-mute">{mobileItems.length}/6 {ar ? 'أزرار محددة' : 'buttons selected'}</p>
        </div>

        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/80"><Link2 size={15} className="text-electric"/>{ar ? 'روابط التواصل الاجتماعي المخصصة' : 'Custom Social & Contact Links'}</div>
          <p className="mb-3 text-[10px] leading-relaxed text-mute">{ar ? 'أضف فيسبوك، إنستغرام، تيك توك، يوتيوب، تويتش، ديسكورد، البريد أو أي رابط مخصص. الروابط النشطة ستظهر في تذييل الموقع.' : 'Add Facebook, Instagram, TikTok, YouTube, Twitch, Discord, Gmail, or any custom URL. Active links appear in the storefront footer.'}</p>
          <div className="space-y-2">
            {socialLinks.map((link, index) => <div key={link.id} className="grid gap-2 rounded-lg border border-line bg-panel p-2 sm:grid-cols-[130px_1fr_1.5fr_auto_auto]">
              <Input label={ar ? 'المنصة' : 'Platform'} value={link.platform ?? ''} onChange={(e) => setSocialLinks((prev) => prev.map((item, i) => i === index ? { ...item, platform: e.target.value } : item))} placeholder="tiktok"/>
              <Input label={ar ? 'الاسم الظاهر' : 'Display label'} value={link.label} onChange={(e) => setSocialLinks((prev) => prev.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} placeholder="TikTok"/>
              <Input label={ar ? 'الرابط' : 'URL'} value={link.url} onChange={(e) => setSocialLinks((prev) => prev.map((item, i) => i === index ? { ...item, url: e.target.value } : item))} placeholder="https://… or mailto:…"/>
              <label className="flex items-center gap-1 text-[10px] text-mute"><input type="checkbox" checked={link.active !== false} onChange={(e) => setSocialLinks((prev) => prev.map((item, i) => i === index ? { ...item, active: e.target.checked } : item))} className="accent-[#00a8ff]"/>{ar ? 'نشط' : 'Active'}</label>
              <button type="button" onClick={() => setSocialLinks((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg p-2 text-mute hover:text-red-400" aria-label="Remove social link"><Trash2 size={15}/></button>
            </div>)}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setSocialLinks((prev) => [...prev, { id: `social-${Date.now()}`, label: '', platform: 'custom', url: '', active: true }])}><Plus size={14}/>{ar ? 'إضافة رابط' : 'Add Social Link'}</Button>
        </div>

        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/80"><CreditCard size={15} className="text-electric"/>{ar ? 'طرق الدفع عند إتمام الطلب' : 'Checkout Payment Methods'}</div>
          <p className="mb-3 text-[10px] leading-relaxed text-mute">{ar ? 'الدفع عند الاستلام مفعّل افتراضياً. البطاقات تعمل عبر صفحة دفع مستضافة من Lahza فقط بعد موافقة حساب التاجر وإضافة المفتاح السري في إعدادات Vercel. التحويل البنكي يدوي ويجب تأكيد وصول المبلغ من لوحة الطلبات. PayPal وApple Pay وGoogle Pay تحتاج تكاملات مستقلة. تغيير المفتاح لا يتم من هذه الصفحة.' : lang === 'he' ? 'תשלום בעת המסירה מופעל כברירת מחדל. תשלום בכרטיס פועל דרך דף תשלום מאובטח של Lahza רק לאחר אישור חשבון הסוחר והוספת מפתח סודי ב-Vercel. העברה בנקאית ידנית ודורשת אישור קבלת הכסף בלוח ההזמנות. PayPal, Apple Pay ו-Google Pay דורשים שילובים נפרדים. אין להזין סודות בעמוד זה.' : 'Cash on Delivery is enabled by default. Cards use Lahza hosted checkout only after merchant approval and adding the server-side secret in your hosting environment. Bank transfer is manual and must be confirmed from the Orders dashboard after funds arrive. PayPal, Apple Pay and Google Pay need separate integrations. Do not enter secret keys on this page.'}</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => {
              const current = normalizePaymentMethods(s.paymentMethods).find((entry) => entry.id === method.id);
              const enabled = current?.enabled ?? (method.id === 'cod');
              const label = lang === 'ar' ? method.labelAr : lang === 'he' ? method.labelHe : method.labelEn;
              const lockedCod = method.id === 'cod';
              return <label key={method.id} className="flex items-start gap-3 rounded-xl border border-line bg-panel p-3">
                <input type="checkbox" checked={enabled} onChange={(e) => setS((old) => ({ ...old, paymentMethods: normalizePaymentMethods(old.paymentMethods).map((entry) => entry.id === method.id ? { ...entry, enabled: e.target.checked } : entry) }))} className="mt-1 accent-[#00a8ff]" />
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/90">{label}{method.needsGateway && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] text-amber-200">{ar ? 'يتطلب ربط بوابة' : lang === 'he' ? 'דורש חיבור ספק' : 'Gateway required'}</span>}{lockedCod && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-300">{ar ? 'مفعّل افتراضياً' : lang === 'he' ? 'פעיל כברירת מחדל' : 'Default active'}</span>}</span><span className="mt-1 block text-[10px] leading-relaxed text-mute">{lang === 'ar' ? method.detailAr : lang === 'he' ? method.detailHe : method.detailEn}</span></span>
              </label>;
            })}
          </div>
          <div className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-[10px] leading-relaxed ${cardGatewayReady ? 'border-emerald-400/25 bg-emerald-400/5 text-emerald-100/80' : 'border-amber-400/25 bg-amber-400/5 text-amber-100/80'}`}><ShieldCheck size={14} className="mt-0.5 shrink-0"/><span>{cardGatewayReady ? (ar ? 'تم العثور على إعدادات بوابة البطاقات في الخادم. هذا لا يثبت موافقة التاجر؛ اختبر معاملة تجريبية قبل تفعيل الدفع المباشر.' : lang === 'he' ? 'נמצאה תצורת סליקת כרטיסים בשרת. אין בכך הוכחה לאישור הסוחר; בדקו עסקת ניסיון לפני הפעלת סליקה חיה.' : 'Card gateway settings were detected on the server. This does not prove merchant approval; test a sandbox transaction before enabling live payments.') : (ar ? 'بوابة البطاقات غير جاهزة بعد. أضف مفتاح Lahza المعتمد ومتغيرات Supabase السرية في إعدادات الاستضافة، ولا تضع الأسرار هنا.' : lang === 'he' ? 'סליקת הכרטיסים עדיין אינה מוגדרת. יש להוסיף מפתח Lahza מאושר ומשתני Supabase סודיים בהגדרות Vercel; אין להכניס סודות כאן.' : 'Card gateway is not configured yet. Add an approved Lahza key and server-side Supabase variables in your hosting environment; never put secrets here.')}</span></div>
          <div className="mt-2 rounded-lg border border-line bg-panel p-2.5 text-[10px] leading-relaxed text-mute">{cloudConfigured && hasBankTransferDetails(s.bankTransferDetails) ? (ar ? 'التحويل البنكي جاهز كطريقة يدوية: سيظهر رقم الحساب للعملاء، ويجب تأكيد وصول الحوالة يدوياً من لوحة الطلبات.' : lang === 'he' ? 'העברה בנקאית מוכנה להעברה ידנית: פרטי החשבון יוצגו ללקוחות, ויש לאשר קבלת כסף בלוח ההזמנות.' : 'Bank transfer is configured as a manual method: account details can be shown to customers, and an admin must confirm funds in Orders.') : (ar ? 'لإتاحة التحويل البنكي، احفظ اسم البنك وصاحب الحساب ورقم الحساب أو IBAN، ثم تأكد من إعداد Supabase. لا يتحقق الموقع تلقائياً من وصول المال.' : lang === 'he' ? 'כדי להפעיל העברה בנקאית, שמרו בנק, בעל חשבון ומספר חשבון או IBAN והגדירו Supabase. האתר אינו מאמת קבלת כסף אוטומטית.' : 'To enable bank transfer, save the bank, account holder and account number or IBAN, and configure Supabase. The site does not verify incoming funds automatically.')}</div>
        </div>


        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/80"><Building2 size={15} className="text-electric"/>{ar ? 'بيانات الحساب لاستقبال التحويلات البنكية' : lang === 'he' ? 'פרטי חשבון לקבלת העברות בנקאיות' : 'Bank account details for incoming transfers'}</div>
          <p className="mb-3 text-[10px] leading-relaxed text-mute">{ar ? 'تظهر هذه المعلومات للعميل عند اختيار التحويل البنكي. هذا تحويل يدوي وليس تحصيلاً آلياً؛ يجب تأكيد الاستلام من كشف الحساب.' : lang === 'he' ? 'הפרטים יופיעו ללקוחות שבוחרים העברה בנקאית. זו העברה ידנית ולא סליקה אוטומטית; יש לאמת קבלה מול חשבון הבנק.' : 'These details are shown to customers choosing bank transfer. This is a manual transfer, not automatic collection; confirm receipt against your bank statement.'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={ar ? 'اسم البنك' : 'Bank name'} value={s.bankTransferDetails?.bankName ?? ''} onChange={(e) => updateBankTransferDetail('bankName', e.target.value)} placeholder="e.g. Bank of Palestine" />
            <Input label={ar ? 'اسم صاحب الحساب' : 'Account holder'} value={s.bankTransferDetails?.accountHolder ?? ''} onChange={(e) => updateBankTransferDetail('accountHolder', e.target.value)} />
            <Input label={ar ? 'رقم الحساب' : 'Account number'} value={s.bankTransferDetails?.accountNumber ?? ''} onChange={(e) => updateBankTransferDetail('accountNumber', e.target.value)} />
            <Input label="IBAN" value={s.bankTransferDetails?.iban ?? ''} onChange={(e) => updateBankTransferDetail('iban', e.target.value)} />
            <Input label="SWIFT / BIC (optional)" value={s.bankTransferDetails?.swiftBic ?? ''} onChange={(e) => updateBankTransferDetail('swiftBic', e.target.value)} />
          </div>
          <div className="mt-3 grid gap-3">
            <TextArea label="Transfer instructions (EN)" value={s.bankTransferDetails?.instructionsEn ?? ''} onChange={(e) => updateBankTransferDetail('instructionsEn', e.target.value)} />
            <TextArea label="تعليمات التحويل (AR)" dir="rtl" value={s.bankTransferDetails?.instructionsAr ?? ''} onChange={(e) => updateBankTransferDetail('instructionsAr', e.target.value)} />
            <TextArea label="הוראות העברה (HE)" dir="rtl" value={s.bankTransferDetails?.instructionsHe ?? ''} onChange={(e) => updateBankTransferDetail('instructionsHe', e.target.value)} />
          </div>
          <p className={`mt-2 text-[10px] ${hasBankTransferDetails(s.bankTransferDetails) ? 'text-emerald-300' : 'text-amber-200'}`}>{hasBankTransferDetails(s.bankTransferDetails) ? (ar ? 'تم إدخال البيانات الأساسية؛ يمكن تفعيل التحويل البنكي بعد ربط Supabase.' : 'Basic bank details are complete; enable Bank Transfer after connecting Supabase.') : (ar ? 'أدخل البنك واسم صاحب الحساب ورقم الحساب أو IBAN لتفعيل خيار التحويل البنكي.' : 'Enter the bank, account holder, and account number or IBAN before enabling Bank Transfer.')}</p>
        </div>

        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/80"><Mail size={15} className="text-electric"/>{ar ? 'تنبيهات الطلبات عبر البريد' : 'New Order Email Notifications'}</div>
          <p className="mb-3 text-[10px] leading-relaxed text-mute">{ar ? 'بعد إعداد دالة الخادم وResend، ستصلك رسالة عند إنشاء طلب. استخدم المتغيرات الظاهرة في القالب.' : 'After configuring the serverless function and Resend, this address receives an email for each new cloud order. The server ignores client-supplied recipients.'}</p>
          <Input label={ar ? 'البريد المستلم (Gmail مسموح)' : 'Notification recipient email'} type="email" value={s.orderNotificationEmail ?? s.email} onChange={(e) => setS({ ...s, orderNotificationEmail: e.target.value })} placeholder="sooqbaitak@gmail.com"/>
          <Input label={ar ? 'عنوان الرسالة' : 'Email subject'} value={s.orderEmailSubject ?? ''} onChange={(e) => setS({ ...s, orderEmailSubject: e.target.value })} placeholder="New order {{order_number}}"/>
          <TextArea label={ar ? 'نص الرسالة' : 'Email message template'} value={s.orderEmailTemplate ?? ''} onChange={(e) => setS({ ...s, orderEmailTemplate: e.target.value })} className="min-h-[200px]"/>
          <p className="mt-2 text-[10px] leading-relaxed text-mute">{ '{{order_number}}, {{created_at}}, {{customer_name}}, {{phone}}, {{email}}, {{delivery_area}}, {{city}}, {{address}}, {{items}}, {{subtotal}}, {{discount}}, {{delivery_fee}}, {{total}}, {{coupon_code}}, {{build_preference}}, {{notes}}' }</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea label={ar ? 'العنوان (EN)' : 'Address (EN)'} value={s.addressEn} onChange={(e) => setS({ ...s, addressEn: e.target.value })} className="min-h-[70px]" />
          <TextArea label={ar ? 'العنوان (AR)' : 'Address (AR)'} value={s.addressAr} onChange={(e) => setS({ ...s, addressAr: e.target.value })} dir="rtl" className="min-h-[70px]" />
          <TextArea label="Address (HE)" value={s.addressHe ?? ''} onChange={(e) => setS({ ...s, addressHe: e.target.value })} dir="rtl" className="min-h-[70px]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={ar ? 'ساعات العمل (EN)' : 'Hours (EN)'} value={s.hoursEn} onChange={(e) => setS({ ...s, hoursEn: e.target.value })} />
          <Input label={ar ? 'ساعات العمل (AR)' : 'Hours (AR)'} value={s.hoursAr} onChange={(e) => setS({ ...s, hoursAr: e.target.value })} dir="rtl" />
          <Input label="Hours (HE)" value={s.hoursHe ?? ''} onChange={(e) => setS({ ...s, hoursHe: e.target.value })} dir="rtl" />
        </div>
        <Input label="Announcement (Hebrew)" value={s.announcementHe ?? ''} onChange={(e) => setS({ ...s, announcementHe: e.target.value })} dir="rtl" />
        <section className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/85"><SunMoon size={15} className="text-electric"/>{ar ? 'خيارات المظهر للزوار' : lang === 'he' ? 'אפשרויות מראה למבקרים' : 'Customer theme preference'}</div>
          <label className="flex items-start gap-2 rounded-lg border border-line bg-panel p-3 text-[11px] text-white/80"><input type="checkbox" className="mt-0.5 accent-[#00a8ff]" checked={s.allowCustomerThemeToggle !== false} onChange={(e) => setS({ ...s, allowCustomerThemeToggle: e.target.checked })}/><span>{ar ? 'السماح للزوار بالتبديل بين الوضع الليلي والنهاري' : lang === 'he' ? 'אפשרו למבקרים להחליף בין ערכת יום ולילה' : 'Allow customers to switch Day / Night themes'}<span className="mt-1 block text-[10px] text-mute">{ar ? 'يحفظ كل زائر تفضيله في متصفحه، ولا يغير الإعداد الافتراضي للمتجر.' : 'Each visitor saves their own preference; this does not change the store default.'}</span></span></label>
        </section>
        <section className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/85"><Bell size={15} className="text-electric"/>{ar ? 'إشعارات الطلبات في المتصفح' : lang === 'he' ? 'התראות הזמנות בדפדפן' : 'Browser notifications for new orders'}</div>
          <p className="mb-3 text-[10px] leading-relaxed text-mute">{ar ? 'تعمل الإشعارات أثناء بقاء لوحة الإدارة مفتوحة، بعد منح إذن المتصفح. لإرسال إشعارات عند إغلاق المتصفح يلزم إعداد خدمة Push منفصلة.' : lang === 'he' ? 'ההתראות פועלות כאשר לוח הניהול פתוח ולאחר מתן הרשאה. התראות כשהדפדפן סגור דורשות שירות Push נפרד.' : 'These alerts work while the admin dashboard remains open and browser permission is granted. Delivering notifications when the browser is closed requires a separate push service.'}</p>
          <label className="flex items-start gap-2 rounded-lg border border-line bg-panel p-3 text-[11px] text-white/80"><input type="checkbox" className="mt-0.5 accent-[#00a8ff]" checked={s.browserOrderNotificationsEnabled === true} onChange={(e) => setS({ ...s, browserOrderNotificationsEnabled: e.target.checked })}/><span>{ar ? 'تفعيل إشعارات الطلبات الجديدة' : lang === 'he' ? 'הפעלת התראות על הזמנות חדשות' : 'Enable new-order browser notifications'}</span></label>
          <label className="mt-2 flex items-start gap-2 rounded-lg border border-line bg-panel p-3 text-[11px] text-white/80"><input type="checkbox" className="mt-0.5 accent-[#00a8ff]" checked={s.browserOrderNotificationSound !== false} onChange={(e) => setS({ ...s, browserOrderNotificationSound: e.target.checked })}/><span>{ar ? 'تشغيل صوت عند وصول طلب جديد' : lang === 'he' ? 'השמעת צליל בהזמנה חדשה' : 'Play a sound when a new order arrives'}</span></label>
          <div className="mt-3 flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={async () => { if (typeof Notification === 'undefined') { toast('error', ar ? 'هذا المتصفح لا يدعم الإشعارات.' : 'This browser does not support notifications.'); return; } const permission = await Notification.requestPermission(); setNotificationPermission(permission); toast(permission === 'granted' ? 'success' : 'info', permission === 'granted' ? (ar ? 'تم السماح بالإشعارات.' : 'Browser notifications are permitted.') : (ar ? 'لم يتم منح إذن الإشعارات.' : 'Notification permission was not granted.')); }}>{<BellRing size={14}/>} {ar ? 'طلب إذن المتصفح' : lang === 'he' ? 'בקשת הרשאה' : 'Request browser permission'}</Button><Button variant="outline" size="sm" onClick={() => { if (typeof Notification === 'undefined' || Notification.permission !== 'granted') { toast('error', ar ? 'امنح الإذن أولاً.' : 'Grant browser permission first.'); return; } new Notification('BLITZ GAMING — Test', { body: ar ? 'إشعارات المتصفح تعمل.' : 'Your browser notifications are working.', icon: s.faviconUrl || '/favicon.svg' }); }}>{ar ? 'إرسال إشعار تجريبي' : lang === 'he' ? 'שליחת התראת בדיקה' : 'Send test notification'}</Button><span className="text-[10px] text-mute">{ar ? 'الحالة:' : 'Permission:'} {notificationPermission}</span></div>
        </section>
        <Input label={ar ? 'معدل نقاط الولاء لكل 10 شيكل' : 'Loyalty points earned per ₪10 spent'} type="number" min={0} value={s.loyaltyPointsPer10Ils ?? 1} onChange={(e) => setS({ ...s, loyaltyPointsPer10Ils: Math.max(0, Number(e.target.value) || 0) })} />
      </div>
      <div className="mt-5 flex justify-end"><Button size="lg" onClick={save}><Save size={17} />{ar ? 'حفظ الإعدادات' : 'Save Settings'}</Button></div>
    </div>
  );
}
