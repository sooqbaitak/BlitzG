// ─────────────────────────────────────────────────────────────────────────────
// BLITZ GAMING — demo persistence layer. Uses browser localStorage only;
// this is not a server/database and must be replaced before production orders.
// ─────────────────────────────────────────────────────────────────────────────
import { seedDb } from './data';
import type { Db, CartLine, Order, Product, Coupon, DeliveryArea } from './types';
import { categoryTreeIds } from './categories';

const DB_KEY = 'blitz_db_v2';
const LEGACY_DB_KEY = 'blitz_db_v1';
const CART_KEY = 'blitz_cart_v1';
const WISH_KEY = 'blitz_wishlist_v1';
const COMPARE_KEY = 'blitz_compare_v1';
const SEQ_KEY = 'blitz_order_seq_v1';

// ── storage helpers ─────────────────────────────────────────────────────────
export function loadDb(): Db {
  const seeded = seedDb();
  try {
    const currentRaw = localStorage.getItem(DB_KEY);
    if (currentRaw) {
      const saved = JSON.parse(currentRaw) as Partial<Db>;
      return {
        ...seeded,
        ...saved,
        store: { ...seeded.store, ...(saved.store ?? {}) },
        delivery: { ...seeded.delivery, ...(saved.delivery ?? {}) },
      } as Db;
    }

    // One-time migration from the original demo key. Preserve locally edited
    // catalog/orders, but correct the store contact links and delivery message.
    const legacyRaw = localStorage.getItem(LEGACY_DB_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Partial<Db>;
      const oldStore = legacy.store ?? {} as Db['store'];
      const store = {
        ...seeded.store,
        ...oldStore,
        whatsapp: seeded.store.whatsapp,
        phone: seeded.store.phone,
        email: seeded.store.email,
        facebook: seeded.store.facebook,
        instagram: seeded.store.instagram,
        addressEn: seeded.store.addressEn,
        addressAr: seeded.store.addressAr,
        hoursEn: seeded.store.hoursEn,
        hoursAr: seeded.store.hoursAr,
        announcementEn: seeded.store.announcementEn,
        announcementAr: seeded.store.announcementAr,
      };
      const sampleCodes = new Set(['BLITZ10', 'FREEDEL', 'WELCOME50', 'GEAR20']);
      const coupons = (legacy.coupons ?? seeded.coupons).map((coupon) => {
        if (!sampleCodes.has(coupon.code.toUpperCase())) return coupon;
        const safeDefault = seeded.coupons.find((item) => item.code === coupon.code.toUpperCase());
        return safeDefault ? { ...safeDefault } : coupon;
      });
      const migrated = {
        ...seeded,
        ...legacy,
        store,
        delivery: { ...seeded.delivery, ...(legacy.delivery ?? {}) },
        coupons,
      } as Db;
      saveDb(migrated);
      return migrated;
    }
  } catch { /* corrupted storage → initialize a clean demo database */ }
  try { localStorage.setItem(DB_KEY, JSON.stringify(seeded)); } catch { /* quota */ }
  return seeded;
}

export function saveDb(db: Db): void {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* quota */ }
}

export function loadCart(): CartLine[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]'); } catch { return []; }
}
export function saveCart(lines: CartLine[]): void {
  try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* */ }
}
export function loadWishlist(): string[] {
  try { return JSON.parse(localStorage.getItem(WISH_KEY) ?? '[]'); } catch { return []; }
}
export function saveWishlist(ids: string[]): void {
  try { localStorage.setItem(WISH_KEY, JSON.stringify(ids)); } catch { /* */ }
}
export function loadCompare(): string[] {
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY) ?? '[]'); } catch { return []; }
}
export function saveCompare(ids: string[]): void {
  try { localStorage.setItem(COMPARE_KEY, JSON.stringify(ids)); } catch { /* */ }
}

// ── pricing ─────────────────────────────────────────────────────────────────
export function unitPrice(p: Product, variantId?: string | null): number {
  const base = p.salePrice ?? p.price;
  const v = p.variants.find((x) => x.id === variantId);
  return Math.max(0, base + (v?.priceDelta ?? 0));
}

/** price for a product line — clamped ≥ 0 always */
export function lineTotal(p: Product, variantId: string | null, qty: number): number {
  return Math.max(0, unitPrice(p, variantId) * qty);
}

// ── coupon engine (single source of truth, used by checkout UI & admin) ─────
export interface CouponContext {
  productSubtotal: number;               // subtotal of ELIGIBLE product lines
  fullSubtotal: number;                  // subtotal of all lines
  eligibleSubtotal: number;              // what the code applies to
  deliveryFee: number;                   // fee for selected area
  phone: string;                         // customer phone (per-customer limit)
  items: { productId: string; categoryId: string; categoryIds?: string[]; qty: number; unitPrice: number }[];
}

export interface CouponResult {
  ok: boolean;
  error?: 'not_found' | 'inactive' | 'not_started' | 'expired' | 'exhausted' | 'min_subtotal' | 'ineligible' | 'per_customer';
  coupon?: Coupon;
  discount: number;                      // product discount (clamped)
  deliveryDiscount: number;              // delivery fee discount (clamped)
  eligibleSubtotal: number;
}

export function validateCoupon(
  db: Db,
  rawCode: string,
  ctx: CouponContext
): CouponResult {
  const coupon = db.coupons.find(
    (c) => c.code.trim().toUpperCase() === rawCode.trim().toUpperCase()
  );
  const fail = (error: CouponResult['error']): CouponResult => ({
    ok: false, error, discount: 0, deliveryDiscount: 0, eligibleSubtotal: 0,
  });
  if (!coupon) return fail('not_found');
  if (!coupon.active) return fail('inactive');
  const now = new Date();
  const start = new Date(coupon.startsAt + 'T00:00:00');
  const end = new Date(coupon.expiresAt + 'T23:59:59');
  if (now < start) return fail('not_started');
  if (now > end) return fail('expired');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return fail('exhausted');
  if (ctx.fullSubtotal < coupon.minSubtotal) return fail('min_subtotal');

  // per-customer limit
  if (coupon.perCustomerLimit !== null && ctx.phone.trim()) {
    const uses = db.couponUses.filter((u) => u.couponId === coupon.id && u.phone === ctx.phone.trim()).length;
    if (uses >= coupon.perCustomerLimit) return fail('per_customer');
  }

  // compute eligible subtotal
  const targetsAll = coupon.productIds.length === 0 && coupon.categoryIds.length === 0;
  const eligibleCategoryIds = new Set(coupon.categoryIds.flatMap((id) => categoryTreeIds(db.categories, id)));
  const eligibleSubtotal = targetsAll
    ? ctx.fullSubtotal
    : ctx.items
        .filter((i) => coupon.productIds.includes(i.productId) || [i.categoryId, ...(i.categoryIds ?? [])].some((id) => eligibleCategoryIds.has(id)))
        .reduce((s, i) => s + i.unitPrice * i.qty, 0);

  if (coupon.target === 'products' && eligibleSubtotal <= 0) return fail('ineligible');

  let discount = 0;
  let deliveryDiscount = 0;
  if (coupon.target === 'delivery') {
    // free delivery / fixed amount off the fee — never below zero
    deliveryDiscount = coupon.type === 'percent'
      ? Math.min(ctx.deliveryFee, Math.round((ctx.deliveryFee * coupon.value) / 100 * 100) / 100)
      : Math.min(ctx.deliveryFee, coupon.value === 0 ? ctx.deliveryFee : coupon.value);
  } else {
    discount = coupon.type === 'percent'
      ? Math.min(eligibleSubtotal, Math.round((eligibleSubtotal * coupon.value) / 100 * 100) / 100)
      : Math.min(eligibleSubtotal, coupon.value);
  }

  return { ok: true, coupon, discount: Math.max(0, discount), deliveryDiscount: Math.max(0, deliveryDiscount), eligibleSubtotal };
}

// ── order placement ─────────────────────────────────────────────────────────
export function nextOrderNumber(existingOrders: Order[] = []): string {
  let storedSeq = 1000;
  try { storedSeq = parseInt(localStorage.getItem(SEQ_KEY) ?? '1000', 10) || 1000; } catch { /* */ }
  // In local demo mode, prevent collisions with numbers already saved in this browser.
  // True cross-device global uniqueness is provided by the Supabase sequence in cloud mode.
  const historicalMax = existingOrders.reduce((max, order) => {
    const match = /^BG#(\d+)$/.exec(order.number);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 1000);
  const num = Math.max(storedSeq, historicalMax) + 1;
  try { localStorage.setItem(SEQ_KEY, String(num)); } catch { /* */ }
  return `BG#${num}`;
}

/** Pure order placement: returns { order, nextDb } — never mutates input. */
export function placeOrder(
  db: Db,
  draft: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>,
  phoneForCoupon?: string
): { order: Order; nextDb: Db } {
  const order: Order = {
    ...draft,
    id: `o-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    number: nextOrderNumber(db.orders),
    createdAt: new Date().toISOString(),
    status: 'new',
    statusUpdatedAt: new Date().toISOString(),
    statusHistory: [{ status: 'new', at: new Date().toISOString() }],
    payment: draft.payment,
    paymentStatus: draft.paymentStatus ?? (draft.payment === 'cod' ? 'pay_on_delivery' : draft.payment === 'bank_transfer' ? 'awaiting_transfer' : 'awaiting_payment'),
  };

  // stock decrement + coupon usage — all in fresh copies
  const products = db.products.map((prod) => {
    const lines = order.items.filter((i) => i.productId === prod.id);
    if (lines.length === 0) return prod;
    const variants = prod.variants.map((v) => {
      const line = lines.find((i) => i.variantLabel === v.label);
      return line ? { ...v, stock: Math.max(0, v.stock - line.qty) } : v;
    });
    const totalQty = lines.reduce((s, i) => s + i.qty, 0);
    return { ...prod, variants, stock: Math.max(0, prod.stock - totalQty), sold: prod.sold + totalQty };
  });

  let coupons = db.coupons;
  let couponUses = db.couponUses;
  if (order.couponCode) {
    const code = order.couponCode.toUpperCase();
    coupons = db.coupons.map((c) => (c.code.toUpperCase() === code ? { ...c, usedCount: c.usedCount + 1 } : c));
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === code);
    if (coupon) {
      couponUses = [...db.couponUses, { couponId: coupon.id, phone: phoneForCoupon ?? order.phone, at: order.createdAt }];
    }
  }

  const nextDb: Db = { ...db, orders: [order, ...db.orders], products, coupons, couponUses };
  saveDb(nextDb);
  return { order, nextDb };
}

// ── demo-only admin auth (client-side hash comparison; not production security)
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_KEY = 'blitz_admin_session_v1';
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8h

export interface AdminSession { adminId: string; role: string; name: string; username: string; exp: number; accessToken?: string; refreshToken?: string; tokenExpiresAt?: number }

export async function adminLogin(db: Db, username: string, password: string): Promise<AdminSession | null> {
  const admin = db.admins.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (!admin || !admin.active) return null;
  const hash = await sha256(password);
  if (hash !== admin.passwordHash) return null;
  const session: AdminSession = { adminId: admin.id, role: admin.role, name: admin.name, username: admin.username, exp: Date.now() + SESSION_TTL };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* */ }
  return session;
}


export function saveAdminSession(session: AdminSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('blitz-admin-session-updated'));
  } catch { /* session storage may be unavailable */ }
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AdminSession;
    if (Date.now() > s.exp) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}

export function adminLogout(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ }
}

// ── delivery areas ──────────────────────────────────────────────────────────
export const AREAS: { id: DeliveryArea; feeKey: 'westbank' | 'jerusalem' | 'inside48' }[] = [
  { id: 'westbank', feeKey: 'westbank' },
  { id: 'jerusalem', feeKey: 'jerusalem' },
  { id: 'inside48', feeKey: 'inside48' },
];

export function deliveryFeeFor(db: Db, area: DeliveryArea): number {
  if (area === 'westbank') return db.delivery.westbank;
  if (area === 'jerusalem') return db.delivery.jerusalem;
  if (area === 'inside48') return db.delivery.inside48;
  return db.delivery.additionalAreas?.find((a) => a.id === area && a.active)?.fee ?? 0;
}

export function deliveryAreaNameFor(db: Db, area: DeliveryArea, lang: 'en' | 'ar' | 'he' = 'en'): string {
  const fixed: Record<string, { en: string; ar: string; he: string }> = {
    westbank: { en: 'West Bank', ar: 'الضفة الغربية', he: 'הגדה המערבית' },
    jerusalem: { en: 'Jerusalem', ar: 'القدس', he: 'ירושלים' },
    inside48: { en: '1948 Areas', ar: 'أراضي ١٩٤٨', he: 'אזורי 1948' },
  };
  if (fixed[area]) return fixed[area][lang];
  const custom = db.delivery.additionalAreas?.find((a) => a.id === area);
  return custom ? (lang === 'ar' ? custom.nameAr : lang === 'he' ? (custom.nameHe || custom.nameEn) : custom.nameEn) : area;
}

// ── CSV helpers ─────────────────────────────────────────────────────────────
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.length > 1 || cur[0] !== '') rows.push(cur);
      cur = [];
    } else field += ch;
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
