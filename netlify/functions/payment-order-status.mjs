import { json, phoneKey, supabaseRequest } from './_payment-utils.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const number = String(body?.orderNumber ?? '').trim().toUpperCase();
  const phone = phoneKey(body?.phone);
  if (!/^BG#\d{1,18}$/.test(number) || !phone) return json({ error: 'Order number or phone does not match an order.' }, 400);
  try {
    const params = new URLSearchParams({ number: `eq.${number}`, select: 'number,payload', limit: '1' });
    const rows = await supabaseRequest(`/rest/v1/blitz_orders?${params}`);
    const row = Array.isArray(rows) ? rows[0] : null;
    const order = row?.payload;
    if (!order || row.number !== number || phoneKey(order.phone) !== phone) return json({ error: 'Order number or phone does not match an order.' }, 404);
    return json({ order: {
      number,
      payment: order.payment || 'cod',
      paymentStatus: order.paymentStatus || 'pay_on_delivery',
      paymentReference: order.paymentReference || undefined,
      paymentPaidAt: order.paymentPaidAt || undefined,
      loyaltyPointsEarned: Math.max(0, Number(order.loyaltyPointsEarned) || 0),
      status: order.status || 'new',
      total: Math.max(0, Number(order.total) || 0),
    } });
  } catch (error) {
    console.error('Payment status lookup failed:', error);
    return json({ error: 'Payment status is temporarily unavailable. Please try again.' }, 502);
  }
};
