function resolveOrigin(requestUrl) {
  const configured = String(process.env.SITE_URL || process.env.URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, '');
  try {
    const url = new URL(configured || requestUrl);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url.origin;
  } catch { /* fall through */ }
  return 'https://example.invalid';
}

export function createRobotsResponse(requestUrl = 'https://example.invalid/') {
  const origin = resolveOrigin(requestUrl);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /account',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /wishlist',
    'Disallow: /track-order',
    'Disallow: /order-confirmation/',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default async function handler(req, res) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'example.invalid';
  const protocol = req.headers?.['x-forwarded-proto'] || 'https';
  const requestUrl = `${protocol}://${host}${req.url || '/'}`;
  const response = createRobotsResponse(requestUrl);
  res.statusCode = response.status;
  for (const [name, value] of response.headers) res.setHeader(name, value);
  res.end(await response.text());
}
