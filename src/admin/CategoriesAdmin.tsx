// BLITZ GAMING — admin: categories (reorder, nest, hide, feature)
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, Plus, Eye, EyeOff, Pencil, Trash2, Star, FolderTree, GripVertical, Upload } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Button, Input, Modal, SectionTitle } from '../components/ui';
import type { Category } from '../lib/types';
import { categoryDescendantIds, categoryTreeIds } from '../lib/categories';
import { imageFileToDataUrl } from '../lib/images';
import { cloudConfigured, uploadImageFile } from '../lib/cloud';

export function CategoriesAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const [editing, setEditing] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);

  const roots = useMemo(() => db.categories.filter((c) => !c.parentId).sort((a, b) => a.order - b.order), [db.categories]);
  const childrenOf = (id: string) => db.categories.filter((c) => c.parentId === id).sort((a, b) => a.order - b.order);

  const move = (cat: Category, dir: -1 | 1) => {
    setDb((d) => {
      const siblings = d.categories.filter((c) => c.parentId === cat.parentId).sort((a, b) => a.order - b.order);
      const i = siblings.findIndex((c) => c.id === cat.id);
      const j = i + dir;
      if (j < 0 || j >= siblings.length) return d;
      const oi = siblings[i].order, oj = siblings[j].order;
      // swap orders robustly even if duplicated
      const next = d.categories.map((c) => {
        if (c.id === siblings[i].id) return { ...c, order: oj };
        if (c.id === siblings[j].id) return { ...c, order: oi };
        return c;
      });
      return { ...d, categories: normalize(next) };
    });
  };

  const normalize = (cats: Category[]): Category[] => {
    const out = [...cats];
    const parents = [...new Set(out.map((c) => c.parentId))];
    for (const pid of parents) {
      out.filter((c) => c.parentId === pid).sort((a, b) => a.order - b.order).forEach((c, i) => { const idx = out.findIndex((x) => x.id === c.id); out[idx] = { ...out[idx], order: i + 1 }; });
    }
    return out;
  };

  const toggle = (id: string, key: 'visible' | 'featured') => {
    setDb((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, [key]: !c[key] } : c)) }));
  };

  const remove = (id: string) => {
    const removeIds = new Set(categoryTreeIds(db.categories, id));
    setDb((d) => ({
      ...d,
      categories: d.categories.filter((c) => !removeIds.has(c.id)),
      products: d.products.map((p) => (removeIds.has(p.categoryId) ? { ...p, categoryId: '' } : p)),
    }));
    toast('success', ar ? 'حُذفت الفئة' : 'Category deleted');
  };

  const save = (c: Category) => {
    if (!c.nameEn.trim() || !c.nameAr.trim()) { toast('error', ar ? 'الاسم مطلوب باللغتين' : 'Both names are required'); return; }
    if (c.parentId && (c.parentId === c.id || categoryDescendantIds(db.categories, c.id).includes(c.parentId))) { toast('error', ar ? 'لا يمكن وضع الفئة داخل نفسها أو داخل فئة فرعية منها' : 'A category cannot be nested inside itself or one of its descendants'); return; }
    const slug = (c.slug.trim() || c.nameEn).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) { toast('error', ar ? 'الرابط المختصر مطلوب' : 'A valid URL slug is required'); return; }
    if (db.categories.some((x) => x.id !== c.id && x.slug.toLowerCase() === slug.toLowerCase())) { toast('error', ar ? 'الرابط المختصر مستخدم بالفعل' : 'This category URL slug is already in use'); return; }
    setDb((d) => {
      if (isNew) {
        const siblings = d.categories.filter((x) => x.parentId === c.parentId);
        const withOrder = { ...c, slug, order: siblings.length + 1 };
        return { ...d, categories: [...d.categories, withOrder] };
      }
      return { ...d, categories: d.categories.map((x) => (x.id === c.id ? { ...c, slug } : x)) };
    });
    toast('success', isNew ? (ar ? 'أُضيفت الفئة' : 'Category added') : (ar ? 'حُفظت الفئة' : 'Category saved'));
    setEditing(null);
  };

  const uploadCategoryBanner = async (file: File) => {
    if (!editing) return;
    setUploadingCategoryImage(true);
    try {
      const dataUrl = await imageFileToDataUrl(file, 1600);
      if (cloudConfigured) {
        const blob = await (await fetch(dataUrl)).blob();
        const url = await uploadImageFile(new File([blob], `category-${Date.now()}.webp`, { type: 'image/webp' }));
        setEditing((current) => current ? { ...current, image: url } : current);
      } else setEditing((current) => current ? { ...current, image: dataUrl } : current);
    } catch (error) { toast('error', error instanceof Error ? error.message : 'Category image upload failed.'); }
    finally { setUploadingCategoryImage(false); }
  };

  const openNew = () => {
    setEditing({ id: `c-${Date.now()}`, slug: '', nameEn: '', nameAr: '', nameHe: '', image: '/img/keyboard.jpg', parentId: null, order: roots.length + 1, visible: true, featured: true, imageFit: 'cover' });
    setIsNew(true);
  };

  const row = (c: Category, depth = 0) => {
    const productCount = db.products.filter((p) => p.categoryId === c.id).length;
    return (
      <div key={c.id} style={{ marginInlineStart: depth ? `${Math.min(depth * 24, 96)}px` : undefined }} className={`flex items-center gap-2 rounded-xl border border-line bg-panel p-2.5 ${depth ? 'border-s-2 border-s-electric/40' : ''} hover:border-electric/40`}>
        <GripVertical size={16} className="shrink-0 text-mute" />
        {c.image && <img src={c.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-white/90">{ar ? c.nameAr : he ? (c.nameHe || c.nameEn) : c.nameEn} <span className="text-[9px] font-semibold text-mute">/ {c.slug}</span></p>
          <p className="text-[9.5px] font-semibold text-mute">{productCount} {ar ? 'منتج' : 'products'} · {ar ? 'الترتيب' : 'order'} {c.order}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => move(c, -1)} className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-white" aria-label="Move up"><ChevronUp size={16} /></button>
          <button onClick={() => move(c, 1)} className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-white" aria-label="Move down"><ChevronDown size={16} /></button>
          <button onClick={() => toggle(c.id, 'featured')} className={`rounded-lg p-1.5 hover:bg-panel2 ${c.featured ? 'text-amber-400' : 'text-mute hover:text-amber-400'}`} title={ar ? 'مميزة في الرئيسية' : 'Feature on homepage'} aria-label="Feature"><Star size={16} fill={c.featured ? 'currentColor' : 'none'} /></button>
          <button onClick={() => toggle(c.id, 'visible')} className={`rounded-lg p-1.5 hover:bg-panel2 ${c.visible ? 'text-electric' : 'text-mute'}`} title={ar ? 'إظهار/إخفاء' : 'Show/Hide'} aria-label="Toggle visibility">{c.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
          <button onClick={() => { setEditing({ ...c }); setIsNew(false); }} className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-electric" aria-label="Edit"><Pencil size={16} /></button>
          <button onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-mute hover:bg-red-500/10 hover:text-red-400" aria-label="Delete"><Trash2 size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub={ar ? 'رتّب بالسحب، اجعلها فرعية أو أخفِها عن القائمة' : 'Reorder with arrows, nest subcategories or hide from menu'}>{ar ? 'الفئات' : 'Categories'}</SectionTitle>
        <Button onClick={openNew}><Plus size={17} strokeWidth={2.6} />{ar ? 'فئة جديدة' : 'Add Category'}</Button>
      </div>
      <div className="space-y-2">
        {roots.map((c) => {
          const renderBranch = (cat: Category, depth = 0): ReactNode => <div key={cat.id} className="space-y-2">{row(cat, depth)}{childrenOf(cat.id).map((child) => renderBranch(child, depth + 1))}</div>;
          return renderBranch(c);
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-mute"><FolderTree size={13} />{ar ? 'الفئات الفرعية تظهر متداخلة تحت الأب وتُرفع تلقائياً في صفحة الفئة.' : 'Subcategories nest under their parent and appear on the category landing page.'}</p>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={isNew ? (ar ? 'فئة جديدة' : 'New Category') : (ar ? 'تعديل الفئة' : 'Edit Category')}>
        {editing && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={ar ? 'الاسم (EN)' : 'Name (EN)'} value={editing.nameEn} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
              <Input label={ar ? 'الاسم (AR)' : 'Name (AR)'} value={editing.nameAr} onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })} dir="rtl" />
              <Input label="Name (HE)" value={editing.nameHe ?? ''} onChange={(e) => setEditing({ ...editing, nameHe: e.target.value })} dir="rtl" />
            </div>
            <Input label="Slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="keyboards" />
            <Input label={ar ? 'رابط صورة الفئة / البنر' : 'Category banner image URL'} value={editing.image ?? ''} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
            <div className="flex flex-wrap items-center gap-3">{editing.image && <img src={editing.image} alt="Category banner preview" className="h-14 w-28 rounded-lg border border-line" style={{ objectFit: editing.imageFit ?? 'cover' }} />}<label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-electric/40 px-3 text-[10px] font-bold text-electric hover:bg-electric/10"><Upload size={14}/>{uploadingCategoryImage ? (ar ? 'جارٍ الرفع…' : 'Uploading…') : (ar ? 'رفع صورة من الجهاز' : 'Upload from device')}<input type="file" accept="image/*" className="hidden" disabled={uploadingCategoryImage} onChange={(e) => { const file=e.target.files?.[0]; e.currentTarget.value=''; if(file) void uploadCategoryBanner(file); }}/></label></div>
            <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/70">{ar ? 'ملاءمة صورة البنر' : 'Banner image fit'}</span><select value={editing.imageFit ?? 'cover'} onChange={(e) => setEditing({ ...editing, imageFit: e.target.value as NonNullable<Category['imageFit']> })} className="h-10 w-full rounded-xl border border-line bg-panel2 px-3 text-[11px] text-white"><option value="cover">Cover — fill banner</option><option value="contain">Contain — show full image</option><option value="fill">Fill — stretch to size</option></select></label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/70">{ar ? 'الفئة الأب (اختياري)' : 'Parent category (optional)'}</span>
              <select value={editing.parentId ?? ''} onChange={(e) => setEditing({ ...editing, parentId: e.target.value || null })} className="h-11 w-full rounded-xl border border-line bg-panel2 px-3 text-[13px] outline-none focus:border-electric">
                <option value="">{ar ? '— بدون (فئة رئيسية) —' : '— none (top level) —'}</option>
                {db.categories.filter((c) => c.id !== editing.id && !categoryDescendantIds(db.categories, editing.id).includes(c.id)).sort((a, b) => a.order - b.order).map((c) => <option key={c.id} value={c.id}>{c.parentId ? '↳ ' : ''}{ar ? c.nameAr : he ? (c.nameHe || c.nameEn) : c.nameEn}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-white/85"><input type="checkbox" className="accent-[#00a8ff]" checked={editing.visible} onChange={(e) => setEditing({ ...editing, visible: e.target.checked })} />{ar ? 'ظاهرة' : 'Visible'}</label>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-white/85"><input type="checkbox" className="accent-[#00a8ff]" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />{ar ? 'مميزة بالرئيسية' : 'Featured on homepage'}</label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={() => save(editing)}>{ar ? 'حفظ' : 'Save'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
