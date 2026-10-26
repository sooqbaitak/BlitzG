// BLITZ GAMING — global app context
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Db, CartLine } from './types';
import { loadDb, saveDb, loadCart, saveCart, loadWishlist, saveWishlist, loadCompare, saveCompare } from './db';
import type { Lang } from './i18n';
import type { TKey } from './i18n';
import { t as tfn, dirOf } from './i18n';
import { cloudConfigured, pullSharedStore, pushSharedStore, fetchPrivateProductCosts, readAdminAccessToken, readCustomerAuth, sendCustomerOtp, verifyCustomerOtp, getCustomerProfile, saveCustomerWishlist, signOutCustomer, fetchCloudOrders, type CustomerAuth, type CustomerProfile } from './cloud';
import { getAdminSession } from './db';

export interface Toast { id: number; kind: 'success' | 'error' | 'info'; text: string }

interface AppCtx {
  db: Db;
  setDb: (updater: (db: Db) => Db) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: 'rtl' | 'ltr';
  t: (k: TKey) => string;
  cart: CartLine[];
  cartCount: number;
  addToCart: (productId: string, variantId: string | null, qty?: number) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  removeFromCart: (productId: string, variantId: string | null) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  compare: string[];
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  toasts: Toast[];
  toast: (kind: Toast['kind'], text: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  customer: CustomerAuth | null;
  customerProfile: CustomerProfile | null;
  requestCustomerOtp: (identifier: string, method: 'email' | 'phone') => Promise<void>;
  verifyCustomerOtp: (identifier: string, code: string, method: 'email' | 'phone') => Promise<void>;
  signOutCustomer: () => Promise<void>;
  refreshCustomerProfile: () => Promise<void>;
  storefrontTheme: 'night' | 'day';
  toggleStorefrontTheme: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<Db>(() => loadDb());
  const [customerThemePreference, setCustomerThemePreference] = useState<'night' | 'day'>(() => { try { return localStorage.getItem('blitz_customer_theme') === 'day' ? 'day' : 'night'; } catch { return 'night'; } });
  const storefrontTheme: 'night' | 'day' = db.store.allowCustomerThemeToggle === false ? (db.store.theme === 'day' ? 'day' : 'night') : customerThemePreference;
  const toggleStorefrontTheme = useCallback(() => { setCustomerThemePreference((current) => { const next = current === 'day' ? 'night' : 'day'; try { localStorage.setItem('blitz_customer_theme', next); } catch { /* ignore */ } return next; }); }, []);
  const dbRef = useRef(db);
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('blitz_lang') as Lang) || 'ar');
  const [cart, setCart] = useState<CartLine[]>(() => loadCart());
  const [wishlist, setWishlist] = useState<string[]>(() => loadWishlist());
  const [compare, setCompare] = useState<string[]>(() => loadCompare());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerAuth | null>(() => readCustomerAuth());
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);

  // Apply database updates synchronously to a ref as well as React state. This
  // keeps sequential admin imports/actions consistent and lets import reports
  // return their final row counts instead of racing a deferred state updater.
  const setDb = useCallback((updater: (db: Db) => Db) => {
    const next = updater(dbRef.current);
    dbRef.current = next;
    saveDb(next);
    setDbState(next);
    const adminToken = getAdminSession()?.accessToken ?? readAdminAccessToken();
    if (adminToken && cloudConfigured) void pushSharedStore(next, adminToken).catch((e) => console.error('Could not sync store changes to cloud:', e));
  }, []);

  const refreshCustomerProfile = useCallback(async () => {
    try {
      const profile = await getCustomerProfile();
      setCustomerProfile(profile);
      if (profile) setWishlist(profile.wishlist ?? []);
    } catch (e) { console.error('Customer profile could not be loaded:', e); }
  }, []);

  const requestCustomerOtp = useCallback(async (identifier: string, method: 'email' | 'phone') => {
    await sendCustomerOtp(identifier, method);
  }, []);

  const verifyOtp = useCallback(async (identifier: string, code: string, method: 'email' | 'phone') => {
    const auth = await verifyCustomerOtp(identifier, code, method);
    setCustomer(auth);
    const profile = await getCustomerProfile();
    setCustomerProfile(profile);
    if (profile) setWishlist(profile.wishlist ?? []);
  }, []);

  const logoutCustomer = useCallback(async () => {
    await signOutCustomer();
    setCustomer(null);
    setCustomerProfile(null);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('blitz_lang', l); } catch { /* */ }
  }, []);

  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => { saveWishlist(wishlist); }, [wishlist]);
  useEffect(() => { saveCompare(compare); }, [compare]);

  useEffect(() => {
    if (!cloudConfigured) return;
    let active = true;
    const sync = async () => {
      try {
        const remote = await pullSharedStore();
        if (!active || !remote || !Array.isArray(remote.products) || !Array.isArray(remote.categories)) return;
        const adminToken = getAdminSession()?.accessToken ?? readAdminAccessToken();
        let remoteWithCosts = remote;
        if (adminToken) {
          try {
            const costs = await fetchPrivateProductCosts(adminToken);
            remoteWithCosts = { ...remote, products: remote.products.map((product) => ({ ...product, costPrice: Object.prototype.hasOwnProperty.call(costs, product.id) ? costs[product.id] ?? undefined : undefined })) };
          } catch (e) { console.warn('Private product cost data could not be loaded:', e); }
        }
        setDbState((current) => {
          const merged = { ...current, ...remoteWithCosts, orders: current.orders, admins: current.admins } as Db;
          dbRef.current = merged;
          saveDb(merged);
          return merged;
        });
        if (adminToken) {
          try {
            const remoteOrders = await fetchCloudOrders(adminToken, true);
            if (active && remoteOrders.length) setDbState((current) => {
              const merged = { ...current, orders: [...remoteOrders, ...current.orders.filter((o) => !remoteOrders.some((r) => r.number === o.number))] };
              dbRef.current = merged; saveDb(merged); return merged;
            });
          } catch (e) { console.warn('Order history sync unavailable:', e); }
        }
      } catch (e) { console.warn('Shared store sync unavailable:', e); }
    };
    void sync();
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void sync(); }, 20000);
    const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => { if (customer) void refreshCustomerProfile(); }, [customer, refreshCustomerProfile]);

  const dir: 'rtl' | 'ltr' = dirOf(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = storefrontTheme;
    const appearance = db.store.appearance;
    const vars: Record<string, string> = {
      '--color-electric': appearance?.accent || '#00a8ff',
      '--color-electric-dim': appearance?.accentHover || '#0088d4',
      '--color-violet-accent': appearance?.secondaryAccent || '#8b5cf6',
      '--color-ink': storefrontTheme === 'day' ? (appearance?.background && appearance.background !== '#0a0a0c' ? appearance.background : '#f4f7fb') : (appearance?.background || '#0a0a0c'),
      '--color-panel': storefrontTheme === 'day' ? (appearance?.panel && appearance.panel !== '#111114' ? appearance.panel : '#ffffff') : (appearance?.panel || '#111114'),
      '--color-panel2': storefrontTheme === 'day' ? (appearance?.panelAlt && appearance.panelAlt !== '#17171c' ? appearance.panelAlt : '#eef2f7') : (appearance?.panelAlt || '#17171c'),
      '--color-line': storefrontTheme === 'day' ? (appearance?.border && appearance.border !== '#24242c' ? appearance.border : '#d7deea') : (appearance?.border || '#24242c'),
      '--color-mute': appearance?.muted || (storefrontTheme === 'day' ? '#596579' : '#8b8b98'),
      '--font-body': appearance?.bodyFont || "'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif",
      '--font-display': appearance?.displayFont || "'Rajdhani', 'Cairo', system-ui, sans-serif",
      '--blitz-text': appearance?.text || (storefrontTheme === 'day' ? '#182334' : '#f4f4f6'),
    };
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    root.dataset.radius = appearance?.radius || 'rounded';
    root.dataset.textScale = appearance?.textScale || 'standard';
    root.dataset.headerStyle = appearance?.headerStyle || 'solid';
    root.dataset.cardStyle = appearance?.cardStyle || 'glow';
    root.dataset.buttonStyle = appearance?.buttonStyle || 'solid';
  }, [db.store.appearance, storefrontTheme]);

  const t = useCallback((k: TKey) => {
    const override = db.store.uiTextOverrides?.[k]?.[lang];
    return override && override.trim() ? override : tfn(lang, k);
  }, [lang, db.store.uiTextOverrides]);

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, kind, text }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3400);
  }, []);

  const addToCart = useCallback((productId: string, variantId: string | null, qty = 1) => {
    setCart((c) => {
      const i = c.findIndex((l) => l.productId === productId && l.variantId === variantId);
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...c, { productId, variantId, qty }];
    });
  }, []);

  const setQty = useCallback((productId: string, variantId: string | null, qty: number) => {
    setCart((c) => qty <= 0 ? c.filter((l) => !(l.productId === productId && l.variantId === variantId)) : c.map((l) => l.productId === productId && l.variantId === variantId ? { ...l, qty } : l));
  }, []);

  const removeFromCart = useCallback((productId: string, variantId: string | null) => {
    setCart((c) => c.filter((l) => !(l.productId === productId && l.variantId === variantId)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((w) => {
      const next = w.includes(productId) ? w.filter((x) => x !== productId) : [...w, productId];
      if (customer) void saveCustomerWishlist(next).catch((e) => console.error('Wishlist sync failed:', e));
      return next;
    });
  }, [customer]);

  const toggleCompare = useCallback((productId: string) => {
    setCompare((c) => {
      if (c.includes(productId)) return c.filter((x) => x !== productId);
      if (c.length >= 3) return [...c.slice(1), productId];
      return [...c, productId];
    });
  }, []);

  const clearCompare = useCallback(() => setCompare([]), []);

  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  const value: AppCtx = {
    db, setDb, lang, setLang, dir, t,
    cart, cartCount, addToCart, setQty, removeFromCart, clearCart,
    wishlist, toggleWishlist, compare, toggleCompare, clearCompare,
    toasts, toast, drawerOpen, setDrawerOpen,
    customer, customerProfile, requestCustomerOtp, verifyCustomerOtp: verifyOtp, signOutCustomer: logoutCustomer, refreshCustomerProfile, storefrontTheme, toggleStorefrontTheme,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
