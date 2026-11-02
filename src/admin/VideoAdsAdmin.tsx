import { useEffect, useMemo, useState } from 'react';
import { Film, Plus, Trash2, Upload, Search, Eye, EyeOff, Link2, Package, Tags, FolderTree, Save } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { Button, Input, SectionTitle, TextArea } from '../components/ui';
import { cloudConfigured, uploadStoreVideo, deleteStoreVideoObject } from '../lib/cloud';
import { productName, categoryName } from '../lib/productPresentation';
import type { VideoAd } from '../lib/types';

const makeVideoAd = (): VideoAd => ({
  id: `video-ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  titleEn: 'New product video', titleAr: 'فيديو منتج جديد', titleHe: 'סרטון מוצר חדש',
  descriptionEn: '', descriptionAr: '', descriptionHe: '', videoUrl: '', posterUrl: '',
  active: false, featured: false, productIds: [], categoryIds: [], brandIds: [], sortOrder: Date.now(), createdAt: new Date().toISOString(),
});

export function VideoAdsAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar'; const he = lang === 'he';
  const txt = (en: string, arText: string, heText = en) => ar ? arText : he ? heText : en;
  const videos = db.store.videoAds ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const selected = videos.find((video) => video.id === selectedId) ?? null;

  useEffect(() => {
    if (!videos.some((video) => video.id === selectedId)) setSelectedId(videos[0]?.id ?? '');
  }, [videos, selectedId]);

  const products = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return db.products.filter((product) => product.status !== 'archived').filter((product) => !q || [product.nameEn, product.nameAr, product.sku, db.brands.find((brand) => brand.id === product.brandId)?.name ?? ''].some((value) => value.toLowerCase().includes(q))).slice(0, 120);
  }, [db.products, db.brands, productSearch]);
  const categories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return db.categories.filter((category) => !q || [category.nameEn, category.nameAr, category.nameHe ?? '', category.slug].some((value) => value.toLowerCase().includes(q))).slice(0, 100);
  }, [db.categories, categorySearch]);
  const brands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    return db.brands.filter((brand) => !q || brand.name.toLowerCase().includes(q)).slice(0, 100);
  }, [db.brands, brandSearch]);

  const patch = (id: string, changes: Partial<VideoAd>) => setDb((old) => ({
    ...old,
    store: { ...old.store, videoAds: (old.store.videoAds ?? []).map((video) => video.id === id ? { ...video, ...changes } : video) },
  }));
  const addVideo = () => {
    const video = makeVideoAd();
    setDb((old) => ({ ...old, store: { ...old.store, videoAds: [...(old.store.videoAds ?? []), video] } }));
    setSelectedId(video.id);
  };
  const deleteVideo = (video: VideoAd) => {
    if (!window.confirm(txt(`Delete “${video.titleEn}”?`, `حذف «${video.titleAr}»؟`, `למחוק את “${video.titleEn}”?`))) return;
    setDb((old) => ({ ...old, store: { ...old.store, videoAds: (old.store.videoAds ?? []).filter((item) => item.id !== video.id) } }));
    if (video.videoUrl) void deleteStoreVideoObject(video.videoUrl).catch((error) => {
      console.warn('The video entry was deleted, but its storage object could not be removed:', error);
      toast('info', txt('Video entry deleted. Its stored file may need manual cleanup.', 'تم حذف الفيديو من القائمة، وقد يحتاج الملف المخزن إلى حذف يدوي.', 'רשומת הסרטון נמחקה. ייתכן שיהיה צורך למחוק את הקובץ ידנית.'));
    });
    setSelectedId('');
  };
  const toggleLinked = (field: 'productIds' | 'categoryIds' | 'brandIds', id: string) => {
    if (!selected) return;
    const current = selected[field] ?? [];
    patch(selected.id, { [field]: current.includes(id) ? current.filter((value) => value !== id) : [...current, id] } as Partial<VideoAd>);
  };
  const uploadVideo = async (file?: File) => {
    if (!file || !selected) return;
    setUploading(true);
    try {
      const url = await uploadStoreVideo(file);
      const previousUrl = selected.videoUrl;
      patch(selected.id, { videoUrl: url });
      if (previousUrl && previousUrl !== url) void deleteStoreVideoObject(previousUrl).catch((error) => console.warn('Old video object could not be removed:', error));
      toast('success', txt('Video uploaded and saved.', 'تم رفع الفيديو وحفظه.', 'הסרטון הועלה ונשמר.'));
    } catch (error) {
      toast('error', error instanceof Error ? error.message : txt('Video upload failed.', 'فشل رفع الفيديو.', 'העלאת הסרטון נכשלה.'));
    } finally { setUploading(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <SectionTitle sub={txt('Upload product advertising videos and connect each one to products, categories, and brands.', 'ارفع فيديوهات إعلانية للمنتجات واربط كل فيديو بالمنتجات والفئات والماركات.', 'העלו סרטוני פרסום למוצרים וקשרו כל סרטון למוצרים, קטגוריות ומותגים.')}>{txt('Product video showcase', 'معرض فيديوهات المنتجات', 'סרטוני מוצרים')}</SectionTitle>
      <Button onClick={addVideo}><Plus size={16}/>{txt('Add video', 'إضافة فيديو', 'הוספת סרטון')}</Button>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4">
      <div className="min-w-0">
        <p className="font-bold text-white">{txt('Show the video page to customers', 'إظهار صفحة الفيديوهات للعملاء', 'הצגת עמוד הסרטונים ללקוחות')}</p>
        <p className="mt-1 text-[11px] text-mute">{txt('When disabled, the page and its navigation link are hidden from visitors. Videos remain saved in the admin dashboard.', 'عند التعطيل تختفي الصفحة ورابطها من الزوار، وتبقى الفيديوهات محفوظة في لوحة التحكم.', 'כאשר מושבת, העמוד והקישור מוסתרים מהמבקרים. הסרטונים נשארים שמורים בלוח הניהול.')}</p>
      </div>
      <button type="button" onClick={() => setDb((old) => ({ ...old, store: { ...old.store, videoAdsPageEnabled: old.store.videoAdsPageEnabled !== true } }))} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[11px] font-bold ${db.store.videoAdsPageEnabled ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-panel2 text-mute ring-1 ring-line'}`}>
        {db.store.videoAdsPageEnabled ? <Eye size={15}/> : <EyeOff size={15}/>} {db.store.videoAdsPageEnabled ? txt('Visible', 'ظاهرة', 'מוצג') : txt('Hidden', 'مخفية', 'מוסתר')}
      </button>
    </div>

    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-line bg-panel p-3">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-white">{txt('Video library', 'مكتبة الفيديوهات', 'ספריית סרטונים')}</h2><span className="text-[10px] text-mute">{videos.length}</span></div>
        <div className="space-y-2">
          {videos.map((video) => <button key={video.id} type="button" onClick={() => setSelectedId(video.id)} className={`w-full rounded-xl border p-3 text-start transition-colors ${selectedId === video.id ? 'border-electric bg-electric/10' : 'border-line bg-panel2 hover:border-electric/40'}`}>
            <span className="flex items-center justify-between gap-2"><span className="line-clamp-2 text-[11px] font-bold text-white">{he ? (video.titleHe || video.titleEn) : ar ? video.titleAr : video.titleEn}</span>{video.active ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"/> : <span className="h-2 w-2 shrink-0 rounded-full bg-mute"/>}</span>
            <span className="mt-1 block text-[9px] text-mute">{(video.productIds?.length ?? 0)} {txt('products', 'منتجات', 'מוצרים')} · {(video.categoryIds?.length ?? 0)} {txt('categories', 'فئات', 'קטגוריות')}</span>
          </button>)}
          {!videos.length && <p className="px-3 py-8 text-center text-[11px] text-mute">{txt('No videos yet. Add your first product video.', 'لا توجد فيديوهات بعد. أضف أول فيديو.', 'אין סרטונים עדיין. הוסיפו סרטון ראשון.')}</p>}
        </div>
      </aside>

      {selected ? <section className="min-w-0 space-y-4 rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold text-white">{txt('Edit video', 'تعديل الفيديو', 'עריכת סרטון')}</h2><div className="flex gap-2"><Button variant="danger" size="sm" onClick={() => deleteVideo(selected)}><Trash2 size={14}/>{txt('Delete', 'حذف', 'מחיקה')}</Button></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={txt('Title (English)', 'العنوان (إنجليزي)', 'כותרת (אנגלית)')} value={selected.titleEn} onChange={(e) => patch(selected.id, { titleEn: e.target.value })}/>
          <Input label={txt('Title (Arabic)', 'العنوان (عربي)', 'כותרת (ערבית)')} value={selected.titleAr} onChange={(e) => patch(selected.id, { titleAr: e.target.value })}/>
          <Input label={txt('Title (Hebrew)', 'العنوان (عبري)', 'כותרת (עברית)')} value={selected.titleHe ?? ''} onChange={(e) => patch(selected.id, { titleHe: e.target.value })}/>
          <Input label={txt('Video poster / thumbnail URL (optional)', 'رابط صورة الغلاف (اختياري)', 'כתובת תמונת שער (אופציונלי)')} value={selected.posterUrl ?? ''} onChange={(e) => patch(selected.id, { posterUrl: e.target.value })} placeholder="https://…"/>
          <div className="sm:col-span-2"><TextArea label={txt('Description (English)', 'الوصف (إنجليزي)', 'תיאור (אנגלית)')} value={selected.descriptionEn ?? ''} onChange={(e) => patch(selected.id, { descriptionEn: e.target.value })}/></div>
          <div className="sm:col-span-2"><TextArea label={txt('Description (Arabic)', 'الوصف (عربي)', 'תיאור (ערבית)')} value={selected.descriptionAr ?? ''} onChange={(e) => patch(selected.id, { descriptionAr: e.target.value })}/></div>
          <div className="sm:col-span-2"><TextArea label={txt('Description (Hebrew)', 'الوصف (عبري)', 'תיאור (עברית)')} value={selected.descriptionHe ?? ''} onChange={(e) => patch(selected.id, { descriptionHe: e.target.value })}/></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input label={txt('Direct video URL (MP4 / WebM / MOV)', 'رابط مباشر للفيديو (MP4 / WebM / MOV)', 'קישור ישיר לווידאו (MP4 / WebM / MOV)')} value={selected.videoUrl} onChange={(e) => patch(selected.id, { videoUrl: e.target.value })} placeholder="https://…/video.mp4"/>
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 self-end rounded-xl border border-electric/40 px-4 text-[11px] font-bold text-electric hover:bg-electric/10"><Upload size={15}/>{uploading ? txt('Uploading…', 'جارٍ الرفع…', 'מעלה…') : txt('Upload video', 'رفع فيديو', 'העלאת סרטון')}<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" disabled={uploading || !cloudConfigured} onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; void uploadVideo(file); }}/></label>
        </div>
        <p className="text-[10px] text-mute">{cloudConfigured ? txt('Maximum file size: 100 MB. Uploads are stored in the public Supabase store-videos bucket. Use compressed MP4/WebM for faster mobile loading.', 'الحد الأقصى 100 ميغابايت. تُحفظ الملفات في مخزن Supabase العام. يُفضّل ضغط الفيديو بصيغة MP4/WebM لتحميل أسرع على الهاتف.', 'גודל מרבי: 100MB. הקבצים נשמרים ב-bucket ציבורי של Supabase. מומלץ לדחוס ל-MP4/WebM לטעינה מהירה בנייד.') : txt('Cloud storage is not configured. You can paste a public direct video URL; device uploads become available after Supabase is configured.', 'التخزين السحابي غير مُعد. يمكنك وضع رابط مباشر عام للفيديو؛ يصبح الرفع من الجهاز متاحاً بعد إعداد Supabase.', 'אחסון הענן אינו מוגדר. אפשר להדביק קישור ציבורי ישיר; העלאה מהמכשיר תהיה זמינה לאחר הגדרת Supabase.')}</p>
        {selected.videoUrl && <video src={selected.videoUrl} poster={selected.posterUrl || undefined} controls playsInline preload="metadata" className="max-h-[420px] w-full rounded-xl border border-line bg-black" />}
        <div className="flex flex-wrap gap-3 rounded-xl border border-line bg-panel2 p-3">
          <label className="flex items-center gap-2 text-[11px] font-semibold text-white/80"><input type="checkbox" checked={selected.active} onChange={(e) => patch(selected.id, { active: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Publish this video', 'نشر هذا الفيديو', 'פרסום הסרטון')}</label>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-white/80"><input type="checkbox" checked={selected.featured === true} onChange={(e) => patch(selected.id, { featured: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Feature this video', 'تمييز هذا الفيديو', 'הצגת הסרטון כמומלץ')}</label>
          <label className="flex min-w-0 items-center gap-2 text-[11px] text-mute">{txt('Display order', 'ترتيب العرض', 'סדר תצוגה')}<input type="number" value={selected.sortOrder} onChange={(e) => patch(selected.id, { sortOrder: Number(e.target.value) || 0 })} className="h-8 w-24 rounded-lg border border-line bg-panel px-2 text-white"/></label>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-xl border border-line bg-panel2 p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-white"><Package size={14} className="text-electric"/>{txt('Link products', 'ربط المنتجات', 'קישור מוצרים')} <span className="ms-auto text-mute">{selected.productIds.length}</span></div>
            <div className="relative"><Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute"/><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder={txt('Search product / SKU / brand…', 'ابحث عن منتج / SKU / ماركة…', 'חיפוש מוצר / מק״ט / מותג…')} className="h-9 w-full rounded-lg border border-line bg-panel ps-8 pe-2 text-[10px] text-white"/></div>
            <div className="max-h-64 space-y-1 overflow-y-auto">{products.map((product) => <label key={product.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-[10px] text-white/80 hover:bg-panel"><input type="checkbox" checked={selected.productIds.includes(product.id)} onChange={() => toggleLinked('productIds', product.id)} className="mt-0.5 accent-[#00a8ff]"/><span className="min-w-0"><span className="block line-clamp-2">{productName(product, lang)}</span><span className="text-[9px] text-mute">{product.sku}</span></span></label>)}</div>
          </div>
          <div className="space-y-2 rounded-xl border border-line bg-panel2 p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-white"><FolderTree size={14} className="text-electric"/>{txt('Link categories', 'ربط الفئات', 'קישור קטגוריות')} <span className="ms-auto text-mute">{selected.categoryIds.length}</span></div>
            <div className="relative"><Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute"/><input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder={txt('Search categories…', 'ابحث عن فئة…', 'חיפוש קטגוריות…')} className="h-9 w-full rounded-lg border border-line bg-panel ps-8 pe-2 text-[10px] text-white"/></div>
            <div className="max-h-64 space-y-1 overflow-y-auto">{categories.map((category) => <label key={category.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-[10px] text-white/80 hover:bg-panel"><input type="checkbox" checked={selected.categoryIds.includes(category.id)} onChange={() => toggleLinked('categoryIds', category.id)} className="mt-0.5 accent-[#00a8ff]"/><span>{categoryName(category, lang)}</span></label>)}</div>
          </div>
          <div className="space-y-2 rounded-xl border border-line bg-panel2 p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-white"><Tags size={14} className="text-electric"/>{txt('Link brands', 'ربط الماركات', 'קישור מותגים')} <span className="ms-auto text-mute">{selected.brandIds.length}</span></div>
            <div className="relative"><Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute"/><input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder={txt('Search brands…', 'ابحث عن ماركة…', 'חיפוש מותגים…')} className="h-9 w-full rounded-lg border border-line bg-panel ps-8 pe-2 text-[10px] text-white"/></div>
            <div className="max-h-64 space-y-1 overflow-y-auto">{brands.map((brand) => <label key={brand.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-white/80 hover:bg-panel"><input type="checkbox" checked={selected.brandIds.includes(brand.id)} onChange={() => toggleLinked('brandIds', brand.id)} className="accent-[#00a8ff]"/>{brand.name}</label>)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10px] text-mute"><span><Link2 size={13} className="me-1 inline"/>{txt('Changes save automatically to store settings and sync to Supabase when connected.', 'تُحفظ التعديلات تلقائياً ضمن إعدادات المتجر وتتزامن مع Supabase عند الاتصال.', 'השינויים נשמרים אוטומטית ומסתנכרנים עם Supabase כאשר הוא מחובר.')}</span><span className="inline-flex items-center gap-1 text-emerald-400"><Save size={13}/>{txt('Auto-saved', 'حُفظ تلقائياً', 'נשמר אוטומטית')}</span></div>
      </section> : <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel p-6 text-center"><Film size={34} className="text-electric"/><p className="mt-3 text-sm font-bold text-white">{txt('Create a product video', 'أنشئ فيديو منتج', 'צרו סרטון מוצר')}</p><p className="mt-1 max-w-sm text-[11px] text-mute">{txt('Upload a short product ad, then link it to the products, categories, and brands it features.', 'ارفع إعلاناً قصيراً لمنتج، ثم اربطه بالمنتجات والفئات والماركات التي يعرضها.', 'העלו פרסומת קצרה וקשרו אותה למוצרים, קטגוריות ומותגים שמופיעים בה.')}</p><Button className="mt-4" onClick={addVideo}><Plus size={15}/>{txt('Add first video', 'إضافة أول فيديو', 'הוספת סרטון ראשון')}</Button></section>}
    </div>
  </div>;
}
