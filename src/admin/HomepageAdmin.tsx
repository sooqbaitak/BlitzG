// BLITZ GAMING — homepage content, configurable announcement slots and searchable featured products
import { useMemo, useState } from 'react';
import { Megaphone, Star, Save, Search, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Image as ImageIcon, Video, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle, TextArea, Input, Button } from '../components/ui';
import type { AnnouncementSlot, HomeHeroSlide } from '../lib/types';
import { imageFileToDataUrl } from '../lib/images';
import { cloudConfigured, uploadImageFile } from '../lib/cloud';

export function HomepageAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const [store, setStore] = useState(db.store);
  const [uploadingSlide, setUploadingSlide] = useState<string | null>(null);
  const heroSlides: HomeHeroSlide[] = store.homeHeroSlides ?? (store.homeHeroImageUrl ? [{ id: 'legacy-hero-slide', kind: 'image', url: store.homeHeroImageUrl, active: true }] : []);
  const [selected, setSelected] = useState<string[]>(db.products.filter((p) => p.tags.includes('featured')).map((p) => p.id));
  const [featuredSearch, setFeaturedSearch] = useState('');
  const slots = store.announcementItems ?? [];
  const filteredProducts = useMemo(() => {
    const q = featuredSearch.trim().toLowerCase();
    return db.products.filter((p) => !q || p.nameEn.toLowerCase().includes(q) || p.nameAr.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (db.brands.find((b) => b.id === p.brandId)?.name ?? '').toLowerCase().includes(q));
  }, [db.products, db.brands, featuredSearch]);

  const patchSlot = (id: string, patch: Partial<AnnouncementSlot>) => setStore((s) => ({ ...s, announcementItems: (s.announcementItems ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) }));
  const addSlot = () => setStore((s) => ({ ...s, announcementItems: [...(s.announcementItems ?? []), { id: `announcement-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, textEn: '', textAr: '', textHe: '', url: '', active: true }] }));
  const removeSlot = (id: string) => setStore((s) => ({ ...s, announcementItems: (s.announcementItems ?? []).filter((item) => item.id !== id) }));
  const moveSlot = (index: number, step: -1 | 1) => setStore((s) => {
    const items = [...(s.announcementItems ?? [])];
    const next = index + step;
    if (next < 0 || next >= items.length) return s;
    [items[index], items[next]] = [items[next], items[index]];
    return { ...s, announcementItems: items };
  });


  const patchHeroSlide = (id: string, patch: Partial<HomeHeroSlide>) => setStore((s) => ({ ...s, homeHeroSlides: (s.homeHeroSlides ?? (s.homeHeroImageUrl ? [{ id: 'legacy-hero-slide', kind: 'image' as const, url: s.homeHeroImageUrl, active: true }] : [])).map((slide) => slide.id === id ? { ...slide, ...patch } : slide) }));
  const addHeroSlide = (kind: 'image' | 'video' = 'image') => setStore((s) => ({ ...s, homeHeroSlides: [...(s.homeHeroSlides ?? (s.homeHeroImageUrl ? [{ id: 'legacy-hero-slide', kind: 'image' as const, url: s.homeHeroImageUrl, active: true }] : [])), { id: `hero-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, url: '', active: true }] }));
  const removeHeroSlide = (id: string) => setStore((s) => ({ ...s, homeHeroSlides: (s.homeHeroSlides ?? []).filter((slide) => slide.id !== id) }));
  const moveHeroSlide = (index: number, step: -1 | 1) => setStore((s) => { const slides = [...(s.homeHeroSlides ?? [])]; const next = index + step; if (next < 0 || next >= slides.length) return s; [slides[index], slides[next]] = [slides[next], slides[index]]; return { ...s, homeHeroSlides: slides }; });
  const uploadHeroImage = async (id: string, file: File) => {
    setUploadingSlide(id);
    try {
      const dataUrl = await imageFileToDataUrl(file, 1920);
      let url = dataUrl;
      if (cloudConfigured) { const blob = await (await fetch(dataUrl)).blob(); url = await uploadImageFile(new File([blob], `hero-${Date.now()}.webp`, { type: 'image/webp' })); }
      patchHeroSlide(id, { url, kind: 'image' });
    } catch (error) { toast('error', error instanceof Error ? error.message : 'Banner upload failed.'); }
    finally { setUploadingSlide(null); }
  };

  const saveAll = () => {
    setDb((d) => ({
      ...d,
      store: { ...store, homeHeroImageUrl: (store.homeHeroSlides ?? []).find((slide) => slide.active && slide.kind === 'image' && slide.url.trim())?.url ?? store.homeHeroImageUrl },
      products: d.products.map((p) => {
        const featured = selected.includes(p.id);
        const has = p.tags.includes('featured');
        if (featured === has) return p;
        return { ...p, tags: featured ? [...p.tags, 'featured'] : p.tags.filter((t) => t !== 'featured') };
      }),
    }));
    toast('success', txt('Homepage content saved.', 'تم حفظ محتوى الصفحة الرئيسية.', 'תוכן דף הבית נשמר.'));
  };
  const toggleFeatured = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 12 ? s : [...s, id]));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><SectionTitle sub={txt('Customize announcement slots, display style, and featured products.', 'تحكم في شرائح الإعلانات وتصميمها والمنتجات المميزة.', 'התאימו הודעות, עיצוב ומוצרים נבחרים.')}>{txt('Homepage / Content', 'الصفحة الرئيسية والمحتوى', 'דף הבית ותוכן')}</SectionTitle><Button onClick={saveAll}><Save size={16}/>{txt('Save changes', 'حفظ التغييرات', 'שמירת שינויים')}</Button></div>

      <section className="mb-4 rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase text-white/85"><ImageIcon size={16} className="text-electric"/>{txt('Main hero banners', 'البنرات الرئيسية', 'באנרים ראשיים')}</h2><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => addHeroSlide('image')}><Plus size={14}/>{txt('Add image', 'إضافة صورة', 'הוספת תמונה')}</Button><Button variant="outline" size="sm" onClick={() => addHeroSlide('video')}><Video size={14}/>{txt('Add video', 'إضافة فيديو', 'הוספת סרטון')}</Button></div></div>
        <p className="mb-3 text-[10px] leading-relaxed text-mute">{txt('Add multiple image banners or MP4/WebM video URLs. Active slides rotate behind your homepage headline. Upload images from your device or paste a URL; videos should use a direct public MP4/WebM URL.', 'أضف عدة بنرات صور أو روابط فيديو MP4/WebM مباشرة. تتبدل الشرائح النشطة خلف عنوان الصفحة الرئيسية. ارفع الصور من جهازك أو الصق رابطاً؛ الفيديو يحتاج رابطاً عاماً مباشراً.', 'הוסיפו באנרים מתמונות או קישורי וידאו MP4/WebM ישירים. השקופיות הפעילות מתחלפות מאחורי כותרת דף הבית. אפשר להעלות תמונות או להדביק כתובת URL; לסרטונים נדרש קישור ציבורי ישיר.')}</p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Input label={txt('Seconds per slide', 'ثوانٍ لكل شريحة', 'שניות לשקופית')} type="number" min={3} max={60} value={store.homeHeroIntervalSeconds ?? 6} onChange={(e) => setStore({ ...store, homeHeroIntervalSeconds: Math.min(60, Math.max(3, Number(e.target.value) || 6)) })}/>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-panel2 p-3 text-[10px] font-semibold text-white/80"><input type="checkbox" checked={store.homeHeroAutoplay !== false} onChange={(e) => setStore({ ...store, homeHeroAutoplay: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Auto-rotate slides', 'تبديل تلقائي', 'החלפה אוטומטית')}</label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-panel2 p-3 text-[10px] font-semibold text-white/80"><input type="checkbox" checked={store.homeHeroShowControls !== false} onChange={(e) => setStore({ ...store, homeHeroShowControls: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Show slider controls', 'إظهار أزرار الشرائح', 'הצגת בקרי שקופיות')}</label>
          <label className="text-[10px] font-bold text-mute">{txt('Transition', 'الحركة', 'מעבר')}<select value={store.homeHeroTransition ?? 'fade'} onChange={(e) => setStore({ ...store, homeHeroTransition: e.target.value as 'fade' | 'slide' })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-2 text-[10px] text-white"><option value="fade">Fade</option><option value="slide">Slide</option></select></label>
        </div>
        <div className="space-y-3">{heroSlides.map((slide, index) => <div key={slide.id} className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-bold text-electric">{txt('Slide', 'شريحة', 'שקופית')} {index + 1} · {slide.kind === 'video' ? 'Video' : 'Image'}</span><div className="flex items-center gap-1"><button type="button" onClick={() => moveHeroSlide(index, -1)} disabled={index === 0} className="rounded-lg border border-line p-1.5 text-mute disabled:opacity-30" aria-label="Move banner up"><ChevronLeft size={14}/></button><button type="button" onClick={() => moveHeroSlide(index, 1)} disabled={index === heroSlides.length - 1} className="rounded-lg border border-line p-1.5 text-mute disabled:opacity-30" aria-label="Move banner down"><ChevronRight size={14}/></button><button type="button" onClick={() => patchHeroSlide(slide.id, { active: !slide.active })} className={`rounded-lg border p-1.5 ${slide.active ? 'border-emerald-500/40 text-emerald-400' : 'border-line text-mute'}`} aria-label="Toggle banner">{slide.active ? <Eye size={14}/> : <EyeOff size={14}/>}</button><button type="button" onClick={() => removeHeroSlide(slide.id)} className="rounded-lg border border-red-500/30 p-1.5 text-red-400" aria-label="Remove banner"><Trash2 size={14}/></button></div></div>
          <div className="grid gap-2 sm:grid-cols-[140px_1fr]"><label className="text-[10px] font-bold text-mute">{txt('Media type', 'نوع الوسائط', 'סוג מדיה')}<select value={slide.kind} onChange={(e) => patchHeroSlide(slide.id, { kind: e.target.value as 'image' | 'video' })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-2 text-[10px] text-white"><option value="image">Image</option><option value="video">Video URL</option></select></label><Input label={slide.kind === 'video' ? 'Direct video URL (MP4/WebM)' : txt('Image URL', 'رابط الصورة', 'כתובת תמונה')} value={slide.url} onChange={(e) => patchHeroSlide(slide.id, { url: e.target.value })} placeholder={slide.kind === 'video' ? 'https://…/banner.mp4' : 'https://…/banner.webp'}/></div>
          {slide.kind === 'image' && <div className="mt-2 flex flex-wrap items-center gap-3"><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-electric/40 px-3 text-[10px] font-bold text-electric hover:bg-electric/10"><Upload size={14}/>{uploadingSlide === slide.id ? txt('Uploading…', 'جارٍ الرفع…', 'מעלה…') : txt('Upload image from device', 'رفع صورة من الجهاز', 'העלאת תמונה מהמכשיר')}<input type="file" accept="image/*" className="hidden" disabled={uploadingSlide === slide.id} onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value=''; if (file) void uploadHeroImage(slide.id, file); }}/></label>{slide.url && <img src={slide.url} alt="Banner preview" className="h-14 w-32 rounded-lg border border-line object-cover"/>}</div>}
          <div className="mt-2 grid gap-2 sm:grid-cols-3"><Input label="Alt text (EN)" value={slide.altEn ?? ''} onChange={(e) => patchHeroSlide(slide.id, { altEn: e.target.value })}/><Input label="النص البديل (AR)" value={slide.altAr ?? ''} onChange={(e) => patchHeroSlide(slide.id, { altAr: e.target.value })} dir="rtl"/><Input label="טקסט חלופי (HE)" value={slide.altHe ?? ''} onChange={(e) => patchHeroSlide(slide.id, { altHe: e.target.value })} dir="rtl"/></div>
        </div>)}
        {heroSlides.length === 0 && <p className="rounded-xl border border-dashed border-line py-5 text-center text-[10px] text-mute">{txt('No custom slides yet. The current hero banner will be used until you add slides.', 'لا توجد شرائح مخصصة؛ ستُستخدم صورة البنر الحالية حتى تضيف شرائح.', 'אין שקופיות מותאמות. הבאנר הנוכחי יוצג עד להוספת שקופיות.')}</p>}</div>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase text-white/85"><Megaphone size={16} className="text-electric"/>{txt('Announcement bar', 'شريط الإعلانات', 'סרגל הודעות')}</h2><Button variant="outline" size="sm" onClick={addSlot}><Plus size={14}/>{txt('Add announcement', 'إضافة إعلان', 'הוספת הודעה')}</Button></div>
        <p className="mb-3 text-[10px] leading-relaxed text-mute">{txt('Add multiple messages, translate each one, set optional links, enable/disable them and arrange the order.', 'أضف عدة رسائل وترجم كل رسالة وحدد رابطاً اختيارياً وفعّلها أو أوقفها ورتّب ظهورها.', 'הוסיפו הודעות, תרגומים וקישורים, הפעילו או כבו וסדרו את סדר ההצגה.')}</p>
        <div className="space-y-3">
          {slots.map((item, index) => <div key={item.id} className="rounded-xl border border-line bg-panel2 p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-electric">{txt('Announcement', 'إعلان', 'הודעה')} {index + 1}</span><div className="flex items-center gap-1"><button type="button" onClick={() => moveSlot(index, -1)} disabled={index === 0} className="rounded-lg border border-line p-1.5 text-mute hover:text-white disabled:opacity-30" aria-label="Move announcement up"><ArrowUp size={14}/></button><button type="button" onClick={() => moveSlot(index, 1)} disabled={index === slots.length - 1} className="rounded-lg border border-line p-1.5 text-mute hover:text-white disabled:opacity-30" aria-label="Move announcement down"><ArrowDown size={14}/></button><button type="button" onClick={() => patchSlot(item.id, { active: !item.active })} className={`rounded-lg border p-1.5 ${item.active ? 'border-emerald-500/40 text-emerald-400' : 'border-line text-mute'}`} aria-label="Toggle announcement">{item.active ? <Eye size={14}/> : <EyeOff size={14}/>}</button><button type="button" onClick={() => removeSlot(item.id)} className="rounded-lg border border-red-500/30 p-1.5 text-red-400" aria-label="Remove announcement"><Trash2 size={14}/></button></div></div>
            <div className="grid gap-2 md:grid-cols-3"><Input label="Text (EN)" value={item.textEn} onChange={(e) => patchSlot(item.id, { textEn: e.target.value })} /><Input label="النص (AR)" value={item.textAr} onChange={(e) => patchSlot(item.id, { textAr: e.target.value })} dir="rtl"/><Input label="טקסט (HE)" value={item.textHe ?? ''} onChange={(e) => patchSlot(item.id, { textHe: e.target.value })} dir="rtl"/></div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"><Input label={txt('Optional link', 'رابط اختياري', 'קישור אופציונלי')} value={item.url ?? ''} onChange={(e) => patchSlot(item.id, { url: e.target.value })} placeholder="https://…"/><label className="flex items-center gap-2 self-end pb-2 text-[10px] text-mute"><input type="checkbox" checked={item.active} onChange={(e) => patchSlot(item.id, { active: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Active', 'نشط', 'פעיל')}</label></div>
          </div>)}
          {slots.length === 0 && <p className="rounded-xl border border-dashed border-line py-6 text-center text-[11px] text-mute">{txt('No announcements. Add one to show a bar on the storefront.', 'لا توجد إعلانات. أضف إعلاناً ليظهر الشريط في المتجر.', 'אין הודעות. הוסיפו הודעה כדי להציג את הסרגל בחנות.')}</p>}
        </div>
        <div className="mt-4 border-t border-line pt-4"><h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/80">{txt('Bar appearance and motion', 'تصميم الشريط وحركته', 'עיצוב ותנועה')}</h3><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <label className="text-[10px] font-bold text-mute">{txt('Background color', 'لون الخلفية', 'צבע רקע')}<div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-line bg-panel p-2"><input type="color" value={store.announcementBgColor || '#07131f'} onChange={(e) => setStore({ ...store, announcementBgColor: e.target.value })} className="h-6 w-8 cursor-pointer bg-transparent"/><span className="text-[10px] text-white/80">{store.announcementBgColor || '#07131f'}</span></div></label>
          <label className="text-[10px] font-bold text-mute">{txt('Text color', 'لون الخط', 'צבע טקסט')}<div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-line bg-panel p-2"><input type="color" value={store.announcementTextColor || '#49c6ff'} onChange={(e) => setStore({ ...store, announcementTextColor: e.target.value })} className="h-6 w-8 cursor-pointer bg-transparent"/><span className="text-[10px] text-white/80">{store.announcementTextColor || '#49c6ff'}</span></div></label>
          <Input label={txt('Font size (px)', 'حجم الخط (بكسل)', 'גודל גופן (פיקסלים)')} type="number" min={8} max={28} value={store.announcementFontSize ?? 12} onChange={(e) => setStore({ ...store, announcementFontSize: Math.min(28, Math.max(8, Number(e.target.value) || 12)) })}/>
          <Input label={txt('Loop duration (seconds)', 'مدة الدورة (ثوانٍ)', 'משך מחזור (שניות)')} type="number" min={8} max={90} value={store.announcementSpeedSeconds ?? 32} onChange={(e) => setStore({ ...store, announcementSpeedSeconds: Math.min(90, Math.max(8, Number(e.target.value) || 32)) })}/>
          <label className="text-[10px] font-bold text-mute">{txt('Font weight', 'سماكة الخط', 'עובי גופן')}<select value={store.announcementFontWeight ?? 'bold'} onChange={(e) => setStore({ ...store, announcementFontWeight: e.target.value as 'normal' | 'medium' | 'bold' })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-2 text-[10px] text-white outline-none"><option value="normal">{txt('Normal', 'عادي', 'רגיל')}</option><option value="medium">{txt('Medium', 'متوسط', 'בינוני')}</option><option value="bold">{txt('Bold', 'عريض', 'מודגש')}</option></select></label>
          <label className="text-[10px] font-bold text-mute">{txt('Border color', 'لون الحد', 'צבע מסגרת')}<div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-line bg-panel p-2"><input type="color" value={store.announcementBorderColor || '#12334a'} onChange={(e) => setStore({ ...store, announcementBorderColor: e.target.value })} className="h-6 w-8 cursor-pointer bg-transparent"/><span className="text-[10px] text-white/80">{store.announcementBorderColor || '#12334a'}</span></div></label>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-panel2 p-3 text-[10px] font-bold text-white/80"><input type="checkbox" checked={store.announcementPauseOnHover ?? true} onChange={(e) => setStore({ ...store, announcementPauseOnHover: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Pause when hovered', 'إيقاف الحركة عند تمرير المؤشر', 'השהיה במעבר עכבר')}</label>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-panel2 p-3 text-[10px] font-bold text-white/80"><input type="checkbox" checked={store.announcementShowIcon ?? true} onChange={(e) => setStore({ ...store, announcementShowIcon: e.target.checked })} className="accent-[#00a8ff]"/>{txt('Show icon', 'إظهار الأيقونة', 'הצגת סמל')}</label>
        </div><p className="mt-2 text-[10px] text-mute">{txt('Lower seconds = faster scrolling. Choose contrasting colors for readability.', 'عدد ثوانٍ أقل يعني حركة أسرع. اختر ألواناً متباينة لسهولة القراءة.', 'פחות שניות = גלילה מהירה יותר. בחרו צבעים בעלי ניגודיות טובה.')}</p></div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase text-white/85"><Star size={16} className="text-amber-400"/>{txt('Featured products', 'المنتجات المميزة', 'מוצרים נבחרים')} <span className="text-mute">({selected.length}/12)</span></h2>
        <p className="mb-3 text-[10px] font-semibold text-mute">{txt('Search by product name, brand or SKU, then select up to 12 products.', 'ابحث باسم المنتج أو الماركة أو SKU، ثم اختر حتى 12 منتجاً.', 'חפשו לפי שם מוצר, מותג או מק״ט ובחרו עד 12 מוצרים.')}</p>
        <div className="relative mb-3"><Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute"/><input value={featuredSearch} onChange={(e) => setFeaturedSearch(e.target.value)} placeholder={txt('Search products…', 'ابحث عن المنتجات…', 'חיפוש מוצרים…')} className="h-10 w-full rounded-xl border border-line bg-panel2 ps-9 pe-3 text-[11px] text-white outline-none focus:border-electric"/></div>
        <div className="grid max-h-96 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => <button key={p.id} onClick={() => toggleFeatured(p.id)} className={`flex items-center gap-2 rounded-xl border p-2 text-start transition-colors ${selected.includes(p.id) ? 'border-amber-400/60 bg-amber-400/10' : 'border-line bg-panel2 hover:border-electric/40'}`}><img src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover"/><span className="min-w-0 flex-1"><span className="block line-clamp-2 text-[10px] font-semibold leading-tight text-white/80">{ar ? p.nameAr : p.nameEn}</span><span className="text-[9px] font-bold text-electric">{p.sku} · ₪{p.salePrice ?? p.price}</span></span><span className={`rounded-md border px-2 py-1 text-[9px] font-bold ${selected.includes(p.id) ? 'border-amber-400/50 text-amber-300' : 'border-line text-mute'}`}>{selected.includes(p.id) ? txt('Selected', 'محدد', 'נבחר') : txt('Select', 'اختيار', 'בחירה')}</span></button>)}
        </div>
      </section>
      <div className="mt-5 flex justify-end"><Button size="lg" onClick={saveAll}><Save size={17}/>{txt('Save & publish', 'حفظ ونشر', 'שמירה ופרסום')}</Button></div>
    </div>
  );
}
