/** Adapt the Web Request/Response handlers shared with Netlify to Vercel Node Functions. */
export async function runWebHandler(req, res, handler) {
  try {
    const method = String(req.method || 'GET').toUpperCase();
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || process.env.VERCEL_URL || 'localhost';
    const headers = new Headers();
    for (const [key, raw] of Object.entries(req.headers || {})) {
      if (['host', 'content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase()) || raw == null) continue;
      if (Array.isArray(raw)) raw.forEach((value) => headers.append(key, value));
      else headers.set(key, String(raw));
    }
    let body;
    if (!['GET', 'HEAD'].includes(method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      body = Buffer.concat(chunks);
    }
    const request = new Request(new URL(req.url || '/', `${protocol}://${host}`), { method, headers, ...(body && body.length ? { body } : {}) });
    const response = await handler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => { if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value); });
    const data = Buffer.from(await response.arrayBuffer());
    res.end(data);
  } catch (error) {
    console.error('Vercel function adapter failed:', error);
    if (!res.headersSent) { res.statusCode = 500; res.setHeader('content-type', 'application/json; charset=utf-8'); }
    res.end(JSON.stringify({ error: 'The server could not process this request.' }));
  }
}
