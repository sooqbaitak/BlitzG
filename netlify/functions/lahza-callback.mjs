import { json, safeText, siteUrl, verifyAndSettleLahza, supabaseRequest } from './_payment-utils.mjs';

const redirect = (site, orderNumber, state) => {
  if (!site) return new Response('Payment callback is not configured.', { status: 503 });
  const safeOrder = String(orderNumber || '');
  const hashPath = safeOrder ? `/order-confirmation/${encodeURIComponent(safeOrder)}?payment=${encodeURIComponent(state)}` : `/?payment=${encodeURIComponent(state)}`;
  return new Response(null, { status: 302, headers: { Location: `${site}/#${hashPath}`, 'Cache-Control': 'no-store' } });
};

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
  const site = siteUrl();
  const url = new URL(request.url);
  const reference = safeText(url.searchParams.get('reference') || url.searchParams.get('trxref'), 100);
  if (!reference || !/^[A-Za-z0-9.=\-]{6,100}$/.test(reference)) return redirect(site, '', 'review');
  let attempt;
  try {
    const params = new URLSearchParams({ reference: `eq.${reference}`, select: 'reference,order_number', limit: '1' });
    const rows = await supabaseRequest(`/rest/v1/blitz_payment_attempts?${params}`);
    attempt = Array.isArray(rows) ? rows[0] : null;
    if (!attempt) return redirect(site, '', 'review');
    const result = await verifyAndSettleLahza(reference);
    return redirect(site, attempt.order_number, result.state);
  } catch (error) {
    console.error('Lahza callback could not verify payment:', error);
    return redirect(site, attempt?.order_number || '', 'review');
  }
};
