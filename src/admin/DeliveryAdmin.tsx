// BLITZ GAMING — admin: base and custom delivery locations
import { useState } from 'react';
import { Truck, Save, MapPin, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { SectionTitle, Button, Input } from '../components/ui';
import type { DeliveryLocation, DeliverySettings } from '../lib/types';

const makeId = (label: string) => label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || `area-${Date.now()}`;
const txtFree = (ar: boolean, he: boolean, en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;

export function DeliveryAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const [fees, setFees] = useState<DeliverySettings>(() => ({ ...db.delivery, additionalAreas: (db.delivery.additionalAreas ?? []).map((a) => ({ ...a, active: a.active !== false })) }));
  const [newArea, setNewArea] = useState({ nameEn: '', nameAr: '', nameHe: '', fee: 20, freeDeliveryThreshold: 0 });
  const dirty = JSON.stringify(fees) !== JSON.stringify(db.delivery);

  const save = () => {
    const allFees = [fees.westbank, fees.jerusalem, fees.inside48, ...(fees.additionalAreas ?? []).map((a) => a.fee)];
    const thresholds = [fees.westbankFreeDeliveryThreshold, fees.jerusalemFreeDeliveryThreshold, fees.inside48FreeDeliveryThreshold, ...(fees.additionalAreas ?? []).map((a) => a.freeDeliveryThreshold)];
    if (allFees.some((f) => !Number.isFinite(f) || f < 0) || thresholds.some((f) => f !== undefined && f !== null && (!Number.isFinite(f) || f < 0))) { toast('error', ar ? 'الرسوم وحدود التوصيل المجاني يجب ألا تكون سالبة' : 'Fees and free-delivery thresholds must be non-negative'); return; }
    const normalizedFees: DeliverySettings = { ...fees, additionalAreas: (fees.additionalAreas ?? []).map((a) => ({ ...a, nameEn: a.nameEn.trim(), nameAr: a.nameAr.trim(), nameHe: (a.nameHe || a.nameEn).trim(), active: a.active !== false })) };
    setFees(normalizedFees);
    setDb((d) => ({ ...d, delivery: normalizedFees }));
    toast('success', ar ? 'تم حفظ مناطق ورسوم التوصيل' : 'Delivery locations and fees saved');
  };
  const updateArea = (id: string, patch: Partial<DeliveryLocation>) => setFees((f) => ({ ...f, additionalAreas: (f.additionalAreas ?? []).map((a) => a.id === id ? { ...a, ...patch } : a) }));
  const addArea = () => {
    if (!newArea.nameEn.trim() || !newArea.nameAr.trim()) { toast('error', ar ? 'أدخل اسم المنطقة بالإنجليزية والعربية' : 'Enter the location name in English and Arabic'); return; }
    let id = makeId(newArea.nameEn);
    if (['westbank', 'jerusalem', 'inside48'].includes(id) || (fees.additionalAreas ?? []).some((a) => a.id === id)) id = `${id}-${Date.now().toString().slice(-4)}`;
    const area: DeliveryLocation = { id, nameEn: newArea.nameEn.trim(), nameAr: newArea.nameAr.trim(), nameHe: newArea.nameHe.trim() || newArea.nameEn.trim(), fee: Math.max(0, newArea.fee), freeDeliveryThreshold: newArea.freeDeliveryThreshold > 0 ? newArea.freeDeliveryThreshold : null, active: true };
    setFees((f) => ({ ...f, additionalAreas: [...(f.additionalAreas ?? []), area] }));
    setNewArea({ nameEn: '', nameAr: '', nameHe: '', fee: 20, freeDeliveryThreshold: 0 });
  };
  const fixedAreas = [
    { key: 'westbank' as const, en: 'West Bank', arName: 'الضفة الغربية', heName: 'הגדה המערבית', hintEn: 'Ramallah, Nablus, Hebron, Bethlehem, Jenin…', hintAr: 'رام الله، نابلس، الخليل، بيت لحم، جنين…', hintHe: 'רמאללה, שכם, חברון, בית לחם, ג׳נין…' },
    { key: 'jerusalem' as const, en: 'Jerusalem', arName: 'القدس', heName: 'ירושלים', hintEn: 'Jerusalem and its surrounding areas', hintAr: 'القدس ومحيطها', hintHe: 'ירושלים והסביבה' },
    { key: 'inside48' as const, en: '1948 Areas', arName: 'أراضي ١٩٤٨', heName: 'אזורי 1948', hintEn: 'Haifa, Yafa, Nazareth, Triangle & Galilee', hintAr: 'حيفا، يافا، الناصرة، المثلث والجليل', hintHe: 'חיפה, יפו, נצרת, המשולש והגליל' },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle sub={ar ? 'عدّل الرسوم الأساسية وأضف مناطق توصيل خاصة — رسم واحد لكل طلب' : he ? 'ערוך דמי משלוח והוסף אזורים נוספים — חיוב אחד להזמנה' : 'Edit base fees and add custom delivery areas — one fee per order'}>{ar ? 'إعدادات التوصيل' : he ? 'הגדרות משלוח' : 'Delivery Settings'}</SectionTitle>
      <div className="space-y-3">
        {fixedAreas.map((a) => <div key={a.key} className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4"><div className="rounded-xl border border-electric/30 bg-electric/10 p-3 text-electric"><Truck size={22}/></div><div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-[13px] font-bold text-white/90"><MapPin size={13} className="text-electric"/>{ar ? a.arName : he ? a.heName : a.en}</p><p className="mt-0.5 text-[10px] font-medium text-mute">{ar ? a.hintAr : he ? a.hintHe : a.hintEn}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><div className="flex items-center gap-2"><span className="font-display text-lg font-bold text-mute">₪</span><input type="number" min={0} value={fees[a.key]} onChange={(e) => setFees({ ...fees, [a.key]: Math.max(0, Number(e.target.value) || 0) })} className="h-12 w-24 rounded-xl border border-line bg-panel2 text-center font-display text-2xl font-bold text-white outline-none focus:border-electric" aria-label={a.en} /></div><label className="min-w-[130px] text-[9px] font-bold text-mute">{txtFree(ar, he, 'Free delivery from ₪', 'توصيل مجاني من ₪', 'משלוח חינם מ־₪')}<input type="number" min={0} placeholder="Off" value={(a.key === 'westbank' ? fees.westbankFreeDeliveryThreshold : a.key === 'jerusalem' ? fees.jerusalemFreeDeliveryThreshold : fees.inside48FreeDeliveryThreshold) ?? ''} onChange={(e) => { const value = e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0); setFees((current) => a.key === 'westbank' ? { ...current, westbankFreeDeliveryThreshold: value } : a.key === 'jerusalem' ? { ...current, jerusalemFreeDeliveryThreshold: value } : { ...current, inside48FreeDeliveryThreshold: value }); }} className="mt-1 h-9 w-full rounded-lg border border-line bg-panel2 px-2 text-center text-[11px] text-white" /></label></div></div>)}
      </div>

      <div className="mt-7 mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold text-white">{ar ? 'مناطق إضافية' : he ? 'אזורי משלוח נוספים' : 'Additional delivery locations'}</h2><span className="text-[10px] text-mute">{(fees.additionalAreas ?? []).length} {ar ? 'منطقة' : he ? 'אזורים' : 'locations'}</span></div>
      <div className="space-y-2">{(fees.additionalAreas ?? []).map((a) => <div key={a.id} className="grid gap-2 rounded-2xl border border-line bg-panel p-3 sm:grid-cols-[1fr_1fr_1fr_90px_120px_auto_auto] sm:items-center"><Input label="Name (EN)" value={a.nameEn} onChange={(e) => updateArea(a.id, { nameEn: e.target.value })}/><Input label="الاسم (AR)" value={a.nameAr} onChange={(e) => updateArea(a.id, { nameAr: e.target.value })} dir="rtl"/><Input label="Name (HE)" value={a.nameHe ?? ''} onChange={(e) => updateArea(a.id, { nameHe: e.target.value })} dir="rtl"/><Input label="Fee ₪" type="number" min={0} value={a.fee} onChange={(e) => updateArea(a.id, { fee: Math.max(0, Number(e.target.value) || 0) })}/><Input label={txtFree(ar, he, 'Free from ₪', 'مجاني من ₪', 'חינם מ־₪')} type="number" min={0} value={a.freeDeliveryThreshold ?? ''} placeholder="Off" onChange={(e) => updateArea(a.id, { freeDeliveryThreshold: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) })}/><label className="flex items-center gap-2 text-[10px] font-bold text-white/75"><input type="checkbox" checked={a.active !== false} onChange={(e) => updateArea(a.id, { active: e.target.checked })} className="accent-[#00a8ff]"/>{ar ? 'فعالة' : he ? 'פעיל' : 'Active'}</label><button type="button" onClick={() => setFees((f) => ({ ...f, additionalAreas: (f.additionalAreas ?? []).filter((x) => x.id !== a.id) }))} className="rounded-lg p-2 text-mute hover:bg-red-500/10 hover:text-red-400" title="Delete location"><Trash2 size={16}/></button></div>)}</div>

      <div className="mt-3 rounded-2xl border border-dashed border-electric/40 bg-electric/5 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold text-electric"><Plus size={15}/>{ar ? 'إضافة منطقة توصيل' : he ? 'הוסף אזור משלוח' : 'Add a delivery location'}</h3>
        <div className="grid gap-3 sm:grid-cols-2"><Input label="Name (EN)" value={newArea.nameEn} onChange={(e) => setNewArea({ ...newArea, nameEn: e.target.value })} placeholder="Example: Remote Area"/><Input label="الاسم (AR)" value={newArea.nameAr} onChange={(e) => setNewArea({ ...newArea, nameAr: e.target.value })} dir="rtl" placeholder="اسم المنطقة"/><Input label="Name (HE)" value={newArea.nameHe} onChange={(e) => setNewArea({ ...newArea, nameHe: e.target.value })} dir="rtl" placeholder="שם האזור"/><Input label="Delivery fee (ILS)" type="number" min={0} value={newArea.fee} onChange={(e) => setNewArea({ ...newArea, fee: Math.max(0, Number(e.target.value) || 0) })}/><Input label={txtFree(ar, he, 'Free delivery from (ILS; 0 = off)', 'التوصيل المجاني من (شيكل؛ 0 = معطل)', 'משלוח חינם מ־ (₪; 0 = כבוי')} type="number" min={0} value={newArea.freeDeliveryThreshold} onChange={(e) => setNewArea({ ...newArea, freeDeliveryThreshold: Math.max(0, Number(e.target.value) || 0) })}/></div>
        <div className="mt-3 flex justify-end"><Button onClick={addArea}><Plus size={15}/>{ar ? 'إضافة المنطقة' : he ? 'הוסף אזור' : 'Add location'}</Button></div>
      </div>
      <div className="mt-4 rounded-2xl border border-violet-accent/30 bg-violet-accent/5 p-4 text-[11px] font-semibold leading-relaxed text-white/75">{ar ? 'رسوم التوصيل تظهر في ملخص الحساب فقط. يمكنك تحديد حد للتوصيل المجاني لكل منطقة؛ سيُطبق تلقائياً عند وصول مجموع المنتجات إليه.' : he ? 'דמי המשלוח מופיעים בסיכום בלבד. ניתן להגדיר סף למשלוח חינם לכל אזור, והוא יחול כשהסכום יגיע לסף.' : 'Delivery fees are shown in the checkout total only. Set an optional free-delivery threshold per area; checkout uses it automatically when the product subtotal reaches it.'}</div>
      <div className="mt-5 flex justify-end"><Button size="lg" onClick={save} disabled={!dirty}><Save size={17}/>{ar ? 'حفظ الرسوم والمناطق' : he ? 'שמור אזורים ותעריפים' : 'Save locations & fees'}</Button></div>
    </div>
  );
}
