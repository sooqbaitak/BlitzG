import { json, siteUrl, supabaseConfig } from './_payment-utils.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
  const { url: supabaseUrl, key } = supabaseConfig();
  const lahza = String(process.env.LAHZA_SECRET_KEY || '').trim();
  const configuredSecret = lahza.length >= 12 && !/YOUR_|PLACEHOLDER|CHANGE_ME/i.test(lahza);
  const site = siteUrl();
  const cardReady = Boolean(supabaseUrl && key && configuredSecret && site);
  const mode = /_test_/i.test(lahza) ? 'test' : configuredSecret ? 'live' : undefined;
  return json({ cardReady, provider: cardReady ? 'Lahza' : undefined, mode, siteConfigured: Boolean(site) });
};
