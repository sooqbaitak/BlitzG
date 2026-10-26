// BLITZ GAMING — admin: brands
import { useState } from 'react';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Tag } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Button, Input, Modal, SectionTitle } from '../components/ui';
import type { Brand } from '../lib/types';

export function BrandsAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const [editing, setEditing] = useState<Brand | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = (b: Brand) => {
    if (!b.name.trim()) { toast('error', ar ? 'اسم الماركة مطلوب' : 'Brand name is required'); return; }
    const slug = b.slug.trim() || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setDb((d) => ({
      ...d,
      brands: isNew ? [...d.brands, { ...b, slug }] : d.brands.map((x) => (x.id === b.id ? { ...b, slug } : x)),
    }));
    toast('success', isNew ? (ar ? 'أُضيفت الماركة' : 'Brand added') : (ar ? 'حُفظت الماركة' : 'Brand saved'));
    setEditing(null);
  };

  const remove = (id: string) => {
    if (db.products.some((p) => p.brandId === id)) { toast('error', ar ? 'لا يمكن حذف ماركة مرتبطة بمنتجات' : 'Cannot delete a brand linked to products'); return; }
    setDb((d) => ({ ...d, brands: d.brands.filter((b) => b.id !== id) }));
    toast('success', ar ? 'حُذفت الماركة' : 'Brand deleted');
  };

  const toggle = (id: string, key: 'visible' | 'featured') =>
    setDb((d) => ({ ...d, brands: d.brands.map((b) => (b.id === id ? { ...b, [key]: !b[key] } : b)) }));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle sub={`${db.brands.length} ${ar ? 'ماركة' : 'brands'}`}>{ar ? 'الماركات' : 'Brands'}</SectionTitle>
        <Button onClick={() => { setEditing({ id: `b-${Date.now()}`, slug: '', name: '', visible: true, featured: true }); setIsNew(true); }}><Plus size={17} strokeWidth={2.6} />{ar ? 'ماركة جديدة' : 'Add Brand'}</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {db.brands.map((b) => {
          const count = db.products.filter((p) => p.brandId === b.id).length;
          return (
            <div key={b.id} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-panel p-4 text-center hover:border-electric/40">
              <Tag size={18} className="text-electric" />
              <span className="font-display text-[13px] font-bold uppercase text-white/90">{b.name}</span>
              <span className="text-[9.5px] font-semibold text-mute">{count} {ar ? 'منتج' : 'products'}</span>
              <div className="mt-1 flex items-center gap-1">
                <button onClick={() => toggle(b.id, 'featured')} className={`rounded-lg p-1.5 hover:bg-panel2 ${b.featured ? 'text-amber-400' : 'text-mute'}`} aria-label="Feature"><Star size={15} fill={b.featured ? 'currentColor' : 'none'} /></button>
                <button onClick={() => toggle(b.id, 'visible')} className={`rounded-lg p-1.5 hover:bg-panel2 ${b.visible ? 'text-electric' : 'text-mute'}`} aria-label="Toggle visibility">{b.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                <button onClick={() => { setEditing({ ...b }); setIsNew(false); }} className="rounded-lg p-1.5 text-mute hover:text-electric" aria-label="Edit"><Pencil size={15} /></button>
                <button onClick={() => remove(b.id)} className="rounded-lg p-1.5 text-mute hover:text-red-400" aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={isNew ? (ar ? 'ماركة جديدة' : 'New Brand') : (ar ? 'تعديل الماركة' : 'Edit Brand')}>
        {editing && (
          <div className="space-y-3">
            <Input label={ar ? 'الاسم' : 'Name'} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
            <Input label="Slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="razer" />
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-white/85"><input type="checkbox" className="accent-[#00a8ff]" checked={editing.visible} onChange={(e) => setEditing({ ...editing, visible: e.target.checked })} />{ar ? 'ظاهرة' : 'Visible'}</label>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-white/85"><input type="checkbox" className="accent-[#00a8ff]" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />{ar ? 'مميزة بالرئيسية' : 'Featured'}</label>
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
