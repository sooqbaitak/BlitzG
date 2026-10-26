// BLITZ GAMING — admin: inventory quick editing
import { useMemo, useState } from 'react';
import { Search, AlertTriangle, Boxes } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle } from '../components/ui';

export function InventoryAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = db.products;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(query.trim()) || p.sku.toLowerCase().includes(q));
    if (lowOnly) list = list.filter((p) => p.stock <= 5);
    return [...list].sort((a, b) => a.stock - b.stock);
  }, [db.products, query, lowOnly]);

  const setStock = (id: string, value: number) => {
    setDb((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, value) } : p)) }));
    toast('success', ar ? 'حُدّث المخزون' : 'Stock updated');
  };

  return (
    <div>
      <SectionTitle sub={ar ? 'عدّل الكميات مباشرة — التغييرات تطبق فوراً على المتجر' : 'Edit units directly — changes apply to the store instantly'}>{ar ? 'المخزون' : 'Inventory'}</SectionTitle>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ar ? 'ابحث…' : 'Search…'} className="h-10 w-full rounded-xl border border-line bg-panel2 ps-10 pe-3 text-[12px] outline-none focus:border-electric" />
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel2 px-3 text-[11px] font-bold text-amber-400">
          <input type="checkbox" className="accent-[#f59e0b]" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          <AlertTriangle size={14} />{ar ? 'المنخفض فقط' : 'Low stock only'}
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-[11.5px]">
          <thead className="bg-panel2 text-[10px] font-bold uppercase tracking-wider text-mute">
            <tr>
              <th className="p-3 text-start">{ar ? 'المنتج' : 'Product'}</th>
              <th className="p-3 text-start">SKU</th>
              <th className="p-3 text-start">{ar ? 'السعر' : 'Price'}</th>
              <th className="p-3 text-start">{ar ? 'الكمية الإجمالية' : 'Total units'}</th>
              <th className="p-3 text-start">{ar ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-panel">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-panel2/60">
                <td className="p-3"><div className="flex items-center gap-2.5"><img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" /><span className="max-w-56 line-clamp-1 font-semibold text-white/85">{ar ? p.nameAr : p.nameEn}</span></div></td>
                <td className="p-3 font-mono text-[10px] text-mute">{p.sku}</td>
                <td className="p-3 font-display font-bold">₪{p.salePrice ?? p.price}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setStock(p.id, p.stock - 1)} className="h-8 w-8 rounded-lg border border-line text-white/80 hover:border-electric hover:text-electric">−</button>
                    <input type="number" min={0} value={p.stock} onChange={(e) => setStock(p.id, Number(e.target.value) || 0)} className={`h-8 w-16 rounded-lg border px-2 text-center font-display font-bold outline-none focus:border-electric ${p.stock <= 5 ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-line bg-panel2 text-white'}`} aria-label="Stock" />
                    <button onClick={() => setStock(p.id, p.stock + 1)} className="h-8 w-8 rounded-lg border border-line text-white/80 hover:border-electric hover:text-electric">+</button>
                  </div>
                </td>
                <td className="p-3">{p.stock === 0 ? <span className="font-bold text-red-400">{ar ? 'نافد' : 'Out'}</span> : p.stock <= 5 ? <span className="font-bold text-amber-400">{ar ? 'منخفض' : 'Low'}</span> : <span className="font-bold text-emerald-400">{ar ? 'متوفر' : 'OK'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="flex items-center justify-center gap-2 py-10 text-[12px] text-mute"><Boxes size={18} />{ar ? 'لا توجد نتائج' : 'No matches'}</p>}
      </div>
    </div>
  );
}
