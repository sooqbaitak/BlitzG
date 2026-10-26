// BLITZ GAMING — comparison bar + table
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompareArrows, X, Check } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { productIsAvailable } from '../lib/categories';
import { fmtPrice } from '../lib/i18n';
import { productName } from './ProductCard';

export function CompareBar() {
  const { compare, clearCompare, db, lang, t, dir } = useApp();
  const [open, setOpen] = useState(false);
  if (compare.length === 0) return null;
  const products = compare.map((id) => db.products.find((p) => p.id === id)!).filter(Boolean);

  const cols = ['', ...products.map((p) => p.sku)];
  const rows: { label: string; values: (string | number)[] }[] = [
    { label: lang === 'ar' ? 'الاسم' : 'Product', values: products.map((p) => productName(p, lang)) },
    { label: t('brand'), values: products.map((p) => db.brands.find((b) => b.id === p.brandId)?.name ?? '') },
    { label: lang === 'ar' ? 'السعر' : 'Price', values: products.map((p) => fmtPrice(p.salePrice ?? p.price, lang)) },
    { label: lang === 'ar' ? 'الحالة' : 'Stock', values: products.map((p) => productIsAvailable(p) ? t('in_stock') : t('out_of_stock')) },
    ...(products[0]?.specs ?? []).slice(0, 5).map((_, i) => ({
      label: products[0].specs[i]?.key ?? '',
      values: products.map((p) => p.specs[i]?.value ?? '—'),
    })),
  ];

  return (
    <>
      {/* floating pill */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 start-3 z-[65] flex h-12 items-center gap-2 rounded-full border border-electric/50 bg-[#062333] px-4 font-bold text-electric shadow-lg shadow-electric/20 backdrop-blur hover:bg-[#0a3148] sm:bottom-6 sm:start-6"
      >
        <GitCompareArrows size={18} />
        {t('compare')}
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-electric text-[11px] text-ink">{compare.length}</span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="relative max-h-[88vh] w-full max-w-4xl overflow-auto rounded-t-2xl border border-line bg-panel p-4 sm:rounded-2xl sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold"><GitCompareArrows className="text-electric" size={20} />{lang === 'ar' ? 'مقارنة المنتجات' : 'Compare Products'}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={clearCompare} className="text-[11px] font-bold text-mute hover:text-red-400">{t('clear_all')}</button>
                  <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-mute hover:bg-panel2 hover:text-white"><X size={18} /></button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-[12px]">
                  <thead>
                    <tr>
                      <th className="border border-line bg-panel2 p-2 text-start"></th>
                      {products.map((p) => (
                        <th key={p.id} className="border border-line bg-panel2 p-2 align-top">
                          <Link to={`/product/${p.slug}`} onClick={() => setOpen(false)}>
                            <img src={p.images[0]} alt="" className="mx-auto h-20 w-20 rounded-lg object-cover" />
                            <span className="mt-1 line-clamp-2 block max-w-[130px] text-[11px] font-semibold text-white/90 hover:text-electric">{productName(p, lang)}</span>
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <th className="border border-line p-2 text-start text-[10px] font-bold uppercase text-mute">{row.label}</th>
                        {row.values.map((v, j) => (
                          <td key={j} className="border border-line p-2 text-center align-middle text-white/85">
                            {typeof v === 'string' && (v === t('in_stock')) ? <span className="inline-flex items-center gap-1 text-emerald-400"><Check size={12} />{v}</span> : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
