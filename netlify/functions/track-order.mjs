const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
const trimSlash = (value = '') => value.replace(/\/$/, '');
const safeText = (value, max = 250) => String(value ?? '').trim().slice(0, max);
const safeUrl = (value) => {
  const url = safeText(value, 1000);
  return /^https?:\/\//i.test(url) ? url : '';
};
const phoneKey = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  // Allows the same Palestinian/Israeli mobile number written with or without its country prefix.
  return digits.length >= 9 ? digits.slice(-9) : '';
};
const allowedStatuses = new Set(['new', 'confirmed', 'shipped', 'delivered', 'cancelled']);

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const orderNumber = safeText(body?.orderNumber, 30).toUpperCase();
  const phone = phoneKey(body?.phone);
  if (!/^BG#\d{1,18}$/.test(orderNumber) || !phone) return json({ error: 'Order number or phone does not match an order.' }, 400);

  const SUPABASE_URL = trimSlash(process.env.SUPABASE_URL || '');
  const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const legacyJwt = !process.env.SUPABASE_SECRET_KEY && SERVICE_KEY.startsWith('eyJ');
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Order tracking is not configured yet. Please contact the store.' }, 503);

  const headers = { apikey: SERVICE_KEY, ...(legacyJwt ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}), 'content-type': 'application/json' };
  try {
    const url = `${SUPABASE_URL}/rest/v1/blitz_orders?number=eq.${encodeURIComponent(orderNumber)}&select=number,payload,created_at&limit=1`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Supabase lookup failed (${response.status}).`);
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const order = row?.payload;
    // Order numbers are sequential, so require the phone entered at checkout before returning details.
    // Keep the error identical whether the code is unknown or the phone is incorrect.
    if (!order || row.number !== orderNumber || phoneKey(order.phone) !== phone) {
      return json({ error: 'Order number or phone does not match an order.' }, 404);
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory
      .filter((entry) => allowedStatuses.has(entry?.status) && entry?.at)
      .map((entry) => ({ status: entry.status, at: safeText(entry.at, 40) })).slice(-20) : [];
    const status = allowedStatuses.has(order.status) ? order.status : 'new';
    const tracked = {
      number: orderNumber,
      createdAt: safeText(order.createdAt || row.created_at, 40),
      status,
      statusUpdatedAt: safeText(order.statusUpdatedAt, 40) || undefined,
      statusHistory: history,
      areaName: safeText(order.areaName || order.area, 100),
      area: safeText(order.area, 80),
      city: safeText(order.city, 120),
      items: (Array.isArray(order.items) ? order.items : []).slice(0, 100).map((item) => ({
        name: safeText(item?.name || item?.sku || 'Product', 180),
        sku: safeText(item?.sku, 80),
        variantLabel: safeText(item?.variantLabel, 120) || undefined,
        qty: Math.max(0, Math.min(10000, Number(item?.qty) || 0)),
      })),
      total: Math.max(0, Number(order.total) || 0),
      carrierName: safeText(order.carrierName, 100) || undefined,
      trackingUrl: safeUrl(order.trackingUrl) || undefined,
      deliveryPersonName: safeText(order.deliveryPersonName, 100) || undefined,
      deliveryPersonPhone: safeText(order.deliveryPersonPhone, 40) || undefined,
      trackingMessage: safeText(order.trackingMessage, 600) || undefined,
    };
    return json({ order: tracked });
  } catch (error) {
    console.error('Public order tracking lookup failed:', error);
    return json({ error: 'Tracking is temporarily unavailable. Please try again or contact the store.' }, 502);
  }
};
