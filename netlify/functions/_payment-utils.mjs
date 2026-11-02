import { createHmac, timingSafeEqual } from 'node:crypto';

export const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra },
});

export const trimSlash = (value = '') => String(value).replace(/\/$/, '');
export const safeText = (value, max = 250) => String(value ?? '').trim().slice(0, max);
export const phoneKey = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
};

export function siteUrl() {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const raw = trimSlash(process.env.SITE_URL || process.env.URL || vercelUrl || '');
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return parsed.origin;
  } catch { /* not configured */ }
  return '';
}

export function supabaseConfig() {
  const url = trimSlash(process.env.SUPABASE_URL || '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const legacyJwt = key.startsWith('eyJ');
  return { url, key, headers: { apikey: key, ...(legacyJwt ? { Authorization: `Bearer ${key}` } : {}), 'content-type': 'application/json' } };
}

export async function supabaseRequest(path, init = {}) {
  const config = supabaseConfig();
  if (!config.url || !config.key) throw new Error('Supabase server credentials are not configured.');
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: { ...config.headers, ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(12000),
  });
  const text = await response.text();
  const result = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    const details = result && typeof result === 'object' ? (result.message || result.msg || result.error || result.details) : '';
    throw new Error(`Supabase request failed (${response.status})${details ? `: ${String(details).slice(0, 250)}` : ''}`);
  }
  return result;
}

export async function callRpc(name, params) {
  return supabaseRequest(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(params) });
}

export async function getPaymentAttempt(reference) {
  const params = new URLSearchParams({ reference: `eq.${reference}`, select: 'reference,order_number,amount_agora,currency,status', limit: '1' });
  const rows = await supabaseRequest(`/rest/v1/blitz_payment_attempts?${params}`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function verifyAndSettleLahza(reference) {
  const secret = process.env.LAHZA_SECRET_KEY || '';
  if (!secret) throw new Error('Lahza secret key is not configured.');
  const attempt = await getPaymentAttempt(reference);
  if (!attempt) throw new Error('Payment reference not found.');

  const response = await fetch(`https://api.lahza.io/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET', headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000),
  });
  const verification = await response.json().catch(() => null);
  if (!response.ok || !verification?.status || !verification?.data) {
    throw new Error(`Lahza verification did not complete (${response.status}).`);
  }
  const data = verification.data;
  const verifiedReference = String(data.reference ?? '');
  const amount = Number(data.amount);
  const currency = String(data.currency ?? '').toUpperCase();
  if (verifiedReference !== reference || currency !== 'ILS' || !Number.isSafeInteger(amount) || amount !== Number(attempt.amount_agora)) {
    throw new Error('Lahza payment reference, amount, or currency does not match the saved order.');
  }

  if (String(data.status).toLowerCase() === 'success') {
    await callRpc('blitz_mark_card_payment_paid', { p_reference: reference, p_amount_agora: amount, p_currency: currency });
    return { attempt, state: 'success', gatewayStatus: String(data.status) };
  }
  const gatewayStatus = safeText(data.status || 'pending', 80).toLowerCase();
  if (['failed', 'abandoned', 'cancelled', 'canceled', 'reversed'].includes(gatewayStatus)) {
    await callRpc('blitz_mark_card_payment_failed', { p_reference: reference, p_gateway_status: gatewayStatus });
    return { attempt, state: 'failed', gatewayStatus };
  }
  return { attempt, state: 'pending', gatewayStatus };
}

export function verifyLahzaSignature(rawBody, receivedSignature, secret) {
  if (!receivedSignature || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = String(receivedSignature).trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
