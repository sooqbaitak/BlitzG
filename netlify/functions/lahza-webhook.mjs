import { json, safeText, verifyAndSettleLahza, verifyLahzaSignature } from './_payment-utils.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  const secret = String(process.env.LAHZA_SECRET_KEY || '').trim();
  if (!secret) return json({ error: 'Webhook is not configured.' }, 503);
  const rawBody = await request.text();
  if (rawBody.length > 256_000) return json({ error: 'Payload too large.' }, 413);
  const signature = request.headers.get('x-lahza-signature') || '';
  if (!verifyLahzaSignature(rawBody, signature, secret)) return json({ error: 'Invalid webhook signature.' }, 401);

  let event;
  try { event = JSON.parse(rawBody); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const eventName = safeText(event?.event || event?.type, 80);
  if (eventName !== 'charge.success') return json({ received: true, ignored: true });
  const reference = safeText(event?.data?.reference || event?.data?.transaction?.reference, 100);
  if (!reference || !/^[A-Za-z0-9.=\-]{6,100}$/.test(reference)) return json({ error: 'Missing payment reference.' }, 400);
  try {
    // The webhook signature authenticates the sender; a fresh server-to-server verification
    // additionally confirms amount, currency and reference before marking the order paid.
    const result = await verifyAndSettleLahza(reference);
    if (result.state !== 'success') return json({ received: true, paymentState: result.state });
    return json({ received: true, paymentState: 'success' });
  } catch (error) {
    console.error('Lahza webhook payment settlement failed:', error);
    // Non-2xx tells Lahza to retry the event.
    return json({ error: 'Could not safely settle this payment; retry the webhook.' }, 503);
  }
};
