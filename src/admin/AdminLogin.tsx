// BLITZ GAMING — demo admin login (client-side; requires a server-backed auth system for production)
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockKeyhole, User, LogIn, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { adminLogin, saveAdminSession } from '../lib/db';
import { cloudConfigured, cloudAdminPasswordLogin, pullSharedStore, pushSharedStore, fetchCloudOrders } from '../lib/cloud';
import { FlashIcon } from '../components/Logo';

export function AdminLogin() {
  const { db, lang, setDb } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    // With cloud mode enabled, authenticate against Supabase and require an explicit admin role.
    await new Promise((r) => setTimeout(r, 150));
    try {
      if (cloudConfigured) {
        const login = await cloudAdminPasswordLogin(username, password);
        const session = { adminId: login.user.id, role: 'owner', name: String(login.user.user_metadata?.full_name || login.user.email || username), username: login.user.email || username, exp: Date.now() + 8 * 60 * 60 * 1000, accessToken: login.accessToken, refreshToken: login.refreshToken, tokenExpiresAt: login.tokenExpiresAt };
        saveAdminSession(session);
        const remote = await pullSharedStore();
        if (remote && Array.isArray(remote.products) && Array.isArray(remote.categories)) {
          // Use the shared database snapshot before enabling edits. Otherwise a stale device-local copy could overwrite the store.
          setDb((current) => ({ ...current, ...remote, orders: current.orders, admins: current.admins } as typeof current));
        } else {
          await pushSharedStore(db, login.accessToken);
        }
        const orders = await fetchCloudOrders(login.accessToken, true).catch(() => []);
        setDb((current) => ({ ...current, orders: [...orders, ...current.orders.filter((old) => !orders.some((o) => o.number === old.number))] }));
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
      } else {
        const session = await adminLogin(db, username, password);
        if (session) {
          const from = (location.state as { from?: string } | null)?.from;
          navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
        } else throw new Error('Invalid username or password');
      }
    } catch (e) {
      setAttempts((a) => a + 1);
      setError(e instanceof Error ? e.message : (ar ? 'بيانات الدخول غير صحيحة' : 'Unable to sign in'));
      setLoading(false);
    }
  };

  return (
    <div dir={ar || he ? 'rtl' : 'ltr'} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4">
      {/* ambient background */}
      <div className="pointer-events-none absolute -top-32 start-1/4 h-96 w-96 rounded-full bg-electric/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 end-1/4 h-96 w-96 rounded-full bg-violet-accent/10 blur-[140px]" />
      <img src="/img/hero.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/80 to-ink" />

      <motion.form
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onSubmit={submit}
        className="relative w-full max-w-md rounded-3xl border border-line bg-panel/90 p-7 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-9"
      >
        <div className="flex flex-col items-center text-center">
          <FlashIcon size={56} />
          <h1 className="mt-3 font-display text-2xl font-bold uppercase tracking-wide text-white">BLITZ <span className="text-electric">ADMIN</span></h1>
          <p className="mt-1 text-[11px] font-semibold text-mute">{ar ? 'لوحة تحكم المتجر — للموظفين المصرّح لهم فقط' : he ? 'לוח החנות — למורשים בלבד' : 'Store control panel — authorized personnel only'}</p>
        </div>

        {error && (
          <div role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400">
            <AlertCircle size={17} className="shrink-0" />{error}
            {attempts >= 3 && <span className="ms-auto text-[9px] text-mute">{ar ? 'محاولات كثيرة' : he ? 'ניסיונות רבים' : 'too many attempts'}</span>}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{cloudConfigured ? (ar ? 'البريد الإلكتروني للإدارة' : he ? 'דוא״ל מנהל' : 'Admin email') : (ar ? 'اسم المستخدم' : he ? 'שם משתמש' : 'Username')}</span>
            <div className="relative">
              <User size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="h-12 w-full rounded-xl border border-line bg-panel2 ps-11 pe-4 text-sm font-semibold text-white placeholder-mute outline-none transition-colors focus:border-electric"
                placeholder={cloudConfigured ? "admin@example.com" : "admin"}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{ar ? 'كلمة المرور' : he ? 'סיסמה' : 'Password'}</span>
            <div className="relative">
              <LockKeyhole size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-12 w-full rounded-xl border border-line bg-panel2 ps-11 pe-12 text-sm font-semibold text-white placeholder-mute outline-none transition-colors focus:border-electric"
                placeholder="••••••••••"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-white" aria-label={show ? 'Hide' : 'Show'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        </div>

        {!cloudConfigured && <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-100/80"><strong className="block text-amber-200">{ar ? 'وضع تجريبي محلي' : he ? 'מצב הדגמה מקומי' : 'Local demo mode'}</strong>{ar ? 'لا تستخدم بيانات الدخول التجريبية في الموقع العام. التغييرات تُحفظ في هذا المتصفح فقط. أعدّ Supabase ومتغيرات Vercel قبل استقبال طلبات حقيقية.' : he ? 'אין להשתמש בכניסת ההדגמה באתר ציבורי. השינויים נשמרים בדפדפן זה בלבד. יש להגדיר Supabase ומשתני Vercel לפני קבלת הזמנות.' : 'Do not use demo login on a public store. Edits are saved only in this browser. Configure Supabase and Vercel environment variables before taking real orders.'}</div>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-electric font-display text-base font-bold uppercase tracking-wider text-ink transition-all hover:bg-[#33baff] disabled:opacity-60"
        >
          <LogIn size={19} strokeWidth={2.4} />{loading ? (ar ? 'جاري التحقق…' : he ? 'מאמת…' : 'Verifying…') : (ar ? 'تسجيل الدخول' : he ? 'התחברות' : 'Sign In')}
        </button>

        <div className="mt-5 flex items-center justify-center gap-2 border-t border-line pt-4 text-[10px] font-semibold text-mute">
          <ShieldCheck size={13} className="text-emerald-400" />
          {ar ? 'تنتهي الجلسة تلقائياً بعد 8 ساعات' : he ? 'ההתחברות מסתיימת אוטומטית לאחר 8 שעות' : 'Session expires automatically after 8 hours'}
        </div>
        <Link to="/" className="mt-3 block text-center text-[11px] font-bold text-electric hover:text-white">{ar ? '← العودة إلى المتجر' : he ? '← חזרה לחנות' : '← Back to storefront'}</Link>
      </motion.form>
    </div>
  );
}
