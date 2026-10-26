// BLITZ GAMING — admin: overview dashboard
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { ShoppingBag, Banknote, TrendingUp, AlertTriangle, TicketPercent, Package, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { StatCard, SectionTitle } from '../components/ui';
import { fmtPrice, fmtDate } from '../lib/i18n';

export function Dashboard() {
  const { db, lang, dir } = useApp();
  const ar = lang === 'ar';
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const revenue = db.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const pending = db.orders.filter((o) => o.status === 'new').length;
  const lowStock = db.products.filter((p) => p.status === 'active' && p.stock <= 5);
  const revenueToday = db.orders.filter((o) => o.status !== 'cancelled' && o.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s, o) => s + o.total, 0);

  // last 14 days sales series
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const dayOrders = db.orders.filter((o) => o.createdAt.slice(0, 10) === key && o.status !== 'cancelled');
    return {
      day: d.toLocaleDateString(ar ? 'ar-PS' : 'en-GB', { day: 'numeric', month: 'short' }),
      sales: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
    };
  });

  const topProducts = [...db.products].filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 5);
  const couponUsage = db.coupons.map((c) => ({ code: c.code, used: c.usedCount }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle sub={ar ? 'نظرة عامة على أعمالك اليوم' : 'Your business at a glance — today'}>{ar ? 'لوحة المعلومات' : 'Dashboard Overview'}</SectionTitle>
        <Link to="/admin/orders" className="flex items-center gap-1.5 text-[12px] font-bold text-electric hover:text-white">{ar ? 'إدارة الطلبات' : 'Manage orders'}<Arrow size={15} /></Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={ar ? 'إيرادات اليوم' : "Today's Revenue"} value={fmtPrice(revenueToday, lang)} sub={`${db.orders.length} ${ar ? 'طلب إجمالاً' : 'total orders'}`} tone="electric" />
        <StatCard label={ar ? 'إجمالي الإيرادات' : 'Total Revenue'} value={fmtPrice(revenue, lang)} sub={ar ? 'بدون الطلبات الملغاة' : 'excluding cancelled'} tone="violet" />
        <StatCard label={ar ? 'طلبات جديدة' : 'New Orders'} value={pending} sub={ar ? 'بانتظار التأكيد' : 'awaiting confirmation'} tone="amber" />
        <StatCard label={ar ? 'مخزون منخفض' : 'Low Stock'} value={lowStock.length} sub={ar ? 'منتجات ≤ 5 قطع' : 'products at ≤5 units'} tone={lowStock.length ? 'red' : 'emerald'} />
      </div>

      {/* chart + low stock */}
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel p-4 xl:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white/85"><TrendingUp size={16} className="text-electric" />{ar ? 'المبيعات — آخر 14 يوم' : 'Sales — Last 14 Days'}</h2>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a8ff" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#00a8ff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#24242c" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#8b8b98" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8b8b98" fontSize={10} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={{ background: '#17171c', border: '1px solid #24242c', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#fff' }} />
                <Area type="monotone" dataKey="sales" stroke="#00a8ff" strokeWidth={2.4} fill="url(#salesGrad)" name={ar ? 'المبيعات ₪' : 'Sales ₪'} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* low stock */}
        <div className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white/85"><AlertTriangle size={16} className="text-amber-400" />{ar ? 'مخزون منخفض' : 'Low Stock Alerts'}</h2>
          {lowStock.length === 0 ? (
            <p className="py-8 text-center text-[12px] font-semibold text-emerald-400">{ar ? 'كل المنتجات متوفرة بكمية جيدة' : 'All products are well stocked'}</p>
          ) : (
            <ul className="max-h-52 space-y-2 overflow-y-auto">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2">
                  <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1"><span className="line-clamp-1 text-[11px] font-semibold text-white/85">{ar ? p.nameAr : p.nameEn}</span><span className="text-[9px] font-bold text-mute">{p.sku}</span></span>
                  <span className="font-display text-sm font-bold text-amber-400">{p.stock}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/inventory" className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-line py-2 text-[11px] font-bold text-white/75 hover:border-electric hover:text-electric">{ar ? 'إدارة المخزون' : 'Go to inventory'}<Arrow size={13} /></Link>
        </div>
      </div>

      {/* latest orders + top products + coupon usage */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {/* latest orders */}
        <div className="rounded-2xl border border-line bg-panel p-4 xl:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white/85"><ShoppingBag size={16} className="text-electric" />{ar ? 'أحدث الطلبات' : 'Latest Orders'}</h2>
          {db.orders.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-mute">{ar ? 'لا توجد طلبات بعد — عند تنفيذ طلب من المتجر سيظهر هنا' : 'No orders yet — orders from the storefront will appear here'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-[11px]">
                <thead><tr className="text-start text-mute"><th className="pb-2 text-start">{ar ? 'الطلب' : 'Order'}</th><th className="pb-2 text-start">{ar ? 'الزبون' : 'Customer'}</th><th className="pb-2 text-start">{ar ? 'الإجمالي' : 'Total'}</th><th className="pb-2 text-start">{ar ? 'الحالة' : 'Status'}</th><th className="pb-2 text-start">{ar ? 'التاريخ' : 'Date'}</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {db.orders.slice(0, 6).map((o) => (
                    <tr key={o.id} className="text-white/85">
                      <td className="py-2 font-display font-bold text-electric">{o.number}</td>
                      <td className="py-2"><span className="block font-semibold">{o.customerName}</span><span className="text-[9px] text-mute">{o.phone}</span></td>
                      <td className="py-2 font-display font-bold">{fmtPrice(o.total, lang)}</td>
                      <td className="py-2"><StatusPill status={o.status} ar={ar} /></td>
                      <td className="py-2 text-mute">{fmtDate(o.createdAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* coupon usage */}
        <div className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white/85"><TicketPercent size={16} className="text-violet-accent" />{ar ? 'استخدام الأكواد' : 'Coupon Usage'}</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={couponUsage} margin={{ top: 4, right: 0, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#24242c" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="code" fontSize={9} stroke="#8b8b98" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="#8b8b98" tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#1e1e25' }} contentStyle={{ background: '#17171c', border: '1px solid #24242c', borderRadius: 12, fontSize: 11 }} />
                <Bar dataKey="used" fill="#8b5cf6" radius={[6, 6, 0, 0]} name={ar ? 'مرات الاستخدام' : 'Redemptions'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Link to="/admin/coupons" className="mt-2 flex items-center justify-center gap-1 rounded-xl border border-line py-2 text-[11px] font-bold text-white/75 hover:border-electric hover:text-electric">{ar ? 'إدارة الأكواد' : 'Manage coupons'}<Arrow size={13} /></Link>
        </div>
      </div>

      {/* top products */}
      <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
        <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white/85"><Package size={16} className="text-electric" />{ar ? 'الأكثر مبيعاً' : 'Best Sellers'}</h2>
        {topProducts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-mute">{ar ? 'ستظهر المنتجات الأكثر مبيعاً بعد تسجيل طلبات حقيقية.' : 'Best sellers will appear after real orders are recorded.'}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {topProducts.map((p) => (
              <div key={p.id} className="rounded-xl border border-line bg-panel2 p-2 text-center">
                <img src={p.images[0]} alt="" className="mx-auto h-16 w-16 rounded-lg object-cover" />
                <p className="mt-1 line-clamp-2 min-h-[2.1em] text-[9.5px] font-semibold leading-tight text-white/80">{ar ? p.nameAr : p.nameEn}</p>
                <p className="mt-0.5 font-display text-[11px] font-bold text-electric">{p.sold} {ar ? 'مبيعة' : 'sold'} · {fmtPrice(p.salePrice ?? p.price, lang)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ status, ar }: { status: string; ar: boolean }) {
  const m: Record<string, { en: string; ar: string; cls: string }> = {
    new: { en: 'New', ar: 'جديد', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
    confirmed: { en: 'Confirmed', ar: 'مؤكد', cls: 'text-electric border-electric/40 bg-electric/10' },
    shipped: { en: 'Shipped', ar: 'تم الشحن', cls: 'text-violet-accent border-violet-accent/40 bg-violet-accent/10' },
    delivered: { en: 'Delivered', ar: 'تم التسليم', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
    cancelled: { en: 'Cancelled', ar: 'ملغي', cls: 'text-red-400 border-red-500/40 bg-red-500/10' },
  };
  const s = m[status] ?? m.new;
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold ${s.cls}`}>{ar ? s.ar : s.en}</span>;
}
