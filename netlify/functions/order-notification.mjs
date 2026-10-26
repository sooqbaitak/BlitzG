const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const trimSlash = (s = '') => s.replace(/\/$/, '');

function renderTemplate(template, values) {
  return String(template || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key) => String(values[key.toLowerCase()] ?? '—'));
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const SUPABASE_URL = trimSlash(process.env.SUPABASE_URL || '');
  const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const USING_LEGACY_SERVICE_ROLE_JWT = !process.env.SUPABASE_SECRET_KEY && SERVICE_KEY.startsWith('eyJ');
  const RESEND_KEY = process.env.RESEND_API_KEY || '';
  const EMAIL_FROM = process.env.ORDER_EMAIL_FROM || '';
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY || !EMAIL_FROM) {
    return json({ error: 'Order email is not configured. Set SUPABASE_URL, SUPABASE_SECRET_KEY (preferred) or legacy SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY and ORDER_EMAIL_FROM in your hosting environment.' }, 503);
  }

  let orderNumber = '';
  try { orderNumber = String((await request.json()).orderNumber || '').trim(); } catch { return json({ error: 'Invalid JSON request.' }, 400); }
  if (!/^BG#\d{1,18}$/.test(orderNumber)) return json({ error: 'Invalid order number.' }, 400);

  const sbHeaders = { apikey: SERVICE_KEY, ...(USING_LEGACY_SERVICE_ROLE_JWT ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}), 'content-type': 'application/json' };
  const sbRequest = async (path, init = {}) => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...sbHeaders, ...(init.headers || {}) } });
    const raw = await response.text();
    const data = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : null;
    if (!response.ok) throw new Error(typeof data === 'object' && data ? data.message || data.details || `Supabase request failed (${response.status})` : String(data || `Supabase request failed (${response.status})`));
    return data;
  };

  try {
    const orders = await sbRequest(`blitz_orders?number=eq.${encodeURIComponent(orderNumber)}&select=number,payload&limit=1`);
    const row = Array.isArray(orders) ? orders[0] : null;
    if (!row?.payload || row.number !== orderNumber) return json({ error: 'Saved order was not found. The notification was not sent.' }, 404);
    const order = row.payload;

    const stateRows = await sbRequest('blitz_store_state?id=eq.main&select=data&limit=1');
    const store = Array.isArray(stateRows) ? stateRows[0]?.data?.store || {} : {};
    const to = String(store.orderNotificationEmail || store.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'Set a valid order notification email in Admin → Store Settings.' }, 400);

    // A unique order_number claim prevents duplicate emails if a visitor retries the endpoint.
    const existingRows = await sbRequest(`blitz_order_email_notifications?order_number=eq.${encodeURIComponent(orderNumber)}&select=status,updated_at&limit=1`);
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;
    const recent = existing?.updated_at && (Date.now() - new Date(existing.updated_at).getTime() < 10 * 60 * 1000);
    if (existing && (existing.status === 'sent' || (existing.status === 'sending' && recent))) return json({ ok: true, duplicate: true });

    const now = new Date().toISOString();
    if (existing) {
      await sbRequest(`blitz_order_email_notifications?order_number=eq.${encodeURIComponent(orderNumber)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'sending', updated_at: now, error: null }) });
    } else {
      const inserted = await sbRequest('blitz_order_email_notifications', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ order_number: orderNumber, status: 'sending', created_at: now, updated_at: now }) });
      if (!Array.isArray(inserted) || !inserted.length) return json({ ok: true, duplicate: true });
    }

    const items = Array.isArray(order.items) ? order.items.map((item) => `• ${item.name || item.sku || 'Product'}${item.variantLabel ? ` (${item.variantLabel})` : ''} × ${item.qty} — ₪${(Number(item.unitPrice) || 0) * (Number(item.qty) || 0)}`).join('\n') : '—';
    const values = {
      order_number: order.number || orderNumber,
      created_at: order.createdAt || now,
      customer_name: order.customerName || '—',
      phone: order.phone || '—',
      email: order.email || '—',
      delivery_area: order.areaName || order.area || '—',
      city: order.city || '—',
      address: order.address || '—',
      items,
      subtotal: Number(order.productSubtotal || 0).toFixed(2),
      discount: Number(order.discount || 0).toFixed(2),
      delivery_fee: Number(order.deliveryFee || 0).toFixed(2),
      total: Number(order.total || 0).toFixed(2),
      coupon_code: order.couponCode || '—',
      build_preference: order.buildPreference === 'assemble' ? 'Build the PC' : order.buildPreference === 'parts' ? 'Send components separately' : '—',
      notes: order.notes || '—',
    };
    const subject = renderTemplate(store.orderEmailSubject || 'New Blitz Gaming order {{order_number}}', values).slice(0, 180);
    const fallback = 'A new order has been placed.\n\nOrder: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{phone}}\nDelivery area: {{delivery_area}}\nCity: {{city}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nSubtotal: ₪{{subtotal}}\nDiscount: ₪{{discount}}\nDelivery: ₪{{delivery_fee}}\nTOTAL: ₪{{total}}\nCoupon: {{coupon_code}}\nNotes: {{notes}}';
    const text = renderTemplate(store.orderEmailTemplate || fallback, values).slice(0, 18000);

    const emailResponse = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text }) });
    const emailRaw = await emailResponse.text();
    if (!emailResponse.ok) throw new Error(emailRaw || `Email provider rejected the request (${emailResponse.status})`);
    await sbRequest(`blitz_order_email_notifications?order_number=eq.${encodeURIComponent(orderNumber)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'sent', updated_at: new Date().toISOString(), error: null }) });
    return json({ ok: true });
  } catch (error) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/blitz_order_email_notifications?order_number=eq.${encodeURIComponent(orderNumber)}`, { method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', updated_at: new Date().toISOString(), error: String(error instanceof Error ? error.message : error).slice(0, 500) }) });
    } catch { /* retain the original error */ }
    console.error('Order notification failed:', error);
    return json({ error: 'The order was saved, but the email notification failed. Check the hosting function logs and email settings.' }, 502);
  }
};
