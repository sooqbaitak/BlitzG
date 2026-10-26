// BLITZ GAMING — admin controls for the public setup builder
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Save, Settings2 } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Button, Input, SectionTitle, TextArea } from '../components/ui';
import { productMatchesCategoryTree, categoryTreeIds } from '../lib/categories';

const DEFAULT_CATEGORY_IDS = ['c-keyboards', 'c-mice', 'c-headsets', 'c-controllers', 'c-monitors', 'c-chairs'];

export function BuildSetupAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const initialIds = db.store.buildSetupCategoryIds?.length ? db.store.buildSetupCategoryIds : DEFAULT_CATEGORY_IDS;
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds.filter((id) => db.categories.some((c) => c.id === id)));
  const [noticeEn, setNoticeEn] = useState(db.store.buildSetupNoticeEn ?? '');
  const [noticeAr, setNoticeAr] = useState(db.store.buildSetupNoticeAr ?? '');
  const [noticeHe, setNoticeHe] = useState(db.store.buildSetupNoticeHe ?? '');
  const categoryLabel = (c: typeof db.categories[number]) => ar ? c.nameAr : he ? (c.nameHe || c.nameEn) : c.nameEn;
  const sortedAvailable = useMemo(() => [...db.categories].filter((c) => c.visible !== false).sort((a, b) => a.order - b.order), [db.categories]);
  const selectedCategories = selectedIds.map((id) => db.categories.find((c) => c.id === id)).filter((c): c is typeof db.categories[number] => Boolean(c));
  const toggle = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const move = (index: number, step: -1 | 1) => setSelectedIds((ids) => {
    const nextIndex = index + step;
    if (nextIndex < 0 || nextIndex >= ids.length) return ids;
    const next = [...ids];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });
  const save = () => {
    if (!selectedIds.length) { toast('error', txt('Select at least one category.', 'اختر فئة واحدة على الأقل.', 'בחרו לפחות קטגוריה אחת.')); return; }
    setDb((d) => ({ ...d, store: { ...d.store, buildSetupCategoryIds: selectedIds, buildSetupNoticeEn: noticeEn.trim(), buildSetupNoticeAr: noticeAr.trim(), buildSetupNoticeHe: noticeHe.trim() } }));
    toast('success', txt('Setup builder settings saved.', 'تم حفظ إعدادات مصمم التجميعة.', 'הגדרות בונה הסטאפ נשמרו.'));
  };
  return <div className="mx-auto max-w-4xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><SectionTitle sub={txt('Choose which categories appear in Build Your Setup and arrange their order.', 'اختر الفئات التي تظهر في صفحة تكوين التجميعة ورتّبها.', 'בחרו אילו קטגוריות יופיעו בבונה הסטאפ וסדרו אותן.')}>{txt('Build Your Setup', 'تكوين التجميعة', 'בונה הסטאפ')}</SectionTitle><Button onClick={save}><Save size={15}/>{txt('Save settings', 'حفظ الإعدادات', 'שמירת הגדרות')}</Button></div>
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white"><Settings2 size={16} className="text-electric"/>{txt('Visible builder categories', 'الفئات الظاهرة في المصمم', 'קטגוריות שיופיעו בבונה')}</h2>
      <p className="mb-3 text-[11px] text-mute">{txt('Check categories to include them. Use the arrows to set the order customers see on the public page.', 'حدد الفئات المطلوبة ثم استخدم الأسهم لتحديد ترتيب ظهورها للزبائن.', 'סמנו קטגוריות והשתמשו בחצים כדי לקבוע את סדר הופעתן ללקוחות.')}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">{sortedAvailable.map((c) => <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel2 p-3"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggle(c.id)} className="accent-[#00a8ff]"/><span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-white">{categoryLabel(c)}</span><span className="text-[9px] text-mute">{c.parentId ? `↳ ${db.categories.find((x) => x.id === c.parentId)?.nameEn ?? ''}` : c.slug}</span></span><span className="text-[9px] text-mute">{db.products.filter((p) => p.status === 'active' && productMatchesCategoryTree(p, categoryTreeIds(db.categories, c.id))).length} {txt('products', 'منتج', 'מוצרים')}</span></label>)}</div>
        <div className="rounded-xl border border-dashed border-line p-3"><h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-electric">{txt('Customer display order', 'ترتيب العرض للزبائن', 'סדר התצוגה ללקוחות')}</h3>{selectedCategories.length === 0 ? <p className="py-5 text-center text-[11px] text-mute">{txt('No categories selected.', 'لم يتم اختيار فئات.', 'לא נבחרו קטגוריות.')}</p> : <div className="space-y-2">{selectedCategories.map((c, i) => <div key={c.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel2 p-2"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-electric/10 text-[10px] font-bold text-electric">{i + 1}</span><span className="flex-1 text-[11px] font-semibold text-white">{categoryLabel(c)}</span><button disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-mute hover:text-white disabled:opacity-30" aria-label="Move category up"><ArrowUp size={14}/></button><button disabled={i === selectedCategories.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-mute hover:text-white disabled:opacity-30" aria-label="Move category down"><ArrowDown size={14}/></button></div>)}</div>}</div>
      </div>
    </section>
    <section className="rounded-2xl border border-line bg-panel p-4"><h2 className="mb-1 text-sm font-bold text-white">{txt('Top-of-page notification', 'رسالة أعلى الصفحة', 'הודעה בראש העמוד')}</h2><p className="mb-3 text-[11px] text-mute">{txt('Optional message displayed above categories in Build Your Setup. Fill the language fields you want to show.', 'رسالة اختيارية تظهر أعلى فئات صفحة التجميعة. عبّئ اللغات التي تريد عرضها.', 'הודעה אופציונלית שמופיעה מעל הקטגוריות בבונה הסטאפ. מלאו את השפות הרצויות.')}</p><div className="space-y-3"><TextArea label="Notification (English)" value={noticeEn} onChange={(e) => setNoticeEn(e.target.value)} placeholder="Build your setup your way…"/><TextArea label="الإشعار (العربية)" value={noticeAr} onChange={(e) => setNoticeAr(e.target.value)} dir="rtl" placeholder="كوّن إعدادك على طريقتك…"/><TextArea label="הודעה (עברית)" value={noticeHe} onChange={(e) => setNoticeHe(e.target.value)} dir="rtl" placeholder="בנו את הסטאפ בדרך שלכם…"/></div></section>
    <div className="flex justify-end"><Button onClick={save}><Check size={15}/>{txt('Save and publish settings', 'حفظ ونشر الإعدادات', 'שמירה ופרסום')}</Button></div>
  </div>;
}
