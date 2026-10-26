// BLITZ GAMING — admin: static pages editor
import { useState } from 'react';
import { FileText, Save, Plus, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle, Button, Input, TextArea, Modal } from '../components/ui';
import type { PageBlock } from '../lib/types';

export function PagesAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const [editing, setEditing] = useState<PageBlock | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = (p: PageBlock) => {
    if (!p.slug.trim() || !p.titleEn.trim()) { toast('error', ar ? 'المعرف والعنوان مطلوبان' : 'Slug and title are required'); return; }
    setDb((d) => ({ ...d, pages: isNew ? [...d.pages, p] : d.pages.map((x) => (x.id === p.id ? p : x)) }));
    toast('success', isNew ? (ar ? 'أُضيفت الصفحة' : 'Page added') : (ar ? 'حُفظت الصفحة' : 'Page saved'));
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle sub={ar ? 'صفحات عن المتجر والتوصيل والأسئلة الشائعة — تظهر في التذييل' : 'About, delivery, FAQ pages — linked from the footer'}>{ar ? 'الصفحات' : 'Pages'}</SectionTitle>
        <Button onClick={() => { setEditing({ id: `pg-${Date.now()}`, slug: '', titleEn: '', titleAr: '', titleHe: '', bodyEn: '', bodyAr: '', bodyHe: '', visible: true }); setIsNew(true); }}><Plus size={17} strokeWidth={2.6} />{ar ? 'صفحة جديدة' : 'New Page'}</Button>
      </div>
      <div className="space-y-2">
        {db.pages.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 hover:border-electric/40">
            <FileText size={20} className="shrink-0 text-electric" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white/90">{ar ? p.titleAr : p.titleEn} <span className="text-[10px] font-mono text-mute">/page/{p.slug}</span></p>
              <p className="line-clamp-1 text-[10px] text-mute">{ar ? p.bodyAr : p.bodyEn}</p>
            </div>
            <button onClick={() => setDb((d) => ({ ...d, pages: d.pages.map((x) => (x.id === p.id ? { ...x, visible: !x.visible } : x)) }))} className={`rounded-lg p-2 hover:bg-panel2 ${p.visible ? 'text-electric' : 'text-mute'}`} aria-label="Toggle visibility">{p.visible ? <Eye size={17} /> : <EyeOff size={17} />}</button>
            <Button variant="outline" size="sm" onClick={() => { setEditing({ ...p }); setIsNew(false); }}><Save size={13} />{ar ? 'تحرير' : 'Edit'}</Button>
          </div>
        ))}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} wide title={isNew ? (ar ? 'صفحة جديدة' : 'New Page') : (ar ? 'تعديل الصفحة' : 'Edit Page')}>
        {editing && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="about" />
              <div className="grid grid-cols-1 gap-3">
                <Input label={ar ? 'العنوان (EN)' : 'Title (EN)'} value={editing.titleEn} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><Input label={ar ? 'العنوان (AR)' : 'Title (AR)'} value={editing.titleAr} onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })} dir="rtl" /><Input label="Title (HE)" value={editing.titleHe ?? ''} onChange={(e) => setEditing({ ...editing, titleHe: e.target.value })} dir="rtl" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextArea label={ar ? 'المحتوى (EN)' : 'Body (EN)'} value={editing.bodyEn} onChange={(e) => setEditing({ ...editing, bodyEn: e.target.value })} className="min-h-48" />
              <TextArea label={ar ? 'المحتوى (AR)' : 'Body (AR)'} value={editing.bodyAr} onChange={(e) => setEditing({ ...editing, bodyAr: e.target.value })} dir="rtl" className="min-h-48" />
              <TextArea label="Body (HE)" value={editing.bodyHe ?? ''} onChange={(e) => setEditing({ ...editing, bodyHe: e.target.value })} dir="rtl" className="min-h-48" />
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
