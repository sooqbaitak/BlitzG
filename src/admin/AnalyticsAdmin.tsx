// BLITZ GAMING — filterable sales, product and estimated profit analytics
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Filter, TrendingUp, Package } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { fmtPrice } from '../lib/i18n';
import { StatCard, SectionTitle } from '../components/ui';
import { categoryTreeIds } from '../lib/categories';
import type { OrderItem } from '../lib/types';

type GroupBy = 'category' | 'product' | 'brand';
type AnalyticLine = { orderNumber: string; createdAt: string; item: OrderItem; productName: string; categoryId: string; brandId: string; revenue: number; cost?: number; discountShare: number };

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const defaultStart = () => { const d = new Date(); d.setDate(d.getDate() - 29); return isoDate(d); };
const today = () => isoDate(new Date());

export function AnalyticsAdmin() {
  const { db, lang } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const [from, setFrom] = useState(defaultStart);
  const [to, setTo] = useState(today);
  const [categoryId, setCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');

  const availableProducts = useMemo(() => db.products.filter((p) => !brandId || p.brandId === brandId).filter((p) => {
    if (!categoryId) return true;
    return categoryTreeIds(db.categories, categoryId).includes(p.categoryId);
  }).sort((a, b) => a.nameEn.localeCompare(b.nameEn)), [db.products, db.categories, categoryId, brandId]);

  const report = useMemo(() => {
    const orders = db.orders.filter((o) => o.status !== 'cancelled' && o.createdAt.slice(0, 10) >= from && o.createdAt.slice(0, 10) <= to);
    const lines: AnalyticLine[] = [];
    for (const order of orders) {
      const allLineRevenue = order.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0) || order.productSubtotal || 1;
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        const itemCategoryId = item.categoryId || product?.categoryId || '';
        const itemBrandId = item.brandId || product?.brandId || '';
        if (categoryId && !categoryTreeIds(db.categories, categoryId).includes(itemCategoryId)) continue;
        if (productId && item.productId !== productId) continue;
        if (brandId && itemBrandId !== brandId) continue;
        const revenue = item.unitPrice * item.qty;
        const cost = typeof item.unitCost === 'number' && Number.isFinite(item.unitCost) ? item.unitCost * item.qty : undefined;
        lines.push({
          orderNumber: order.number, createdAt: order.createdAt, item,
          productName: item.name || product?.nameEn || item.sku,
          categoryId: itemCategoryId, brandId: itemBrandId, revenue, cost,
          discountShare: order.discount > 0 ? order.discount * revenue / allLineRevenue : 0,
        });
      }
    }
    const orderIds = new Set(lines.map((line) => line.orderNumber));
    const revenue = lines.reduce((sum, line) => sum + line.revenue, 0);
    const knownCostLines = lines.filter((line) => line.cost !== undefined);
    const knownRevenue = knownCostLines.reduce((sum, line) => sum + line.revenue, 0);
    const cost = knownCostLines.reduce((sum, line) => sum + (line.cost ?? 0), 0);
    const discount = lines.reduce((sum, line) => sum + line.discountShare, 0);
    const knownDiscount = knownCostLines.reduce((sum, line) => sum + line.discountShare, 0);
    const knownNetRevenue = knownRevenue - knownDiscount;
    const profit = knownNetRevenue - cost;
    const margin = knownNetRevenue > 0 ? profit / knownNetRevenue * 100 : 0;
    const units = lines.reduce((sum, line) => sum + line.item.qty, 0);

    const trendDays: { date: string; label: string; sales: number; orders: number }[] = [];
    const start = new Date(`${from}T12:00:00`); const end = new Date(`${to}T12:00:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      for (let d = new Date(start), n = 0; d <= end && n < 370; d.setDate(d.getDate() + 1), n++) {
        const key = isoDate(d);
        const daily = lines.filter((line) => line.createdAt.slice(0, 10) === key);
        trendDays.push({ date: key, label: d.toLocaleDateString(ar ? 'ar-PS' : he ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' }), sales: daily.reduce((sum, line) => sum + line.revenue - line.discountShare, 0), orders: new Set(daily.map((line) => line.orderNumber)).size });
      }
    }

    const grouped = new Map<string, { key: string; label: string; revenue: number; units: number; orders: Set<string> }>();
    for (const line of lines) {
      let key = line.categoryId; let label = db.categories.find((c) => c.id === line.categoryId)?.[ar ? 'nameAr' : he ? 'nameHe' : 'nameEn'] || line.categoryId || txt('Uncategorized', 'دون فئة', 'ללא קטגוריה');
      if (groupBy === 'product') { key = line.item.productId; label = line.productName; }
      if (groupBy === 'brand') { key = line.brandId; label = db.brands.find((b) => b.id === line.brandId)?.name || txt('Unknown brand', 'ماركة غير معروفة', 'מותג לא ידוע'); }
      const current = grouped.get(key) ?? { key, label, revenue: 0, units: 0, orders: new Set<string>() };
      current.revenue += line.revenue - line.discountShare; current.units += line.item.qty; current.orders.add(line.orderNumber); grouped.set(key, current);
    }
    const groupBars = [...grouped.values()].map((g) => ({ key: g.key, label: g.label, sales: Math.max(0, g.revenue), units: g.units, orders: g.orders.size })).sort((a, b) => b.sales - a.sales).slice(0, 12);
    return { lines, orders: orderIds.size, revenue, units, cost, profit, margin, knownRevenue, costCoverage: revenue > 0 ? knownRevenue / revenue * 100 : 0, discount, trendDays, groupBars };
  }, [db.orders, db.products, db.categories, db.brands, from, to, categoryId, productId, brandId, groupBy, ar, he]);

  const reset = () => { setFrom(defaultStart()); setTo(today()); setCategoryId(''); setProductId(''); setBrandId(''); setGroupBy('category'); };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><SectionTitle sub={txt('Filter performance by date, category, product or brand. Profit is estimated only where a sale has a saved cost snapshot.', 'حلّل الأداء حسب الفترة والفئة والمنتج والماركة. يُحسب الربح التقديري للمنتجات التي لها تكلفة محفوظة وقت البيع.', 'סננו ביצועים לפי תאריך, קטגוריה, מוצר או מותג. הרווח משוער רק כאשר עלות המוצר נשמרה בעת המכירה.')}>{txt('Sales Analytics', 'تحليلات المبيعات', 'ניתוח מכירות')}</SectionTitle><button onClick={reset} className="h-9 rounded-xl border border-line px-3 text-[11px] font-bold text-white/80 hover:border-electric">{txt('Reset filters', 'إعادة ضبط الفلاتر', 'איפוס מסננים')}</button></div>
    <section className="rounded-2xl border border-line bg-panel p-4"><h2 className="mb-3 flex items-center gap-2 text-[12px] font-bold text-white"><Filter size={15} className="text-electric"/>{txt('Report filters', 'فلاتر التقرير', 'מסנני דוח')}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="text-[10px] font-bold text-mute"><span className="mb-1 block">{txt('From date', 'من تاريخ', 'מתאריך')}</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-panel2 px-2 text-[11px] text-white outline-none focus:border-electric"/></label>
      <label className="text-[10px] font-bold text-mute"><span className="mb-1 block">{txt('To date', 'إلى تاريخ', 'עד תאריך')}</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-panel2 px-2 text-[11px] text-white outline-none focus:border-electric"/></label>
      <label className="text-[10px] font-bold text-mute"><span className="mb-1 block">{txt('Category', 'الفئة', 'קטגוריה')}</span><select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setProductId(''); }} className="h-10 w-full rounded-xl border border-line bg-panel2 px-2 text-[11px] text-white outline-none focus:border-electric"><option value="">{txt('All categories', 'كل الفئات', 'כל הקטגוריות')}</option>{[...db.categories].sort((a,b) => a.order-b.order).map((c) => <option key={c.id} value={c.id}>{ar ? c.nameAr : he ? (c.nameHe || c.nameEn) : c.nameEn}</option>)}</select></label>
      <label className="text-[10px] font-bold text-mute"><span className="mb-1 block">{txt('Brand', 'الماركة', 'מותג')}</span><select value={brandId} onChange={(e) => { setBrandId(e.target.value); setProductId(''); }} className="h-10 w-full rounded-xl border border-line bg-panel2 px-2 text-[11px] text-white outline-none focus:border-electric"><option value="">{txt('All brands', 'كل الماركات', 'כל המותגים')}</option>{db.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="text-[10px] font-bold text-mute"><span className="mb-1 block">{txt('Product', 'المنتج', 'מוצר')}</span><select value={productId} onChange={(e) => setProductId(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-panel2 px-2 text-[11px] text-white outline-none focus:border-electric"><option value="">{txt('All products', 'كل المنتجات', 'כל המוצרים')}</option>{availableProducts.map((p) => <option key={p.id} value={p.id}>{p.nameEn} · {p.sku}</option>)}</select></label>
    </div><div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-mute"><span>{txt('Cancelled orders excluded. Product discounts are allocated proportionally across selected lines; delivery and other operating costs are excluded from gross profit.', 'تُستبعد الطلبات الملغاة. تُوزع خصومات المنتجات نسبياً على البنود المحددة، ولا تشمل الأرباح الإجمالية رسوم التوصيل أو المصاريف التشغيلية.', 'הזמנות שבוטלו אינן נכללות. הנחות על מוצרים מחולקות יחסית בין השורות שנבחרו; משלוח והוצאות תפעול אינם נכללים ברווח הגולמי.')}</span></div></section>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <StatCard label={txt('Gross product sales', 'إجمالي مبيعات المنتجات قبل الخصم', 'מכירות מוצרים ברוטו')} value={fmtPrice(report.revenue, lang)} sub={`${report.orders} ${txt('orders', 'طلب', 'הזמנות')} · ${report.units} ${txt('units', 'قطعة', 'יחידות')}`} tone="electric"/>
      <StatCard label={txt('Discounts allocated', 'الخصومات الموزعة', 'הנחות מוקצות')} value={fmtPrice(report.discount, lang)} sub={txt('Selected product lines', 'بنود المنتجات المحددة', 'שורות המוצרים שנבחרו')} tone="violet"/>
      <StatCard label={txt('Known product cost', 'تكلفة المنتجات المعروفة', 'עלות מוצרים ידועה')} value={fmtPrice(report.cost, lang)} sub={`${report.costCoverage.toFixed(1)}% ${txt('revenue cost-covered', 'من المبيعات لها تكلفة', 'מהמכירות מכוסות עלות')}`} tone="amber"/>
      <StatCard label={txt('Estimated gross profit', 'الربح الإجمالي التقديري', 'רווח גולמי משוער')} value={fmtPrice(report.profit, lang)} sub={txt('Only items with saved cost', 'للبنود ذات التكلفة المحفوظة فقط', 'רק פריטים עם עלות שמורה')} tone={report.profit >= 0 ? 'emerald' : 'red'}/>
      <StatCard label={txt('Gross margin', 'هامش الربح الإجمالي', 'שולי רווח גולמי')} value={`${report.margin.toFixed(1)}%`} sub={txt('Cost-known items only', 'للبنود ذات التكلفة فقط', 'רק פריטים עם עלות ידועה')} tone={report.margin >= 0 ? 'emerald' : 'red'}/>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-line bg-panel p-4"><h2 className="mb-3 flex items-center gap-2 text-[12px] font-bold text-white"><TrendingUp size={15} className="text-electric"/>{txt('Sales over time', 'المبيعات عبر الزمن', 'מכירות לאורך זמן')}</h2><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.trendDays} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}><defs><linearGradient id="analyticsSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00a8ff" stopOpacity={0.4}/><stop offset="95%" stopColor="#00a8ff" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#24242c" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" stroke="#8b8b98" fontSize={9} tickLine={false} axisLine={false} minTickGap={16}/><YAxis stroke="#8b8b98" fontSize={10} tickLine={false} axisLine={false} width={48}/><Tooltip contentStyle={{ background: '#17171c', border: '1px solid #24242c', borderRadius: 12, fontSize: 11 }}/><Area type="monotone" dataKey="sales" stroke="#00a8ff" strokeWidth={2} fill="url(#analyticsSales)" name={txt('Sales after product discounts (₪)', 'المبيعات بعد خصم المنتجات (₪)', 'מכירות לאחר הנחות מוצרים (₪)')}/></AreaChart></ResponsiveContainer></div></section>
      <section className="rounded-2xl border border-line bg-panel p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-[12px] font-bold text-white"><BarChart3 size={15} className="text-violet-accent"/>{txt('Sales breakdown', 'تفصيل المبيعات', 'פילוח מכירות')}</h2><select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="h-8 rounded-lg border border-line bg-panel2 px-2 text-[10px] text-white"><option value="category">{txt('By category', 'حسب الفئة', 'לפי קטגוריה')}</option><option value="product">{txt('By product', 'حسب المنتج', 'לפי מוצר')}</option><option value="brand">{txt('By brand', 'حسب الماركة', 'לפי מותג')}</option></select></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.groupBars} margin={{ top: 5, right: 6, bottom: 35, left: -12 }}><CartesianGrid stroke="#24242c" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" stroke="#8b8b98" fontSize={9} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end"/><YAxis stroke="#8b8b98" fontSize={10} tickLine={false} axisLine={false} width={48}/><Tooltip contentStyle={{ background: '#17171c', border: '1px solid #24242c', borderRadius: 12, fontSize: 11 }}/><Bar dataKey="sales" fill="#8b5cf6" radius={[5, 5, 0, 0]} name={txt('Sales (₪)', 'المبيعات (₪)', 'מכירות (₪)')}/></BarChart></ResponsiveContainer></div></section>
    </div>
    <div className="rounded-2xl border border-line bg-panel p-4"><h2 className="mb-2 flex items-center gap-2 text-[12px] font-bold text-white"><Package size={15} className="text-electric"/>{txt('Report detail', 'تفاصيل التقرير', 'פרטי הדוח')}</h2>{report.lines.length === 0 ? <p className="py-6 text-center text-[11px] text-mute">{txt('No matching order items in this date range.', 'لا توجد بنود طلبات مطابقة ضمن هذه الفترة.', 'אין פריטי הזמנה תואמים בטווח התאריכים הזה.')}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[10.5px]"><thead className="text-mute"><tr><th className="p-2 text-start">{txt('Order', 'الطلب', 'הזמנה')}</th><th className="p-2 text-start">{txt('Product', 'المنتج', 'מוצר')}</th><th className="p-2 text-start">{txt('Category', 'الفئة', 'קטגוריה')}</th><th className="p-2 text-end">{txt('Qty', 'الكمية', 'כמות')}</th><th className="p-2 text-end">{txt('Sales', 'المبيعات', 'מכירות')}</th><th className="p-2 text-end">{txt('Cost', 'التكلفة', 'עלות')}</th><th className="p-2 text-end">{txt('Est. profit', 'الربح التقديري', 'רווח משוער')}</th></tr></thead><tbody className="divide-y divide-line">{report.lines.slice(0, 150).map((line, i) => <tr key={`${line.orderNumber}-${line.item.productId}-${i}`} className="text-white/85"><td className="p-2 font-mono text-electric">{line.orderNumber}</td><td className="p-2">{line.productName}</td><td className="p-2">{(() => { const category = db.categories.find((c) => c.id === line.categoryId); return category ? (ar ? category.nameAr : he ? (category.nameHe || category.nameEn) : category.nameEn) : '—'; })()}</td><td className="p-2 text-end">{line.item.qty}</td><td className="p-2 text-end">{fmtPrice(line.revenue - line.discountShare, lang)}</td><td className="p-2 text-end">{line.cost === undefined ? '—' : fmtPrice(line.cost, lang)}</td><td className="p-2 text-end">{line.cost === undefined ? '—' : fmtPrice(line.revenue - line.discountShare - line.cost, lang)}</td></tr>)}</tbody></table>{report.lines.length > 150 && <p className="mt-2 text-[10px] text-mute">{txt('Showing first 150 lines. Use filters to narrow the report.', 'يتم عرض أول 150 بنداً. استخدم الفلاتر لتضييق التقرير.', 'מוצגות 150 השורות הראשונות. השתמשו במסננים לצמצום הדוח.')}</p>}</div>}</div>
  </div>;
}
