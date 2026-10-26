import type { Db, Order } from './types';

const env = import.meta.env as Record<string, string | undefined>;
const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_PUBLIC_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '';
export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);
const CUSTOMER_KEY = 'blitz_customer_auth_v1';
const ADMIN_KEY = 'blitz_admin_session_v1';

export interface CustomerAuth {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user: { id: string; email?: string; phone?: string; user_metadata?: Record<string, unknown>; app_metadata?: { role?: string; roles?: string[] } };
}
export interface CustomerProfile { user_id: string; points: number; wishlist: string[]; updated_at?: string; display_name?: string; email?: string; phone?: string; highlighted?: boolean; blocked?: boolean; admin_note?: string; discount_percent?: number; account_message?: string }
export interface ManagedCustomer {
  user_id: string; email: string; phone: string; display_name: string; created_at: string; last_sign_in_at: string | null;
  email_confirmed: boolean; phone_confirmed: boolean; points: number; wishlist: string[]; highlighted: boolean; blocked: boolean;
  admin_note: string; discount_percent: number; account_message: string;
  order_count: number; lifetime_value: number; last_order_at: string | null;
}
export interface ManagedCustomerUpdate {
  points?: number; highlighted?: boolean; blocked?: boolean; admin_note?: string; account_message?: string;
  display_name?: string; discount_percent?: number; email?: string; phone?: string;
}
export interface CloudOrderResult { order: Order; pointsEarned: number; pointsBalance: number }

export function readCustomerAuth(): CustomerAuth | null {
  try { const s = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? 'null') as CustomerAuth | null; if (s?.access_token && s.user?.id) return s; } catch { /* ignore */ }
  return null;
}
export function saveCustomerAuth(auth: CustomerAuth | null): void {
  try {
    if (auth) {
      const normalized = { ...auth, expires_at: auth.expires_at ?? Math.floor(Date.now() / 1000) + (auth.expires_in ?? 3600) };
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(normalized));
    } else localStorage.removeItem(CUSTOMER_KEY);
  } catch { /* storage may be disabled */ }
}
export function readAdminAccessToken(): string | null {
  try { const s = JSON.parse(sessionStorage.getItem(ADMIN_KEY) ?? 'null'); return typeof s?.accessToken === 'string' ? s.accessToken : null; } catch { return null; }
}
export function cloudIsAdminSession(): boolean { return Boolean(readAdminAccessToken()); }

function headers(token?: string, prefer?: string): HeadersInit {
  const result: Record<string, string> = { apikey: SUPABASE_PUBLIC_KEY, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) };
  // New sb_publishable_* keys are not JWTs and must not be sent as Authorization Bearer.
  // Keep the legacy anon JWT behavior for existing deployments.
  if (token) result.Authorization = `Bearer ${token}`;
  else if (SUPABASE_PUBLIC_KEY.startsWith('eyJ')) result.Authorization = `Bearer ${SUPABASE_PUBLIC_KEY}`;
  return result;
}
async function refreshTokenIfNeeded(token?: string): Promise<string | undefined> {
  if (!token || !cloudConfigured) return token;
  const now = Math.floor(Date.now() / 1000) + 60;
  const customer = readCustomerAuth();
  const adminRaw = (() => { try { return JSON.parse(sessionStorage.getItem(ADMIN_KEY) ?? 'null') as { accessToken?: string; refreshToken?: string; tokenExpiresAt?: number; exp?: number } | null; } catch { return null; } })();
  const isCustomer = Boolean(customer?.access_token === token && customer.refresh_token && (customer.expires_at ?? 0) <= now);
  const isAdmin = Boolean(adminRaw?.accessToken === token && adminRaw.refreshToken && (adminRaw.tokenExpiresAt ?? 0) <= now);
  if (!isCustomer && !isAdmin) return token;
  const refreshToken = isCustomer ? customer!.refresh_token! : adminRaw!.refreshToken!;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const text = await response.text();
  const result = text ? JSON.parse(text) as CustomerAuth & { expires_in?: number } : null;
  if (!response.ok || !result?.access_token) {
    if (isCustomer) saveCustomerAuth(null);
    if (isAdmin) { try { sessionStorage.removeItem(ADMIN_KEY); } catch { /* */ } }
    throw new Error('Your session expired. Please sign in again.');
  }
  const expiresAt = result.expires_at ?? Math.floor(Date.now() / 1000) + (result.expires_in ?? 3600);
  if (isCustomer) saveCustomerAuth({ ...result, expires_at: expiresAt });
  if (isAdmin) {
    try { sessionStorage.setItem(ADMIN_KEY, JSON.stringify({ ...adminRaw, accessToken: result.access_token, refreshToken: result.refresh_token ?? refreshToken, tokenExpiresAt: expiresAt })); } catch { /* */ }
  }
  return result.access_token;
}

async function supabase<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!cloudConfigured) throw new Error('Cloud storage is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your Vercel project environment variables (legacy VITE_SUPABASE_ANON_KEY is also supported).');
  const validToken = await refreshTokenIfNeeded(token);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...headers(validToken, (init.headers as Record<string, string> | undefined)?.Prefer), ...(init.headers ?? {}) } });
  const text = await response.text();
  const value = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    const message = typeof value === 'object' && value ? ((value as { msg?: string; message?: string; error_description?: string }).msg || (value as { message?: string }).message || (value as { error_description?: string }).error_description) : undefined;
    throw new Error(message || `Cloud request failed (${response.status}).`);
  }
  return value as T;
}

export async function sendCustomerOtp(identifierRaw: string, method: 'email' | 'phone'): Promise<void> {
  const identifier = identifierRaw.trim();
  if (method === 'email') {
    await supabase('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email: identifier, create_user: true, gotrue_meta_security: {} }) });
  } else {
    await supabase('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ phone: identifier, create_user: true, gotrue_meta_security: {} }) });
  }
}
export async function verifyCustomerOtp(identifierRaw: string, token: string, method: 'email' | 'phone'): Promise<CustomerAuth> {
  const identifier = identifierRaw.trim();
  const body = method === 'email' ? { email: identifier, token: token.trim(), type: 'email' } : { phone: identifier, token: token.trim(), type: 'sms' };
  const result = await supabase<CustomerAuth>('/auth/v1/verify', { method: 'POST', body: JSON.stringify(body) });
  saveCustomerAuth(result);
  await ensureCustomerProfile(result.access_token, result.user.id);
  return result;
}
export async function updateCloudAdminAccount(fullName: string, newPassword?: string): Promise<void> {
  const token = readAdminAccessToken();
  if (!token) throw new Error('Administrator session expired. Please sign in again.');
  const body: Record<string, unknown> = { data: { full_name: fullName.trim() } };
  if (newPassword) body.password = newPassword;
  await supabase('/auth/v1/user', { method: 'PUT', body: JSON.stringify(body) }, token);
  try {
    const raw = JSON.parse(sessionStorage.getItem(ADMIN_KEY) ?? 'null') as Record<string, unknown> | null;
    if (raw) sessionStorage.setItem(ADMIN_KEY, JSON.stringify({ ...raw, name: fullName.trim() }));
  } catch { /* session metadata is refreshed on next sign-in */ }
}

export async function cloudAdminPasswordLogin(email: string, password: string): Promise<{ user: CustomerAuth['user']; accessToken: string; refreshToken?: string; tokenExpiresAt: number }> {
  const result = await supabase<CustomerAuth>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
  const role = (result.user as CustomerAuth['user'] & { app_metadata?: { role?: string; roles?: string[] } }).app_metadata;
  if (role?.role !== 'admin' && !role?.roles?.includes('admin')) throw new Error('This account is not assigned the store-admin role.');
  return { user: result.user, accessToken: result.access_token, refreshToken: result.refresh_token, tokenExpiresAt: result.expires_at ?? Math.floor(Date.now() / 1000) + (result.expires_in ?? 3600) };
}
async function adminCustomerRequest<T>(method: 'GET' | 'PATCH' | 'DELETE' | 'POST', body?: Record<string, unknown>, userId?: string): Promise<T> {
  const stored = readAdminAccessToken();
  if (!stored) throw new Error('Sign in as an administrator to manage customers.');
  const token = await refreshTokenIfNeeded(stored);
  const requestBody = { ...(body || {}), ...(userId ? { userId } : {}) };
  const response = await fetch('/api/admin-customers', {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method !== 'GET' ? { body: JSON.stringify(requestBody) } : {}),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || `Customer management request failed (${response.status}).`);
  return payload;
}
export async function fetchManagedCustomers(): Promise<ManagedCustomer[]> {
  const result = await adminCustomerRequest<{ customers?: ManagedCustomer[] }>('GET');
  return result.customers ?? [];
}
export async function updateManagedCustomer(userId: string, updates: ManagedCustomerUpdate): Promise<void> {
  await adminCustomerRequest('PATCH', { action: 'update', ...updates }, userId);
}
export async function deleteManagedCustomer(userId: string): Promise<void> {
  await adminCustomerRequest('DELETE', undefined, userId);
}
export async function sendManagedCustomerMessage(userId: string, subject: string, message: string): Promise<void> {
  await adminCustomerRequest('POST', { action: 'message', subject, message }, userId);
}

export async function ensureCustomerProfile(token?: string, userId?: string): Promise<CustomerProfile | null> {
  const auth = readCustomerAuth();
  const accessToken = token || auth?.access_token;
  const id = userId || auth?.user.id;
  if (!accessToken || !id || !cloudConfigured) return null;
  const rows = await supabase<CustomerProfile[]>(`/rest/v1/blitz_customer_profiles?user_id=eq.${encodeURIComponent(id)}&select=*`, {}, accessToken);
  if (rows[0]) return rows[0];
  const profile = { user_id: id, wishlist: [] as string[] };
  const result = await supabase<CustomerProfile[]>('/rest/v1/blitz_customer_profiles', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(profile) }, accessToken);
  return result[0] ?? { ...profile };
}
export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  const auth = readCustomerAuth();
  if (!auth || !cloudConfigured) return null;
  return ensureCustomerProfile(auth.access_token, auth.user.id);
}
export async function saveCustomerWishlist(wishlist: string[]): Promise<void> {
  const auth = readCustomerAuth();
  if (!auth || !cloudConfigured) return;
  await supabase('/rest/v1/blitz_customer_profiles?user_id=eq.' + encodeURIComponent(auth.user.id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ wishlist, updated_at: new Date().toISOString() }) }, auth.access_token);
}
export async function signOutCustomer(): Promise<void> {
  const auth = readCustomerAuth();
  if (auth && cloudConfigured) { try { await supabase('/auth/v1/logout', { method: 'POST' }, auth.access_token); } catch { /* local sign-out always works */ } }
  saveCustomerAuth(null);
}

function publicState(db: Db): Partial<Db> {
  const { orders: _orders, admins: _admins, couponUses: _couponUses, ...data } = db;
  // Acquisition costs are confidential and must never be included in the publicly readable store JSON.
  return { ...data, products: db.products.map(({ costPrice: _costPrice, ...product }) => product) } as Partial<Db>;
}

/** Fetch confidential acquisition costs separately; RLS limits this table to administrators. */
export async function fetchPrivateProductCosts(accessToken: string): Promise<Record<string, number | null>> {
  if (!cloudConfigured) return {};
  const rows = await supabase<{ product_id: string; cost_price: number | null }[]>('/rest/v1/blitz_product_costs?select=product_id,cost_price', {}, accessToken);
  return Object.fromEntries(rows.map((row) => [row.product_id, row.cost_price === null ? null : Number(row.cost_price)]));
}

async function syncPrivateProductCosts(db: Db, accessToken: string): Promise<void> {
  if (!cloudConfigured || db.products.length === 0) return;
  const rows = db.products.map((p) => ({ product_id: p.id, cost_price: p.costPrice ?? null, updated_at: new Date().toISOString() }));
  await supabase('/rest/v1/blitz_product_costs?on_conflict=product_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) }, accessToken);
}
export async function pullSharedStore(): Promise<Partial<Db> | null> {
  if (!cloudConfigured) return null;
  const rows = await supabase<{ data: Partial<Db> }[]>(`/rest/v1/blitz_store_state?id=eq.main&select=data`);
  return rows[0]?.data ?? null;
}
let storeWriteQueue: Promise<void> = Promise.resolve();
export async function pushSharedStore(db: Db, accessToken?: string | null): Promise<void> {
  if (!cloudConfigured || !accessToken) return;
  const snapshot = publicState(db);
  const token = accessToken;
  storeWriteQueue = storeWriteQueue.catch(() => undefined).then(async () => {
    await supabase('/rest/v1/blitz_store_state?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: 'main', data: snapshot, updated_at: new Date().toISOString() }) }, token);
    await syncPrivateProductCosts(db, token);
  });
  await storeWriteQueue;
}
function withoutPrivateCosts(order: Order): Order {
  return { ...order, items: (order.items ?? []).map((item) => {
    const { unitCost: _privateUnitCost, ...publicItem } = item;
    return publicItem;
  }) };
}

async function attachPrivateOrderCosts(orders: Order[], accessToken: string): Promise<Order[]> {
  if (!orders.length || !cloudConfigured) return orders.map(withoutPrivateCosts);
  const numbers = [...new Set(orders.map((o) => o.number).filter(Boolean))];
  if (!numbers.length) return orders.map(withoutPrivateCosts);
  // The private table has admin-only RLS. Costs are fetched separately from public order payloads.
  const costs = new Map<string, number>();
  try {
    // Keep query URLs short enough for browsers/proxies even when the store has many orders.
    for (let start = 0; start < numbers.length; start += 40) {
      const batch = numbers.slice(start, start + 40);
      const inFilter = `in.(${batch.map((n) => `"${n.replaceAll('\"', '\\"')}"`).join(',')})`;
      const rows = await supabase<{ order_number: string; product_id: string; variant_id: string; unit_cost: number | string }[]>(
        `/rest/v1/blitz_order_item_costs?order_number=${encodeURIComponent(inFilter)}&select=order_number,product_id,variant_id,unit_cost`,
        {}, accessToken,
      );
      for (const row of rows) costs.set(`${row.order_number}|${row.product_id}|${row.variant_id || ''}`, Number(row.unit_cost));
    }
  } catch (error) {
    // Don't hide order history if the private-cost migration hasn't been run yet; profit analytics will simply lack cost snapshots.
    console.warn('Private order cost snapshots unavailable. Run the latest Supabase schema to enable profit analytics.', error);
    return orders.map(withoutPrivateCosts);
  }
  return orders.map((order) => ({
    ...order,
    items: (order.items ?? []).map((item) => {
      const { unitCost: _oldPrivateUnitCost, ...safeItem } = item;
      const key = `${order.number}|${item.productId}|${item.variantId || ''}`;
      const unitCost = costs.get(key);
      return unitCost !== undefined && Number.isFinite(unitCost) ? { ...safeItem, unitCost } : safeItem;
    }),
  }));
}

export async function fetchCloudOrders(accessToken: string, admin = false): Promise<Order[]> {
  if (!cloudConfigured) return [];
  const query = admin ? '?select=payload&order=created_at.desc' : `?user_id=eq.${encodeURIComponent(readCustomerAuth()?.user.id ?? '')}&select=payload&order=created_at.desc`;
  const rows = await supabase<{ payload: Order }[]>(`/rest/v1/blitz_orders${query}`, {}, accessToken);
  const orders = rows.map((r) => r.payload).filter(Boolean);
  return admin ? attachPrivateOrderCosts(orders, accessToken) : orders.map(withoutPrivateCosts);
}

export async function fetchCloudOrderByNumber(number: string, accessToken: string): Promise<Order | null> {
  if (!cloudConfigured || !number) return null;
  const rows = await supabase<{ payload: Order }[]>(`/rest/v1/blitz_orders?number=eq.${encodeURIComponent(number)}&select=payload&limit=1`, {}, accessToken);
  return rows[0]?.payload ? withoutPrivateCosts(rows[0].payload) : null;
}
export async function updateCloudOrderStatus(number: string, status: Order['status']): Promise<Order> {
  const token = readAdminAccessToken();
  if (!token) throw new Error('Sign in as an administrator to update orders.');
  const payload = await supabase<Order>('/rest/v1/rpc/blitz_admin_update_order', {
    method: 'POST', body: JSON.stringify({ p_number: number, p_status: status }),
  }, token);
  return withoutPrivateCosts(payload);
}

export type CloudDeliveryUpdate = Pick<Order, 'carrierName' | 'trackingUrl' | 'deliveryPersonName' | 'deliveryPersonPhone' | 'trackingMessage'>;
export async function updateCloudOrderDelivery(number: string, delivery: CloudDeliveryUpdate): Promise<Order> {
  const token = readAdminAccessToken();
  if (!token) throw new Error('Sign in as an administrator to update delivery tracking.');
  const payload = await supabase<Order>('/rest/v1/rpc/blitz_admin_update_order_delivery', {
    method: 'POST', body: JSON.stringify({ p_number: number, p_delivery: delivery }),
  }, token);
  return withoutPrivateCosts(payload);
}

export async function createCloudOrder(order: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>): Promise<CloudOrderResult> {
  const auth = readCustomerAuth();
  const token = auth?.access_token;
  // Never send admin-only acquisition costs in the customer's checkout request.
  const safeOrder = { ...order, items: (order.items ?? []).map(({ unitCost: _privateUnitCost, ...item }) => item) };
  const result = await supabase<CloudOrderResult>('/rest/v1/rpc/blitz_create_order', { method: 'POST', body: JSON.stringify({ p_order: safeOrder, p_points_to_spend: 0 }) }, token);
  return result;
}

export async function markCloudOrderPaid(number: string): Promise<Order> {
  const token = readAdminAccessToken();
  if (!token) throw new Error('Sign in as an administrator to confirm a bank transfer.');
  const payload = await supabase<Order>('/rest/v1/rpc/blitz_admin_mark_order_paid', { method: 'POST', body: JSON.stringify({ p_number: number }) }, token);
  return withoutPrivateCosts(payload);
}

export async function cancelCloudUnpaidOrder(number: string, reason = 'Cancelled by administrator'): Promise<Order> {
  const token = readAdminAccessToken();
  if (!token) throw new Error('Sign in as an administrator to cancel an unpaid online order.');
  const payload = await supabase<Order>('/rest/v1/rpc/blitz_cancel_unpaid_order', { method: 'POST', body: JSON.stringify({ p_number: number, p_reason: reason }) }, token);
  return withoutPrivateCosts(payload);
}

/** Starts a hosted Lahza card checkout for an already-created cloud order. No card data touches the store. */
export async function startCardPayment(orderNumber: string, phone: string): Promise<{ authorizationUrl: string }> {
  const response = await fetch('/api/create-card-payment', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, phone }),
  });
  const result = await response.json().catch(() => ({})) as { error?: string; authorizationUrl?: string };
  if (!response.ok || !result.authorizationUrl) throw new Error(result.error || 'Could not start secure card payment.');
  return { authorizationUrl: result.authorizationUrl };
}

export interface PublicPaymentOrderStatus {
  number: string;
  payment: Order['payment'];
  paymentStatus?: Order['paymentStatus'];
  paymentReference?: string;
  paymentPaidAt?: string;
  status: Order['status'];
  total: number;
  loyaltyPointsEarned?: number;
}
export async function fetchPublicPaymentOrder(number: string, phone: string): Promise<PublicPaymentOrderStatus | null> {
  const response = await fetch('/api/payment-order-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber: number, phone }) });
  const data = await response.json().catch(() => ({})) as { order?: PublicPaymentOrderStatus; error?: string };
  if (!response.ok) throw new Error(data.error || 'Could not refresh payment status.');
  return data.order ?? null;
}

export async function fetchPaymentCapabilities(): Promise<{ cardReady: boolean; provider?: string; mode?: 'test' | 'live' }> {
  const response = await fetch('/api/payment-capabilities', { headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => ({})) as { cardReady?: boolean; provider?: string; mode?: 'test' | 'live'; error?: string };
  if (!response.ok) return { cardReady: false };
  return { cardReady: Boolean(data.cardReady), provider: data.provider, mode: data.mode };
}

export async function uploadImageFile(file: File): Promise<string> {
  if (!cloudConfigured) throw new Error('Cloud storage is not configured.');
  const storedToken = readAdminAccessToken();
  if (!storedToken) throw new Error('Sign in as an administrator before uploading files.');
  const token = await refreshTokenIfNeeded(storedToken);
  if (!token) throw new Error('Administrator session expired. Please sign in again.');
  const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-90) || 'image.webp';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${path}`, {
    method: 'POST', headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'image/webp', 'x-upsert': 'false', 'cache-control': '31536000' }, body: file,
  });
  if (!response.ok) { const detail = await response.text(); throw new Error(detail || `Image upload failed (${response.status}). Create the product-images bucket and its admin upload policy.`); }
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}
export function cloudAuthEnabled(): boolean { return cloudConfigured; }
