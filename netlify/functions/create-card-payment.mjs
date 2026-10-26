import { randomUUID } from 'node:crypto';
import { callRpc, json, phoneKey, siteUrl, supabaseConfig, supabaseRequest } from './_payment-utils.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const number = String(body?.orderNumber ?? '').trim().toUpperCase();
  const phone = phoneKey(body?.phone);
  if (!/^BG#\d{1,18}$/.test(number) || !phone) return json({ error: 'The order number or checkout phone is invalid.' }, 400);

  const { url, key } = supabaseConfig();
  const secret = String(process.env.LAHZA_SECRET_KEY || '').trim();
  const website = siteUrl();
  if (!url || !key || !secret || secret.length < 12 || !website) {
    return json({ error: 'Card payments are not configured. Add Supabase server credentials, a Lahza merchant secret key, and SITE_URL in your hosting environment.' }, 503);
  }

  try {
    const orderParams = new URLSearchParams({ number: `eq.${number}`, select: 'number,payload', limit: '1' });
    const rows = await supabaseRequest(`/rest/v1/blitz_orders?${orderParams}`);
    const row = Array.isArray(rows) ? rows[0] : null;
    const order = row?.payload;
    if (!order || row.number !== number || phoneKey(order.phone) !== phone) return json({ error: 'Order number or phone does not match an order.' }, 404);
    if (order.payment !== 'card' || order.paymentStatus !== 'awaiting_payment' || order.status === 'cancelled') {
      return json({ error: 'This order is not awaiting card payment.' }, 409);
    }
    // Do not initialize a second active transaction for the same order. Otherwise an old
    // hosted checkout could settle after the order reference had been replaced.
    if (order.paymentReference) return json({ error: 'A card payment attempt already exists for this order. Refresh its payment status or contact the store before trying again.' }, 409);
    if (!order.email || !/^\S+@\S+\.\S+$/.test(String(order.email))) return json({ error: 'A valid email address is required for card payment.' }, 400);
    const amountAgora = Math.round(Number(order.total) * 100);
    if (!Number.isSafeInteger(amountAgora) || amountAgora <= 0) return json({ error: 'The order total is invalid for card payment.' }, 400);

    const stateParams = new URLSearchParams({ id: 'eq.main', select: 'data', limit: '1' });
    const stateRows = await supabaseRequest(`/rest/v1/blitz_store_state?${stateParams}`);
    const store = Array.isArray(stateRows) ? stateRows[0]?.data?.store : null;
    const cardToggle = Array.isArray(store?.paymentMethods) ? store.paymentMethods.find((method) => method?.id === 'card') : null;
    if (!cardToggle?.enabled) return json({ error: 'Card payments are currently disabled by the store administrator.' }, 409);

    const reference = `${number.replace(/[^A-Za-z0-9]/g, '')}-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await supabaseRequest('/rest/v1/blitz_payment_attempts', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ reference, order_number: number, amount_agora: amountAgora, currency: 'ILS', status: 'pending' }),
    });
    await callRpc('blitz_prepare_card_payment', { p_order_number: number, p_reference: reference });

    let providerResponse;
    try {
      providerResponse = await fetch('https://api.lahza.io/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: order.email,
          mobile: order.phone,
          amount: String(amountAgora),
          currency: 'ILS',
          reference,
          callback_url: `${website}/api/lahza-callback`,
          metadata: JSON.stringify({ order_number: number, store: 'Blitz Gaming' }),
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      await callRpc('blitz_mark_card_payment_failed', { p_reference: reference, p_gateway_status: 'initialize_network_error' }).catch(() => undefined);
      console.error('Lahza initialize request failed:', error);
      return json({ error: 'Could not reach the card processor. The unpaid order was released where possible. Please try again or choose Cash on Delivery.' }, 502);
    }

    const providerBody = await providerResponse.json().catch(() => null);
    const authorizationUrl = providerBody?.data?.authorization_url || providerBody?.authorization_url;
    if (!providerResponse.ok || providerBody?.status !== true || typeof authorizationUrl !== 'string' || !/^https:\/\//i.test(authorizationUrl)) {
      await callRpc('blitz_mark_card_payment_failed', { p_reference: reference, p_gateway_status: `initialize_failed_${providerResponse.status}` }).catch(() => undefined);
      console.error('Lahza initialization rejected:', providerResponse.status, providerBody?.message || 'No authorization URL');
      return json({ error: 'The card processor could not start this payment. The unpaid order was released where possible; please retry or choose Cash on Delivery.' }, 502);
    }
    return json({ authorizationUrl });
  } catch (error) {
    console.error('Create card payment failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Could not start card payment.' }, 502);
  }
};
