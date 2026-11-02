import { createContext } from 'react';
import type { Db, CartLine } from './types';
import type { Lang, TKey } from './i18n';
import type { CustomerAuth, CustomerProfile } from './cloud';

export interface Toast { id: number; kind: 'success' | 'error' | 'info'; text: string }

export interface AppCtx {
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

export const Ctx = createContext<AppCtx | null>(null);

