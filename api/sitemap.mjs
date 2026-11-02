const trimSlash = (value = '') => String(value).replace(/\/$/, '');

function configuredOrigin(requestUrl) {
  const configured = trimSlash(process.env.SITE_URL || process.env.URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''));
  try {
    const url = new URL(configured || requestUrl);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url.origin;
  } catch { /* use a safe fallback below */ }
  return 'https://example.invalid';
}

function supabaseReadConfig() {
  const url = trimSlash(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || '';
  const legacyJwt = key.startsWith('eyJ');
  return { url, key, headers: key ? { apikey: key, ...(legacyJwt ? { Authorization: `Bearer ${key}` } : {}) } : {} };
}

async function readPublicStoreState() {
  const config = supabaseReadConfig();
  if (!config.url || !config.key) return null;
  const endpoint = `${config.url}/rest/v1/blitz_store_state?id=eq.main&select=data`;
  try {
    const response = await fetch(endpoint, { headers: config.headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) ? rows[0]?.data ?? null : null;
  } catch {
    // A sitemap must still work during temporary database/network failures.
    return null;
  }
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function safeSlug(value) {
  const slug = String(value ?? '').trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug) ? slug : '';
}

export async function createSitemapResponse(requestUrl = 'https://example.invalid/') {
  const origin = configuredOrigin(requestUrl);
  const routes = new Set([
    '/', '/shop', '/offers', '/brands', '/build-your-setup',
  ]);
  const store = await readPublicStoreState();
  if (store && typeof store === 'object') {
    if (store.store?.videoAdsPageEnabled === true) routes.add('/videos');
    for (const product of Array.isArray(store.products) ? store.products : []) {
      const slug = safeSlug(product?.slug);
      if (slug && product.status === 'active') routes.add(`/product/${slug}`);
    }
    for (const category of Array.isArray(store.categories) ? store.categories : []) {
      const slug = safeSlug(category?.slug);
      if (slug && category.visible === true) routes.add(`/category/${slug}`);
    }
    for (const page of Array.isArray(store.pages) ? store.pages : []) {
      const slug = safeSlug(page?.slug);
      if (slug && page.visible === true) routes.add(`/page/${slug}`);
    }
  }

  const body = [...routes].sort().map((route) => {
    const loc = route.includes('?')
      ? `${origin}${route}`
      : `${origin}${route}`;
    return `  <url><loc>${xmlEscape(loc)}</loc></url>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default async function handler(req, res) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'example.invalid';
  const protocol = req.headers?.['x-forwarded-proto'] || 'https';
  const requestUrl = `${protocol}://${host}${req.url || '/'}`;
  const response = await createSitemapResponse(requestUrl);
  res.statusCode = response.status;
  for (const [name, value] of response.headers) res.setHeader(name, value);
  res.end(await response.text());
}
