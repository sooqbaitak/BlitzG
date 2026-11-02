// BLITZ GAMING — admin: inventory quick editing (base and per-variant stock)
import { useMemo, useState } from 'react';
import { Search, AlertTriangle, Boxes } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { SectionTitle } from '../components/ui';
import type { Product } from '../lib/types';

const availableStock = (product: Product) => product.variants.length ? product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0) : Math.max(0, product.stock);

export function InventoryAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar'; const he = lang === 'he';
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const filtered = useMemo(() => {
    let list = db.products; const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(query.trim()) || p.sku.toLowerCase().includes(q));
    if (lowOnly) list = list.filter((p) => availableStock(p) <= 5);
    return [...list].sort((a, b) => availableStock(a) - availableStock(b));
  }, [db.products, query, lowOnly]);
  const setBaseStock = (id: string, value: number) => setDb((d) => ({ ...d, products: d.products.map((p) => p.id === id ? { ...p, stock: Math.max(0, Math.floor(value || 0)) } : p) }));
  const setVariantStock = (productId: string, variantId: string, value: number) => setDb((d) => ({ ...d, products: d.products.map((p) => p.id === productId ? { ...p, variants: p.variants.map((v) => v.id === variantId ? { ...v, stock: Math.max(0, Math.floor(value || 0)) } : v) } : p) }));
  const saved = () => toast('success', ar ? 'حُدّث المخزون' : he ? 'המלאי עודכן' : 'Stock updated');
  const label = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const stockInputClass = (n: number) => `h-8 w-16 rounded-lg border px-2 text-center font-display font-bold outline-none focus:border-electric ${n <= 5 ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-line bg-panel2 text-white'}`;
  return <div>
    <SectionTitle sub={label('Edit stock directly. Products with variants use each option’s quantity; the total is calculated automatically.', 'عدّل المخزون مباشرة. المنتجات ذات الخيارات تستخدم كمية مستقلة لكل خيار ويُحسب الإجمالي تلقائياً.', 'ערכו מלאי ישירות. במוצרים עם וריאנטים הכמות נשמרת לכל אפשרות והסכום מחושב אוטומטית.')}>{label('Inventory', 'المخزون', 'מלאי')}</SectionTitle>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={label('Search…', 'ابحث…', 'חיפוש…')} className="h-10 w-full rounded-xl border border-line bg-panel2 ps-10 pe-3 text-[12px] outline-none focus:border-electric"/></div>
      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel2 px-3 text-[11px] font-bold text-amber-400"><input type="checkbox" className="accent-[#f59e0b]" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)}/><AlertTriangle size={14}/>{label('Low stock only', 'المنخفض فقط', 'מלאי נמוך בלבד')}</label>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-line"><table className="w-full min-w-[700px] text-[11.5px]">
      <thead className="bg-panel2 text-[10px] font-bold uppercase tracking-wider text-mute"><tr><th className="p-3 text-start">{label('Product', 'المنتج', 'מוצר')}</th><th className="p-3 text-start">SKU</th><th className="p-3 text-start">{label('Price', 'السعر', 'מחיר')}</th><th className="p-3 text-start">{label('Stock / options', 'المخزون / الخيارات', 'מלאי / אפשרויות')}</th><th className="p-3 text-start">{label('Status', 'الحالة', 'מצב')}</th></tr></thead>
      <tbody className="divide-y divide-line bg-panel">{filtered.map((p) => { const total = availableStock(p); return <tr key={p.id} className="hover:bg-panel2/60">
        <td className="p-3"><div className="flex items-center gap-2.5"><img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover"/><span className="max-w-56 line-clamp-1 font-semibold text-white/85">{ar ? p.nameAr : he ? (p.nameEn || p.nameAr) : p.nameEn}</span></div></td>
        <td className="p-3 font-mono text-[10px] text-mute">{p.sku}</td><td className="p-3 font-display font-bold">₪{p.salePrice ?? p.price}</td>
        <td className="p-3">{p.variants.length ? <div className="space-y-1.5">{p.variants.map((v) => <div key={v.id} className="flex items-center gap-2"><span className="max-w-40 flex-1 truncate text-[10px] text-mute">{v.label || label('Option', 'خيار', 'אפשרות')}</span><input type="number" min={0} value={v.stock} onChange={(e) => setVariantStock(p.id, v.id, Number(e.target.value) || 0)} onBlur={saved} className={stockInputClass(v.stock)} aria-label={`${p.nameEn} ${v.label} stock`}/></div>)}<p className="border-t border-line pt-1 text-[10px] font-bold text-electric">{label('Total', 'الإجمالي', 'סה״כ')}: {total}</p></div> : <div className="flex items-center gap-1.5"><button onClick={() => { setBaseStock(p.id, p.stock - 1); saved(); }} className="h-8 w-8 rounded-lg border border-line text-white/80 hover:border-electric hover:text-electric">−</button><input type="number" min={0} value={p.stock} onChange={(e) => setBaseStock(p.id, Number(e.target.value) || 0)} onBlur={saved} className={stockInputClass(p.stock)} aria-label="Stock"/><button onClick={() => { setBaseStock(p.id, p.stock + 1); saved(); }} className="h-8 w-8 rounded-lg border border-line text-white/80 hover:border-electric hover:text-electric">+</button></div>}</td>
        <td className="p-3">{total === 0 ? <span className="font-bold text-red-400">{label('Out', 'نافد', 'אזל')}</span> : total <= 5 ? <span className="font-bold text-amber-400">{label('Low', 'منخفض', 'נמוך')}</span> : <span className="font-bold text-emerald-400">{label('Available', 'متوفر', 'זמין')}</span>}</td>
      </tr>; })}</tbody></table>{filtered.length === 0 && <p className="flex items-center justify-center gap-2 py-10 text-[12px] text-mute"><Boxes size={18}/>{label('No matches', 'لا توجد نتائج', 'לא נמצאו תוצאות')}</p>}</div>
  </div>;
}
