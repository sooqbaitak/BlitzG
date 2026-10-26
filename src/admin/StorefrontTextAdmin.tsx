// BLITZ GAMING — editable storefront UI translations, homepage copy and footer copy
import { useMemo, useState } from 'react';
import { Search, Save, Type, Languages, PanelsTopLeft, TextCursorInput } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle, Input, Button } from '../components/ui';
import { t as baseT, translationKeys, type Lang, type TKey } from '../lib/i18n';
import { HOME_COPY, type HomeCopyKey } from '../lib/content';
import type { FooterContent, LocalizedOverride } from '../lib/types';

const FOOTER_FIELDS: { id: string; label: string; fallback: { en: string; ar: string; he: string }; multiline?: boolean }[] = [
  { id: 'description', label: 'Footer description', fallback: { en: 'Gaming gear and accessories, with clear prices, regional delivery fees and cash on delivery.', ar: 'متجر لمعدات الألعاب وملحقاتها، مع معلومات واضحة عن الأسعار ورسوم التوصيل والدفع عند الاستلام.', he: 'ציוד ואביזרי גיימינג, עם מחירים ברורים, דמי משלוח לפי אזור ותשלום במזומן במסירה.' }, multiline: true },
  { id: 'trustCash', label: 'Trust strip: payment', fallback: { en: 'Cash on Delivery', ar: 'الدفع عند الاستلام', he: 'תשלום במזומן במסירה' } },
  { id: 'trustDelivery', label: 'Trust strip: delivery', fallback: { en: 'Clear Regional Delivery Fees', ar: 'رسوم توصيل واضحة حسب المنطقة', he: 'דמי משלוח ברורים לפי אזור' } },
  { id: 'trustSupport', label: 'Trust strip: support', fallback: { en: 'WhatsApp Customer Support', ar: 'دعم العملاء عبر واتساب', he: 'שירות לקוחות ב-WhatsApp' } },
  { id: 'trustGaming', label: 'Trust strip: products', fallback: { en: 'Gaming Gear & Accessories', ar: 'معدات وملحقات قيمنق', he: 'ציוד ואביזרי גיימינג' } },
  { id: 'shopHeading', label: 'Footer heading: shop', fallback: { en: 'Shop', ar: 'تسوّق', he: 'קנייה' } },
  { id: 'companyHeading', label: 'Footer heading: company', fallback: { en: 'Company', ar: 'المتجر', he: 'החנות' } },
  { id: 'deliveryHeading', label: 'Footer heading: delivery', fallback: { en: 'Delivery Fees', ar: 'رسوم التوصيل', he: 'דמי משלוח' } },
  { id: 'deliveryNote', label: 'Footer delivery note', fallback: { en: 'One delivery fee per order regardless of item count.', ar: 'رسوم توصيل واحدة لكل طلب بغض النظر عن عدد القطع.', he: 'דמי משלוח אחד לכל הזמנה, ללא קשר למספר הפריטים.' }, multiline: true },
  { id: 'copyright', label: 'Copyright notice', fallback: { en: 'All rights reserved', ar: 'جميع الحقوق محفوظة', he: 'כל הזכויות שמורות.' } },
  { id: 'slogan', label: 'Footer slogan', fallback: { en: 'Built with speed & power in Palestine', ar: 'صُنع بسرعة وقوة في فلسطين', he: 'נבנה במהירות ובעוצמה בפלסטין' } },
];

const LANGS: { id: Lang; label: string }[] = [{ id: 'en', label: 'English' }, { id: 'ar', label: 'العربية' }, { id: 'he', label: 'עברית' }];
const HOME_LABELS: Record<HomeCopyKey, string> = {
  heroBadge: 'Hero badge', heroHeadlineOne: 'Hero headline — first line', heroHeadlineTwo: 'Hero headline — second line', heroSubtitle: 'Hero description', heroShopButton: 'Hero shop button', heroBenefitOne: 'Hero benefit 1', heroBenefitTwo: 'Hero benefit 2', heroBenefitThree: 'Hero benefit 3', dealsSubtitle: 'Deals section description', dealsButton: 'Deals button', setupBadge: 'Build setup badge', setupSubtitle: 'Build setup description', setupButton: 'Build setup button', pcBuildBadge: 'PC build badge', pcBuildTitle: 'PC build headline', pcBuildSubtitle: 'PC build description', pcBuildButton: 'PC build button',
};

export function StorefrontTextAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar'; const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const [overrides, setOverrides] = useState<Record<string, LocalizedOverride>>(db.store.uiTextOverrides ?? {});
  const [footer, setFooter] = useState<FooterContent>(db.store.footerContent ?? {});
  const [home, setHome] = useState<Record<string, LocalizedOverride>>(db.store.homeContent ?? {});
  const [heroImage, setHeroImage] = useState(db.store.homeHeroImageUrl ?? '');
  const [pcImage, setPcImage] = useState(db.store.homePcBuildImageUrl ?? '');
  const [search, setSearch] = useState('');
  const [showHome, setShowHome] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showUi, setShowUi] = useState(true);
  const q = search.trim().toLowerCase();
  const shownKeys = useMemo(() => translationKeys.filter((key) => {
    if (!q) return true;
    return key.toLowerCase().includes(q) || LANGS.some(({ id }) => baseT(id, key).toLowerCase().includes(q)) || LANGS.some(({ id }) => (overrides[key]?.[id] ?? '').toLowerCase().includes(q));
  }), [q, overrides]);

  const updateOverride = (key: TKey, language: Lang, value: string) => setOverrides((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [language]: value } }));
  const updateHome = (key: HomeCopyKey, language: Lang, value: string) => setHome((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [language]: value } }));
  const suffix = (language: Lang) => language === 'en' ? 'En' : language === 'ar' ? 'Ar' : 'He';
  const updateFooter = (key: string, language: Lang, value: string) => setFooter((prev) => ({ ...prev, [`${key}${suffix(language)}`]: value } as FooterContent));
  const footerValue = (key: string, language: Lang, fallback: string) => (footer as Record<string, string | undefined>)[`${key}${suffix(language)}`] ?? fallback;

  const save = () => {
    setDb((d) => ({ ...d, store: { ...d.store, uiTextOverrides: overrides, footerContent: footer, homeContent: home, homeHeroImageUrl: heroImage.trim(), homePcBuildImageUrl: pcImage.trim() } }));
    toast('success', txt('Storefront text and design saved.', 'تم حفظ نصوص وتصميم المتجر.', 'טקסט ועיצוב החנות נשמרו.'));
  };

  return <div className="mx-auto max-w-6xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><SectionTitle sub={txt('Edit common interface labels in all languages, homepage copy and footer text. Product names and descriptions remain in Product Manager.', 'حرر نصوص الواجهة الشائعة بكل اللغات ومحتوى الرئيسية والتذييل. تُحرر أسماء المنتجات وأوصافها من إدارة المنتجات.', 'ערכו תוויות ממשק, תוכן דף הבית והטקסט בתחתית. שמות ותיאורי מוצרים נערכים במנהל המוצרים.')}>{txt('Storefront Text & Footer', 'نصوص المتجر والتذييل', 'טקסטי החנות והכותרת התחתונה')}</SectionTitle><Button onClick={save}><Save size={16}/>{txt('Save all text', 'حفظ كل النصوص', 'שמירת כל הטקסטים')}</Button></div>

    <section className="rounded-2xl border border-line bg-panel p-4">
      <button type="button" onClick={() => setShowHome((v) => !v)} className="mb-3 flex w-full items-center gap-2 text-start text-sm font-bold text-white"><PanelsTopLeft size={16} className="text-electric"/>{txt('Homepage text and images', 'نصوص وصور الصفحة الرئيسية', 'טקסט ותמונות דף הבית')}<span className="ms-auto text-[10px] text-electric">{showHome ? '−' : '+'}</span></button>
      {showHome && <>
        <div className="mb-3 grid gap-3 sm:grid-cols-2"><Input label={txt('Hero image URL', 'رابط صورة البانر الرئيسي', 'כתובת תמונת פתיחה')} value={heroImage} onChange={(e) => setHeroImage(e.target.value)} placeholder="/img/hero.jpg or https://…"/><Input label={txt('PC build banner image URL', 'رابط صورة بانر تجميعات PC', 'כתובת תמונת מחשבי גיימינג')} value={pcImage} onChange={(e) => setPcImage(e.target.value)} placeholder="/img/pcbuild.jpg or https://…"/></div>
        <div className="space-y-3">{(Object.keys(HOME_COPY) as HomeCopyKey[]).map((key) => <div key={key} className="rounded-xl border border-line bg-panel2 p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-electric">{HOME_LABELS[key]}</p><div className="grid gap-2 md:grid-cols-3">{LANGS.map(({ id, label }) => <label key={id} className="text-[9px] font-bold text-mute">{label}{HOME_COPY[key][id]}<input value={home[key]?.[id] ?? HOME_COPY[key][id]} onChange={(e) => updateHome(key, id, e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-2.5 text-[11px] font-normal text-white outline-none focus:border-electric" dir={id === 'en' ? 'ltr' : 'rtl'}/></label>)}</div></div>)}</div>
      </>}
    </section>

    <section className="rounded-2xl border border-line bg-panel p-4">
      <button type="button" onClick={() => setShowFooter((v) => !v)} className="mb-3 flex w-full items-center gap-2 text-start text-sm font-bold text-white"><Type size={16} className="text-electric"/>{txt('Footer and bottom-of-page text', 'نصوص التذييل وأسفل الصفحة', 'טקסטים בתחתית האתר')}<span className="ms-auto text-[10px] text-electric">{showFooter ? '−' : '+'}</span></button>
      {showFooter && <div className="space-y-3">{FOOTER_FIELDS.map((field) => <div key={field.id} className="rounded-xl border border-line bg-panel2 p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-electric">{field.label}</p><div className="grid gap-2 md:grid-cols-3">{LANGS.map(({ id, label }) => <label key={id} className="text-[9px] font-bold text-mute">{label}{field.multiline ? <textarea value={footerValue(field.id, id, field.fallback[id])} onChange={(e) => updateFooter(field.id, id, e.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-[11px] font-normal text-white outline-none focus:border-electric" dir={id === 'en' ? 'ltr' : 'rtl'}/> : <input value={footerValue(field.id, id, field.fallback[id])} onChange={(e) => updateFooter(field.id, id, e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-2.5 text-[11px] font-normal text-white outline-none focus:border-electric" dir={id === 'en' ? 'ltr' : 'rtl'}/>}</label>)}</div></div>)}</div>}
    </section>

    <section className="rounded-2xl border border-line bg-panel p-4">
      <button type="button" onClick={() => setShowUi((v) => !v)} className="mb-3 flex w-full items-center gap-2 text-start text-sm font-bold text-white"><Languages size={16} className="text-electric"/>{txt('Storefront interface labels and translations', 'تسميات واجهة المتجر وترجماتها', 'תוויות ממשק החנות והתרגומים')}<span className="ms-auto text-[10px] text-electric">{showUi ? '−' : '+'}</span></button>
      {showUi && <><div className="relative mb-3"><Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={txt('Search labels, keys or current translations…', 'ابحث عن التسميات أو الكلمات…', 'חיפוש תוויות או טקסטים…')} className="h-10 w-full rounded-xl border border-line bg-panel2 ps-9 pe-3 text-[11px] text-white outline-none focus:border-electric"/></div>
        <p className="mb-3 text-[10px] text-mute">{txt('Blank overrides fall back to the built-in translation. Categories, product names/descriptions, and policy-page content have their own editors.', 'ترك الترجمة فارغة يعيد النص الافتراضي. للفئات وأسماء وأوصاف المنتجات وصفحات السياسات محررات منفصلة.', 'שדה ריק משתמש בתרגום המובנה. לקטגוריות, למוצרים ולדפי מדיניות יש עורכים נפרדים.')}</p>
        <div className="space-y-2">{shownKeys.map((key) => <div key={key} className="rounded-xl border border-line bg-panel2 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold text-white">{key.replace(/_/g, ' ')}</span><span className="font-mono text-[8px] text-mute">{key}</span></div><div className="grid gap-2 md:grid-cols-3">{LANGS.map(({ id, label }) => <label key={id} className="text-[9px] font-bold text-mute">{label}<input value={overrides[key]?.[id] ?? baseT(id, key)} onChange={(e) => updateOverride(key, id, e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-[10px] font-normal text-white outline-none focus:border-electric" dir={id === 'en' ? 'ltr' : 'rtl'}/></label>)}</div></div>)}</div>
      </>}
    </section>
    <div className="flex justify-end"><Button size="lg" onClick={save}><Save size={16}/>{txt('Save & publish all text', 'حفظ ونشر النصوص', 'שמירה ופרסום')}</Button></div>
  </div>;
}
