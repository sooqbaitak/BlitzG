// BLITZ GAMING — admin: coupons (full CRUD, limits, targeting, generation)
import { useState } from 'react';
import { Plus, Pencil, Trash2, TicketPercent, Wand2, Copy, Check, Power, Percent, Banknote, Truck } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Button, Input, Select, TextArea, Modal, SectionTitle, EmptyState } from '../components/ui';
import { fmtDate } from '../lib/i18n';
import type { Coupon } from '../lib/types';

const today = () => new Date().toISOString().slice(0, 10);
const plusYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };

const emptyCoupon = (): Coupon => ({
  id: `cp-${Date.now()}`,
  code: '',
  description: '',
  type: 'percent',
  value: 10,
  target: 'products',
  minSubtotal: 0,
  productIds: [],
  categoryIds: [],
  startsAt: today(),
  expiresAt: plusYear(),
  usageLimit: null,
  perCustomerLimit: null,
  usedCount: 0,
  active: true,
  category: 'standard',
  pointsCost: 0,
});

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `BLITZ-${s.slice(0, 4)}${s.slice(4)}`;
}

export function CouponsAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [limitMode, setLimitMode] = useState<'unlimited' | 'once' | 'custom'>('unlimited');

  const openNew = () => { setEditing(emptyCoupon()); setIsNew(true); setLimitMode('unlimited'); };
  const openEdit = (c: Coupon) => {
    setEditing({ ...c });
    setIsNew(false);
    setLimitMode(c.usageLimit === null ? 'unlimited' : c.usageLimit === 1 ? 'once' : 'custom');
  };

  const save = (c: Coupon) => {
    const code = c.code.trim().toUpperCase();
    if (!code || code.length < 3) { toast('error', ar ? 'الكود مطلوب (3 أحرف على الأقل)' : 'Code is required (min 3 chars)'); return; }
    if (db.coupons.some((x) => x.code.toUpperCase() === code && x.id !== c.id)) { toast('error', ar ? 'هذا الكود مستخدم مسبقاً' : 'This code already exists'); return; }
    if (c.value < 0 || (c.type === 'percent' && c.value > 100)) { toast('error', ar ? 'قيمة غير صالحة (النسبة حتى 100%)' : 'Invalid value (percent max 100)'); return; }
    if (c.type === 'fixed' && c.target === 'delivery' && c.value === 0) { /* allowed: means free delivery */ }
    if (new Date(c.expiresAt) < new Date(c.startsAt)) { toast('error', ar ? 'تاريخ الانتهاء قبل البداية' : 'Expiry is before start date'); return; }
    const coupon: Coupon = { ...c, code, usageLimit: limitMode === 'unlimited' ? null : limitMode === 'once' ? 1 : (c.usageLimit ?? 100) };
    setDb((d) => ({ ...d, coupons: isNew ? [coupon, ...d.coupons] : d.coupons.map((x) => (x.id === coupon.id ? coupon : x)) }));
    toast('success', isNew ? (ar ? 'أُنشئ الكود' : 'Coupon created') : (ar ? 'حُفظ الكود' : 'Coupon saved'));
    setEditing(null);
  };

  const toggleActive = (id: string) => setDb((d) => ({ ...d, coupons: d.coupons.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) }));
  const remove = (id: string) => { setDb((d) => ({ ...d, coupons: d.coupons.filter((c) => c.id !== id) })); toast('success', ar ? 'حُذف الكود' : 'Coupon deleted'); };
  const copy = (code: string, id: string) => { navigator.clipboard?.writeText(code).catch(() => undefined); setCopiedId(id); setTimeout(() => setCopiedId(null), 1400); };

  const now = new Date();
  const statusOf = (c: Coupon) => {
    if (!c.active) return { label: ar ? 'موقوف' : 'Inactive', cls: 'text-mute border-line bg-panel3' };
    if (new Date(c.startsAt) > now) return { label: ar ? 'لم يبدأ' : 'Scheduled', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10' };
    if (new Date(c.expiresAt) < now) return { label: ar ? 'منتهي' : 'Expired', cls: 'text-red-400 border-red-500/40 bg-red-500/10' };
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { label: ar ? 'مستنفذ' : 'Exhausted', cls: 'text-red-400 border-red-500/40 bg-red-500/10' };
    return { label: ar ? 'نشط' : 'Active', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
  };

  const toggleProduct = (id: string) => editing && setEditing({ ...editing, productIds: editing.productIds.includes(id) ? editing.productIds.filter((x) => x !== id) : [...editing.productIds, id] });
  const toggleCategory = (id: string) => editing && setEditing({ ...editing, categoryIds: editing.categoryIds.includes(id) ? editing.categoryIds.filter((x) => x !== id) : [...editing.categoryIds, id] });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub={ar ? 'خصومات المنتجات أو التوصيل — محدودة بموعد وعدد استخدامات' : 'Product or delivery discounts — bounded by dates & redemption limits'}>{ar ? 'أكواد الخصم' : 'Coupons'}</SectionTitle>
        <Button onClick={openNew}><Plus size={17} strokeWidth={2.6} />{ar ? 'كود جديد' : 'New Coupon'}</Button>
      </div>

      {db.coupons.length === 0 ? (
        <EmptyState icon={<TicketPercent size={34} />} title={ar ? 'لا توجد أكواد' : 'No coupons yet'} hint={ar ? 'أنشئ أول كود خصم لمتجرك' : 'Create your first discount code'} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {db.coupons.map((c) => {
            const st = statusOf(c);
            const limitText = c.usageLimit === null ? (ar ? 'غير محدود' : 'unlimited') : `${c.usedCount}/${c.usageLimit}`;
            return (
              <div key={c.id} className="flex flex-col rounded-2xl border border-line bg-panel p-4 hover:border-electric/40">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => copy(c.code, c.id)} className="group flex items-center gap-2" title={ar ? 'نسخ الكود' : 'Copy code'}>
                    <span className="rounded-lg border border-dashed border-electric/50 bg-electric/5 px-3 py-1.5 font-mono text-[14px] font-bold tracking-wider text-electric">{c.code}</span>
                    {copiedId === c.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} className="text-mute group-hover:text-electric" />}
                  </button>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase ${st.cls}`}>{st.label}</span>
                </div>
                <p className="mt-2 text-[11px] font-medium leading-snug text-white/75">{c.description || (ar ? 'بدون وصف' : 'No description')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9.5px] font-bold">
                  <span className="flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-1 text-white/80">{c.type === 'percent' ? <Percent size={11} /> : <Banknote size={11} />}{c.type === 'percent' ? `${c.value}%` : c.value === 0 ? (ar ? 'مجاني' : 'FREE') : `₪${c.value}`}</span>
                  <span className="flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-1 text-white/80">{c.target === 'delivery' ? <><Truck size={11} />{ar ? 'التوصيل' : 'Delivery'}</> : (ar ? 'المنتجات' : 'Products')}</span>
                  {c.category === 'loyalty' && <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-200">{ar ? `ولاء · ${c.pointsCost ?? 0} نقطة` : `Loyalty · ${c.pointsCost ?? 0} pts`}</span>}
                  {c.minSubtotal > 0 && <span className="rounded-md border border-line bg-panel2 px-2 py-1 text-white/80">{ar ? 'حد أدنى' : 'Min'} ₪{c.minSubtotal}</span>}
                  <span className="rounded-md border border-line bg-panel2 px-2 py-1 text-white/80">{ar ? 'الاستخدام' : 'Used'}: {limitText}</span>
                  {c.perCustomerLimit !== null && <span className="rounded-md border border-line bg-panel2 px-2 py-1 text-white/80">{ar ? 'للزبون' : 'Per customer'}: {c.perCustomerLimit}</span>}
                </div>
                <p className="mt-1.5 text-[9px] font-semibold text-mute">{fmtDate(c.startsAt, lang)} → {fmtDate(c.expiresAt, lang)}{(c.productIds.length > 0 || c.categoryIds.length > 0) && ` · ${ar ? 'محدد بمنتجات/فئات' : 'scoped products/categories'}`}</p>
                <div className="mt-auto flex items-center justify-end gap-1 border-t border-line pt-2.5">
                  <button onClick={() => toggleActive(c.id)} className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-bold ${c.active ? 'border-amber-500/40 text-amber-400' : 'border-emerald-500/40 text-emerald-400'}`} aria-label="Toggle active"><Power size={12} />{c.active ? (ar ? 'إيقاف' : 'Deactivate') : (ar ? 'تفعيل' : 'Activate')}</button>
                  <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-mute hover:bg-panel2 hover:text-electric" aria-label="Edit"><Pencil size={15} /></button>
                  <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-mute hover:bg-red-500/10 hover:text-red-400" aria-label="Delete"><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* editor */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} wide title={isNew ? (ar ? 'كود خصم جديد' : 'New Coupon') : (ar ? 'تعديل الكود' : 'Edit Coupon')}>
        {editing && (
          <div className="space-y-4">
            {/* code row */}
            <div className="flex items-end gap-2">
              <Input label={ar ? 'الكود' : 'Code'} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="BLITZ20" className="font-mono uppercase tracking-wider" />
              <Button variant="outline" size="md" type="button" onClick={() => setEditing({ ...editing, code: genCode() })} title={ar ? 'توليد كود' : 'Generate code'}><Wand2 size={16} />{ar ? 'توليد' : 'Generate'}</Button>
            </div>
            <TextArea label={ar ? 'الوصف' : 'Description'} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder={ar ? 'مثال: خصم 10% على كل المنتجات' : 'e.g. 10% off everything'} className="min-h-[60px]" />

            <div className="grid gap-3 sm:grid-cols-2">
              <Select label={ar ? 'فئة الكود' : 'Coupon category'} value={editing.category ?? 'standard'} onChange={(e) => setEditing({ ...editing, category: e.target.value as NonNullable<Coupon['category']> })}>
                <option value="standard">{ar ? 'عادي — للجميع' : 'Standard — public'}</option>
                <option value="loyalty">{ar ? 'مكافأة ولاء — نقاط مطلوبة' : 'Loyalty reward — points required'}</option>
              </Select>
              {editing.category === 'loyalty' && <Input label={ar ? 'النقاط المطلوبة لفتح الكود' : 'Points required to unlock code'} type="number" min={0} value={editing.pointsCost ?? 0} onChange={(e) => setEditing({ ...editing, pointsCost: Math.max(0, Number(e.target.value) || 0) })} />}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label={ar ? 'نوع الخصم' : 'Discount type'} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Coupon['type'] })}>
                <option value="percent">{ar ? 'نسبة مئوية %' : 'Percentage %'}</option>
                <option value="fixed">{ar ? 'مبلغ ثابت ₪' : 'Fixed amount ₪'}</option>
              </Select>
              <Input label={editing.type === 'percent' ? '%' : '₪'} type="number" min={0} max={editing.type === 'percent' ? 100 : undefined} value={editing.value} onChange={(e) => setEditing({ ...editing, value: Math.max(0, Number(e.target.value)) })} />
              <Select label={ar ? 'يُطبق على' : 'Applies to'} value={editing.target} onChange={(e) => setEditing({ ...editing, target: e.target.value as Coupon['target'] })}>
                <option value="products">{ar ? 'إجمالي المنتجات' : 'Product subtotal'}</option>
                <option value="delivery">{ar ? 'رسوم التوصيل' : 'Delivery fee'}</option>
              </Select>
            </div>
            {editing.target === 'delivery' && editing.type === 'fixed' && (
              <p className="rounded-lg border border-electric/30 bg-electric/5 px-3 py-2 text-[10.5px] font-semibold text-electric">{ar ? 'قيمة 0 = توصيل مجاني. قيمة أكبر = تخفيض بهذا المبلغ من الرسوم.' : 'Value 0 = free delivery. A higher value takes that amount off the fee. The fee never goes below zero.'}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={ar ? 'أدنى إجمالي منتجات ₪' : 'Min product subtotal ₪'} type="number" min={0} value={editing.minSubtotal} onChange={(e) => setEditing({ ...editing, minSubtotal: Math.max(0, Number(e.target.value)) })} />
              <Input label={ar ? 'حد استخدام للزبون الواحد' : 'Per-customer limit'} type="number" min={1} value={editing.perCustomerLimit ?? ''} onChange={(e) => setEditing({ ...editing, perCustomerLimit: e.target.value === '' ? null : Math.max(1, Number(e.target.value)) })} placeholder={ar ? 'غير محدود' : 'unlimited'} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={ar ? 'تاريخ البداية' : 'Starts'} type="date" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} />
              <Input label={ar ? 'تاريخ الانتهاء' : 'Expires'} type="date" value={editing.expiresAt} onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })} />
            </div>

            {/* usage limit */}
            <div>
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/70">{ar ? 'عدد الاستخدامات الكلي' : 'Total redemptions'}</span>
              <div className="flex flex-wrap items-center gap-2">
                {([['unlimited', ar ? 'غير محدود' : 'Unlimited'], ['once', ar ? 'مرة واحدة فقط' : 'Single use (once)'], ['custom', ar ? 'عدد مخصص' : 'Custom limit']] as const).map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => { setLimitMode(mode); if (mode === 'custom' && editing.usageLimit === null) setEditing({ ...editing, usageLimit: 100 }); }} className={`h-10 rounded-xl border px-4 text-[11px] font-bold transition-colors ${limitMode === mode ? 'border-electric bg-electric/15 text-electric' : 'border-line text-mute hover:text-white'}`}>{label}</button>
                ))}
                {limitMode === 'custom' && <input type="number" min={1} value={editing.usageLimit ?? 1} onChange={(e) => setEditing({ ...editing, usageLimit: Math.max(1, Number(e.target.value)) })} className="h-10 w-28 rounded-xl border border-line bg-panel2 px-3 text-[12px] outline-none focus:border-electric" />}
              </div>
            </div>

            {/* scoping */}
            <div>
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/70">{ar ? 'النطاق (فارغ = كل المنتجات)' : 'Scope (empty = all products)'}</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-mute">{ar ? 'الفئات' : 'Categories'}</p>
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-line bg-panel2 p-2">
                    {db.categories.filter((c) => !c.parentId).map((c) => (
                      <button key={c.id} type="button" onClick={() => toggleCategory(c.id)} className={`rounded-lg border px-2 py-1 text-[9.5px] font-bold ${editing.categoryIds.includes(c.id) ? 'border-electric bg-electric/20 text-electric' : 'border-line text-mute'}`}>{ar ? c.nameAr : c.nameEn}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-mute">{ar ? 'منتجات محددة' : 'Specific products'}</p>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-line bg-panel2 p-2">
                    {db.products.slice(0, 40).map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[9.5px] font-semibold text-white/75 hover:bg-panel3">
                        <input type="checkbox" className="accent-[#00a8ff]" checked={editing.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                        <span className="line-clamp-1">{ar ? p.nameAr : p.nameEn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-panel2 px-4 py-3 text-[12px] font-bold text-white/85">
              {ar ? 'الكود مفعّل' : 'Coupon is active'}
              <input type="checkbox" className="h-5 w-5 accent-[#00a8ff]" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            </label>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={() => save(editing)}>{ar ? 'حفظ الكود' : 'Save Coupon'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
