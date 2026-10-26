const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const trimSlash = (value = '') => String(value).replace(/\/$/, '');
const validId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!['GET', 'PATCH', 'DELETE', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
  const url = trimSlash(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || secret;
  const token = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !secret || !token) return json({ error: 'Customer management needs Supabase server credentials and an administrator session.' }, 503);
  const secretIsJwt = secret.startsWith('eyJ');
  const serverHeaders = { apikey: secret, ...(secretIsJwt ? { Authorization: `Bearer ${secret}` } : {}), 'content-type': 'application/json' };
  const parseResponse = async (response) => {
    const raw = await response.text();
    const parsed = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : null;
    if (!response.ok) throw new Error(typeof parsed === 'object' && parsed ? (parsed.message || parsed.msg || parsed.error_description || parsed.error || `Supabase request failed (${response.status})`) : String(parsed || `Supabase request failed (${response.status})`));
    return parsed;
  };
  const authRequest = async (path, init = {}) => parseResponse(await fetch(`${url}${path}`, { ...init, headers: { apikey: publicKey, Authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {}) } }));
  const serviceRequest = async (path, init = {}) => parseResponse(await fetch(`${url}${path}`, { ...init, headers: { ...serverHeaders, ...(init.headers || {}) } }));
  const adminRequest = async (path, init = {}) => parseResponse(await fetch(`${url}${path}`, { ...init, headers: { ...serverHeaders, ...(init.headers || {}) } }));

  try {
    const me = await authRequest('/auth/v1/user');
    const metadata = me?.app_metadata || {};
    const isAdmin = metadata.role === 'admin' || (Array.isArray(metadata.roles) && metadata.roles.includes('admin'));
    if (!isAdmin) return json({ error: 'Administrator access required.' }, 403);

    if (request.method === 'GET') {
      const allUsers = [];
      for (let page = 1; page <= 20; page++) {
        const result = await adminRequest(`/auth/v1/admin/users?page=${page}&per_page=100`);
        const users = Array.isArray(result?.users) ? result.users : Array.isArray(result) ? result : [];
        allUsers.push(...users);
        if (users.length < 100) break;
      }
      const profiles = await serviceRequest('/rest/v1/blitz_customer_profiles?select=*');
      const orderRows = [];
      for (let offset = 0; offset < 50000; offset += 1000) {
        const page = await serviceRequest(`/rest/v1/blitz_orders?select=user_id,number,payload,created_at&user_id=not.is.null&order=created_at.desc&limit=1000&offset=${offset}`);
        if (Array.isArray(page)) orderRows.push(...page);
        if (!Array.isArray(page) || page.length < 1000) break;
      }
      const byId = new Map((Array.isArray(profiles) ? profiles : []).map((p) => [p.user_id, p]));
      const ordersByCustomer = new Map();
      for (const row of orderRows) {
        if (!row.user_id) continue;
        const entry = ordersByCustomer.get(row.user_id) || { order_count: 0, lifetime_value: 0, last_order_at: null };
        entry.order_count += 1;
        entry.lifetime_value += Number(row.payload?.total || 0);
        const created = row.payload?.createdAt || row.created_at || null;
        if (created && (!entry.last_order_at || created > entry.last_order_at)) entry.last_order_at = created;
        ordersByCustomer.set(row.user_id, entry);
      }
      const customers = allUsers.filter((u) => u.id !== me.id && u.app_metadata?.role !== 'admin' && !(u.app_metadata?.roles || []).includes('admin')).map((u) => {
        const p = byId.get(u.id) || {};
        return {
          user_id: u.id,
          email: u.email || p.email || '',
          phone: u.phone || p.phone || '',
          display_name: p.display_name || u.user_metadata?.full_name || u.user_metadata?.name || '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          email_confirmed: Boolean(u.email_confirmed_at),
          phone_confirmed: Boolean(u.phone_confirmed_at),
          points: Number(p.points || 0),
          wishlist: Array.isArray(p.wishlist) ? p.wishlist : [],
          highlighted: Boolean(p.highlighted),
          blocked: Boolean(p.blocked || u.app_metadata?.is_blocked || u.banned_until),
          admin_note: p.admin_note || '',
          discount_percent: Number(p.discount_percent || 0),
          account_message: p.account_message || '',
          ...(ordersByCustomer.get(u.id) || { order_count: 0, lifetime_value: 0, last_order_at: null }),
        };
      });
      return json({ customers });
    }

    let body = {};
    if (request.method !== 'GET') {
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
    }
    const userId = String(body.userId || new URL(request.url).searchParams.get('userId') || '').trim();
    if (!validId(userId)) return json({ error: 'A valid customer ID is required.' }, 400);
    if (userId === me.id) return json({ error: 'You cannot apply customer-management actions to your own administrator account.' }, 400);

    if (request.method === 'DELETE' || body.action === 'delete') {
      await adminRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      return json({ ok: true, deleted: true });
    }

    if (body.action === 'message') {
      const message = String(body.message || '').trim().slice(0, 5000);
      const subject = String(body.subject || 'A message from BLITZ GAMING').trim().slice(0, 180);
      if (!message) return json({ error: 'Write a message before sending.' }, 400);
      const target = await adminRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
      const user = target?.user || target;
      const email = String(user?.email || '').trim();
      if (!email) return json({ error: 'This customer does not have an email address for delivery.' }, 400);
      const apiKey = process.env.RESEND_API_KEY || '';
      const from = process.env.ORDER_EMAIL_FROM || '';
      if (!apiKey || !from) return json({ error: 'Email sending is not configured. Set RESEND_API_KEY and ORDER_EMAIL_FROM in your hosting environment.' }, 503);
      const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [email], subject, text: message }) });
      if (!sent.ok) throw new Error(`Email provider rejected the message (${sent.status}).`);
      return json({ ok: true, sent: true });
    }

    const allowed = {};
    if (body.points !== undefined) { const n = Number(body.points); if (!Number.isInteger(n) || n < 0 || n > 10000000) return json({ error: 'Points must be a whole number between 0 and 10,000,000.' }, 400); allowed.points = n; }
    if (body.highlighted !== undefined) allowed.highlighted = Boolean(body.highlighted);
    if (body.blocked !== undefined) allowed.blocked = Boolean(body.blocked);
    if (body.admin_note !== undefined) allowed.admin_note = String(body.admin_note).slice(0, 2000);
    if (body.account_message !== undefined) allowed.account_message = String(body.account_message).slice(0, 2000);
    if (body.display_name !== undefined) allowed.display_name = String(body.display_name).slice(0, 160);
    if (body.discount_percent !== undefined) { const n = Number(body.discount_percent); if (!Number.isFinite(n) || n < 0 || n > 100) return json({ error: 'Customer discount must be between 0 and 100 percent.' }, 400); allowed.discount_percent = n; }
    if (body.email !== undefined) allowed.email = String(body.email).slice(0, 250);
    if (body.phone !== undefined) allowed.phone = String(body.phone).slice(0, 40);

    const existingRows = await serviceRequest(`/rest/v1/blitz_customer_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
    const existing = Array.isArray(existingRows) ? existingRows[0] || {} : {};
    const profile = { ...existing, user_id: userId, points: Number(existing.points || 0), wishlist: Array.isArray(existing.wishlist) ? existing.wishlist : [], ...allowed, updated_at: new Date().toISOString() };
    await serviceRequest('/rest/v1/blitz_customer_profiles', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(profile) });

    if (allowed.blocked !== undefined) {
      const currentUserResponse = await adminRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
      const currentUser = currentUserResponse?.user || currentUserResponse;
      const appMetadata = { ...(currentUser?.app_metadata || {}), is_blocked: allowed.blocked };
      await adminRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify({ app_metadata: appMetadata, ban_duration: allowed.blocked ? '876000h' : 'none' }) });
    }
    return json({ ok: true, customer: { user_id: userId, ...profile } });
  } catch (error) {
    console.error('Admin customer management failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Customer action failed.' }, 500);
  }
};
