// BLITZ GAMING — live cart drawer
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingCart, Zap, Trash } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { lineTotal } from '../lib/db';
import { fmtPrice } from '../lib/i18n';
import { productName } from './ProductCard';

export function CartDrawer() {
  const { db, t, lang, cart, setQty, removeFromCart, clearCart, drawerOpen, setDrawerOpen } = useApp();
  const navigate = useNavigate();

  const rows = cart.map((l) => {
    const p = db.products.find((x) => x.id === l.productId)!;
    const v = p?.variants.find((x) => x.id === l.variantId);
    return { line: l, product: p, variant: v, total: lineTotal(p, l.variantId, l.qty) };
  }).filter((r) => r.product);

  const subtotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <motion.aside
            key="panel"
            initial={{ x: lang === 'ar' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: lang === 'ar' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed inset-y-0 ${lang === 'ar' ? 'left-0' : 'right-0'} z-[71] flex w-full max-w-md flex-col border-line bg-panel ${lang === 'ar' ? 'border-e' : 'border-s'}`}
            role="dialog" aria-label={t('cart')}
          >
            {/* header */}
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ShoppingCart size={19} className="text-electric" />{t('cart')} <span className="text-mute">({rows.length})</span></h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-white/80 hover:bg-panel2" aria-label="Close"><X size={20} /></button>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="rounded-2xl border border-line bg-panel2 p-5"><ShoppingCart size={40} className="text-mute" /></div>
                <p className="text-base font-bold text-white/90">{t('empty_cart')}</p>
                <button onClick={() => { setDrawerOpen(false); navigate('/shop'); }} className="rounded-xl bg-electric px-6 py-2.5 text-sm font-bold text-ink hover:bg-[#33baff]">{t('continue_shopping')}</button>
              </div>
            ) : (
              <>
                {/* lines */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <ul className="space-y-3">
                    {rows.map(({ line, product, variant, total }) => (
                      <li key={`${line.productId}-${line.variantId ?? 'base'}`} className="flex gap-3 rounded-2xl border border-line bg-panel2 p-2.5">
                        <Link to={`/product/${product.slug}`} onClick={() => setDrawerOpen(false)} className="shrink-0">
                          <img src={variant?.imageIndex !== undefined && product.images[variant.imageIndex] ? product.images[variant.imageIndex] : product.images[0]} alt={productName(product, lang)} className="h-20 w-20 rounded-xl object-cover" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <Link to={`/product/${product.slug}`} onClick={() => setDrawerOpen(false)} className="line-clamp-2 text-[12px] font-semibold leading-snug text-white/90 hover:text-electric">{productName(product, lang)}</Link>
                          {variant && <span className="mt-0.5 text-[10px] text-mute">{variant.label}</span>}
                          <div className="mt-auto flex items-center justify-between pt-1.5">
                            <div className="flex items-center rounded-lg border border-line">
                              <button onClick={() => setQty(line.productId, line.variantId, line.qty - 1)} className="p-1.5 text-white/80 hover:text-electric" aria-label="Decrease"><Minus size={13} /></button>
                              <span className="w-7 text-center text-[12px] font-bold">{line.qty}</span>
                              <button onClick={() => setQty(line.productId, line.variantId, line.qty + 1)} className="p-1.5 text-white/80 hover:text-electric" aria-label="Increase"><Plus size={13} /></button>
                            </div>
                            <span className="font-display text-sm font-bold text-white">{fmtPrice(total, lang)}</span>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(line.productId, line.variantId)} className="self-start rounded-lg p-1.5 text-mute hover:bg-red-500/10 hover:text-red-400" aria-label="Remove"><Trash2 size={16} /></button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* footer */}
                <div className="border-t border-line bg-panel2/60 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-mute">{t('subtotal')}</span>
                    <span className="font-display text-base font-bold">{fmtPrice(subtotal, lang)}</span>
                  </div>
                  <p className="mb-3 text-[10px] text-mute">{lang === 'ar' ? 'رسوم التوصيل والخصم تُحسب عند إتمام الطلب' : lang === 'he' ? 'דמי משלוח והנחות מחושבים בקופה' : 'Delivery fees & discounts are calculated at checkout'}</p>
                  <div className="mb-3 flex justify-end">
                    <button onClick={() => clearCart()} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-red-400 transition hover:bg-red-500/10" aria-label={lang === 'ar' ? 'إفراغ السلة' : lang === 'he' ? 'ריקון העגלה' : 'Empty cart'}>
                      <Trash size={13}/>{lang === 'ar' ? 'إفراغ السلة' : lang === 'he' ? 'ריקון העגלה' : 'Empty cart'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/cart" onClick={() => setDrawerOpen(false)} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-line text-sm font-bold text-white hover:border-electric hover:text-electric">{t('cart')}</Link>
                    <Link to="/checkout" onClick={() => setDrawerOpen(false)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-electric text-sm font-bold text-ink hover:bg-[#33baff]"><Zap size={16} strokeWidth={2.5} />{t('checkout')}</Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
