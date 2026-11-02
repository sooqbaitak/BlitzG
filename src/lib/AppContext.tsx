// BLITZ GAMING — global app context
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Db, CartLine } from './types';
import { loadDb, saveDb, loadCart, saveCart, loadWishlist, saveWishlist, loadCompare, saveCompare } from './db';
import type { Lang, TKey } from './i18n';
import { t as tfn, dirOf } from './i18n';
import { cloudConfigured, pullSharedStore, pushSharedStore, fetchPrivateProductCosts, readAdminAccessToken, readCustomerAuth, sendCustomerOtp, verifyCustomerOtp, getCustomerProfile, saveCustomerWishlist, signOutCustomer, fetchCloudOrders, type CustomerAuth, type CustomerProfile } from './cloud';
import { getAdminSession } from './db';
import { Ctx, type AppCtx, type Toast } from './appContextCore';

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<Db>(() => loadDb());
  const [customerThemePreference, setCustomerThemePreference] = useState<'night' | 'day'>(() => { try { return localStorage.getItem('blitz_customer_theme') === 'day' ? 'day' : 'night'; } catch { return 'night'; } });
  const storefrontTheme: 'night' | 'day' = db.store.allowCustomerThemeToggle === false ? (db.store.theme === 'day' ? 'day' : 'night') : customerThemePreference;
  const toggleStorefrontTheme = useCallback(() => { setCustomerThemePreference((current) => { const next = current === 'day' ? 'night' : 'day'; try { localStorage.setItem('blitz_customer_theme', next); } catch { /* ignore */ } return next; }); }, []);
  const dbRef = useRef(db);
  const cloudPushTimerRef = useRef<number | undefined>(undefined);
  const pendingCloudPushRef = useRef<{ snapshot: Db; token: string } | null>(null);
  const cloudPushInFlightRef = useRef(false);
  const cloudPushRetryCountRef = useRef(0);
  const flushCloudPush = useCallback(async (): Promise<void> => {
    if (cloudPushInFlightRef.current || !pendingCloudPushRef.current) return;
    const pending = pendingCloudPushRef.current;
    pendingCloudPushRef.current = null;
    cloudPushInFlightRef.current = true;
    try {
      await pushSharedStore(pending.snapshot, pending.token);
      cloudPushRetryCountRef.current = 0;
    } catch (e) {
      console.error('Could not sync store changes to cloud:', e);
      // Keep the failed snapshot unless a newer edit has already replaced it.
      // Retry transient network/backend failures with a capped backoff while the app stays open.
      if (!pendingCloudPushRef.current) pendingCloudPushRef.current = pending;
      cloudPushRetryCountRef.current = Math.min(cloudPushRetryCountRef.current + 1, 6);
    } finally {
      cloudPushInFlightRef.current = false;
      if (pendingCloudPushRef.current) {
        if (cloudPushTimerRef.current) window.clearTimeout(cloudPushTimerRef.current);
        const retryingFailedSnapshot = pendingCloudPushRef.current === pending;
        const delay = retryingFailedSnapshot
          ? Math.min(1000 * (2 ** Math.max(0, cloudPushRetryCountRef.current - 1)), 30000)
          : 350;
        cloudPushTimerRef.current = window.setTimeout(() => { void flushCloudPush(); }, delay);
      }
    }
  }, []);
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('blitz_lang');
      return saved === 'en' || saved === 'he' || saved === 'ar' ? saved : 'ar';
    } catch {
      return 'ar';
    }
  });
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
    if (adminToken && cloudConfigured) {
      // Admin controls often save on every keystroke. Coalesce edits so the
      // latest full snapshot is sent after the user pauses typing.
      pendingCloudPushRef.current = { snapshot: next, token: adminToken };
      cloudPushRetryCountRef.current = 0;
      if (cloudPushTimerRef.current) window.clearTimeout(cloudPushTimerRef.current);
      cloudPushTimerRef.current = window.setTimeout(() => { void flushCloudPush(); }, 650);
    }
  }, [flushCloudPush]);

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

  useEffect(() => {
    const visibility = db.store.languageVisibility;
    const isVisible = (value: Lang) => visibility?.[value] !== false;
    if (isVisible(lang)) return;
    const fallback: Lang = (['ar', 'en', 'he'] as Lang[]).find(isVisible) ?? 'en';
    setLangState(fallback);
    try { localStorage.setItem('blitz_lang', fallback); } catch { /* ignore */ }
  }, [db.store.languageVisibility, lang]);

  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => { saveWishlist(wishlist); }, [wishlist]);
  useEffect(() => { saveCompare(compare); }, [compare]);

  useEffect(() => () => {
    if (cloudPushTimerRef.current) window.clearTimeout(cloudPushTimerRef.current);
  }, []);

  useEffect(() => {
    if (!cloudConfigured) return;
    let active = true;
    let inFlight = false;
    let timer: number | undefined;
    let failures = 0;
    const baseDelay = (getAdminSession()?.accessToken ?? readAdminAccessToken()) ? 25000 : 90000;

    const sync = async () => {
      if (!active || inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
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
        failures = 0;
      } catch (e) {
        failures = Math.min(failures + 1, 4);
        console.warn('Shared store sync unavailable:', e);
      } finally {
        inFlight = false;
        if (active) {
          const delay = Math.min(baseDelay * (2 ** failures), 300000);
          timer = window.setTimeout(() => { void sync(); }, delay);
        }
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !inFlight) {
        if (timer) window.clearTimeout(timer);
        void sync();
      }
    };
    void sync();
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; if (timer) window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
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

