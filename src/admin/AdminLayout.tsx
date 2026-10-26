// BLITZ GAMING — admin layout: session guard, role permissions, sidebar
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, Tag, Boxes, ShoppingBag, Users, TicketPercent,
  FileSpreadsheet, Home, FileText, Truck, Settings, ShieldCheck, LogOut, ExternalLink, Menu, X, Zap, Cloud, AlertTriangle, SlidersHorizontal, BarChart3, Sun, Moon, Languages, Type, Palette, CalendarClock, Flame,
} from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { getAdminSession, adminLogout, type AdminSession } from '../lib/db';
import { FlashIcon } from '../components/Logo';
import { cloudConfigured } from '../lib/cloud';
import type { Lang } from '../lib/i18n';
import { OrderNotificationWatcher } from './OrderNotificationWatcher';

export type AdminPerm = 'owner' | 'manager' | 'staff';

const NAV: { to: string; en: string; ar: string; he: string; icon: typeof LayoutDashboard; minRole: AdminPerm }[] = [
  { to: '/admin', en: 'Overview', ar: 'نظرة عامة', he: 'סקירה', icon: LayoutDashboard, minRole: 'staff' },
  { to: '/admin/products', en: 'Products', ar: 'المنتجات', he: 'מוצרים', icon: Package, minRole: 'staff' },
  { to: '/admin/build-setup', en: 'Build Your Setup', ar: 'إعداد التجميعة', he: 'בונה הסטאפ', icon: SlidersHorizontal, minRole: 'manager' },
  { to: '/admin/analytics', en: 'Sales Analytics', ar: 'تحليلات المبيعات', he: 'ניתוח מכירות', icon: BarChart3, minRole: 'manager' },
  { to: '/admin/categories', en: 'Categories', ar: 'الفئات', he: 'קטגוריות', icon: FolderTree, minRole: 'manager' },
  { to: '/admin/brands', en: 'Brands', ar: 'الماركات', he: 'מותגים', icon: Tag, minRole: 'staff' },
  { to: '/admin/inventory', en: 'Inventory', ar: 'المخزون', he: 'מלאי', icon: Boxes, minRole: 'staff' },
  { to: '/admin/orders', en: 'Orders', ar: 'الطلبات', he: 'הזמנות', icon: ShoppingBag, minRole: 'staff' },
  { to: '/admin/customers', en: 'Customers', ar: 'الزبائن', he: 'לקוחות', icon: Users, minRole: 'manager' },
  { to: '/admin/coupons', en: 'Coupons', ar: 'أكواد الخصم', he: 'קופונים', icon: TicketPercent, minRole: 'manager' },
  { to: '/admin/csv', en: 'CSV Import/Export', ar: 'استيراد/تصدير CSV', he: 'ייבוא/ייצוא CSV', icon: FileSpreadsheet, minRole: 'manager' },
  { to: '/admin/homepage', en: 'Homepage/Content', ar: 'الصفحة الرئيسية', he: 'דף הבית ותוכן', icon: Home, minRole: 'manager' },
  { to: '/admin/offers', en: 'Offers Manager', ar: 'إدارة العروض', he: 'ניהול מבצעים', icon: Flame, minRole: 'manager' },
  { to: '/admin/campaigns', en: 'Seasonal Campaigns', ar: 'الحملات والمفاجآت', he: 'קמפיינים עונתיים', icon: CalendarClock, minRole: 'manager' },
  { to: '/admin/appearance', en: 'Interface Appearance', ar: 'تخصيص الواجهة', he: 'עיצוב הממשק', icon: Palette, minRole: 'owner' },
  { to: '/admin/storefront-text', en: 'Storefront Text', ar: 'نصوص المتجر', he: 'טקסטים בחנות', icon: Type, minRole: 'manager' },
  { to: '/admin/pages', en: 'Pages', ar: 'الصفحات', he: 'עמודים', icon: FileText, minRole: 'manager' },
  { to: '/admin/delivery', en: 'Delivery Settings', ar: 'إعدادات التوصيل', he: 'הגדרות משלוח', icon: Truck, minRole: 'owner' },
  { to: '/admin/settings', en: 'Store Settings', ar: 'إعدادات المتجر', he: 'הגדרות חנות', icon: Settings, minRole: 'owner' },
  { to: '/admin/users', en: 'Admin Users', ar: 'مستخدمو الإدارة', he: 'משתמשי מנהל', icon: ShieldCheck, minRole: 'owner' },
];

const RANK: Record<AdminPerm, number> = { staff: 1, manager: 2, owner: 3 };

export function roleLabel(role: string, ar: boolean, he = false) {
  const m: Record<string, { en: string; ar: string; he: string }> = {
    owner: { en: 'Owner', ar: 'مالك', he: 'בעלים' },
    manager: { en: 'Manager', ar: 'مدير', he: 'מנהל' },
    staff: { en: 'Staff', ar: 'موظف', he: 'צוות' },
  };
  return ar ? m[role]?.ar ?? role : he ? m[role]?.he ?? role : m[role]?.en ?? role;
}

export function AdminLayout() {
  const { lang, setLang, db, setDb, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const txt = (en: string, arText: string, heText: string) => ar ? arText : he ? heText : en;
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<AdminSession | null>(() => getAdminSession());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!session) navigate('/admin/login', { replace: true, state: { from: location.pathname } });
  }, [session, navigate, location.pathname]);

  useEffect(() => {
    const refreshSession = () => setSession(getAdminSession());
    window.addEventListener('blitz-admin-session-updated', refreshSession);
    return () => window.removeEventListener('blitz-admin-session-updated', refreshSession);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (!session) return null;

  const role = session.role as AdminPerm;
  const allowed = NAV.filter((n) => RANK[role] >= RANK[n.minRole]);
  // enforce role on the current route too
  const current = NAV.find((n) => n.to === location.pathname);
  const forbidden = current && RANK[role] < RANK[current.minRole];

  const logout = () => { adminLogout(); setSession(null); toast('info', ar ? 'تم تسجيل الخروج' : 'Signed out'); navigate('/admin/login'); };

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* brand */}
      <div className="flex h-16 items-center gap-2 border-b border-line px-4">
        <FlashIcon size={32} />
        <div className="leading-tight">
          <span className="font-display text-base font-bold tracking-wide text-white">BLITZ<span className="text-electric"> ADMIN</span></span>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-mute">{ar ? 'لوحة التحكم' : 'Control Panel'}</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="ms-auto rounded-lg p-2 text-mute lg:hidden"><X size={20} /></button>
      </div>

      {/* session identity */}
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-electric to-violet-accent font-display text-sm font-bold text-white">{session.name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-white/90">{session.name}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-electric">@{session.username} · {roleLabel(role, ar, he)}</p>
          </div>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {allowed.map(({ to, en, ar: arLabel, he: heLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors ${isActive ? 'bg-electric/15 text-electric shadow-[inset_0_0_0_1px_rgba(0,168,255,.35)]' : 'text-white/70 hover:bg-panel2 hover:text-white'}`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {ar ? arLabel : he ? heLabel : en}
          </NavLink>
        ))}
      </nav>

      {/* footer actions */}
      <div className="border-t border-line p-3">
        <Link to="/" target="_blank" className="mb-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-white/70 hover:bg-panel2 hover:text-electric">
          <ExternalLink size={17} />{ar ? 'فتح المتجر' : 'View Storefront'}<Zap size={12} className="ms-auto text-electric" />
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-red-400 hover:bg-red-500/10">
          <LogOut size={17} />{ar ? 'تسجيل الخروج' : 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink" dir={ar || he ? 'rtl' : 'ltr'}>
      <OrderNotificationWatcher enabled={db.store.browserOrderNotificationsEnabled === true} sound={db.store.browserOrderNotificationSound !== false} />
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-e border-line bg-panel lg:block">{sidebar}</aside>

      {/* mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className={`absolute inset-y-0 ${ar || he ? 'right-0' : 'left-0'} w-64 border-e border-line bg-panel`}>{sidebar}</aside>
        </div>
      )}

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-ink/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-white/85 hover:bg-panel2" aria-label="Menu"><Menu size={20} /></button>
          <span className="font-display text-sm font-bold text-white">BLITZ <span className="text-electric">ADMIN</span></span>
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-2.5 text-[10px] font-bold text-mute"><Languages size={14}/><select aria-label="Admin language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="bg-transparent text-[11px] text-current outline-none"><option value="ar">العربية</option><option value="en">English</option><option value="he">עברית</option></select></label>
            <button type="button" onClick={() => setDb((d) => ({ ...d, store: { ...d.store, theme: d.store.theme === 'day' ? 'night' : 'day' } }))} className="flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-[10px] font-bold text-mute hover:border-electric hover:text-electric">{db.store.theme === 'day' ? <Moon size={14}/> : <Sun size={14} />}{db.store.theme === 'day' ? txt('Switch to Night', 'التبديل إلى الوضع الليلي', 'מעבר למצב לילה') : txt('Switch to Day', 'التبديل إلى الوضع النهاري', 'מעבר למצב יום')}</button>
          </div>
          <div className={`mb-5 flex items-start gap-3 rounded-xl border p-3 ${cloudConfigured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-400/35 bg-amber-400/5'}`} role="status">
            {cloudConfigured ? <Cloud size={18} className="mt-0.5 shrink-0 text-emerald-400"/> : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300"/>}
            <div>
              <p className={`text-[11px] font-bold ${cloudConfigured ? 'text-emerald-300' : 'text-amber-200'}`}>{cloudConfigured ? txt('Cloud mode is enabled', 'وضع التخزين السحابي مفعّل', 'מצב ענן מופעל') : txt('LOCAL DEMO MODE — NOT SHARED BETWEEN DEVICES', 'وضع تجريبي محلي — التعديلات لا تتزامن بين الأجهزة', 'מצב הדגמה מקומי — שינויים אינם מסתנכרנים בין מכשירים')}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-mute">{cloudConfigured ? txt('Ensure the Supabase schema, admin role and Storage policies in the Vercel/Supabase setup guide are configured. Shared edits sync through the database, not through your domain.', 'تأكد من إعداد مخطط Supabase وصلاحية المدير وسياسات التخزين الموضحة في دليل إعداد Vercel/Supabase. المزامنة تتم عبر قاعدة البيانات وليس الدومين.', 'יש לוודא שהסכימה, תפקיד המנהל ומדיניות האחסון ב-Supabase הוגדרו לפי SUPABASE_VERCEL_SETUP_GUIDE.md. הסנכרון מתבצע דרך מסד הנתונים, לא דרך הדומיין.') : txt('Edits are saved only in this browser. To sync products, prices, orders, logo and delivery settings across all devices, configure Supabase and the Vercel environment variables before taking real orders.', 'التعديلات تُحفظ في هذا المتصفح فقط. لمزامنة المنتجات والأسعار والطلبات والشعار ورسوم التوصيل بين جميع الأجهزة، أعدّ Supabase ومتغيرات Vercel قبل استقبال طلبات حقيقية.', 'השינויים נשמרים בדפדפן הזה בלבד. כדי לסנכרן מוצרים, מחירים, הזמנות, לוגו ודמי משלוח בין מכשירים, יש להגדיר Supabase ומשתני Vercel לפני קבלת הזמנות אמיתיות.')}</p>
            </div>
          </div>
          {forbidden ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
              <ShieldCheck size={40} className="mx-auto text-red-400" />
              <h1 className="mt-3 font-display text-xl font-bold text-white">{ar ? 'صلاحية غير كافية' : 'Insufficient permissions'}</h1>
              <p className="mt-1 text-[12px] text-mute">{ar ? 'هذه الصفحة تتطلب صلاحية أعلى. تواصل مع المالك.' : 'This page requires a higher role. Contact the store owner.'}</p>
            </div>
          ) : (
            <Outlet context={{ role, session }} />
          )}
        </main>
      </div>
    </div>
  );
}
