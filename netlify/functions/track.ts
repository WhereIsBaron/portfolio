// Visit tracking endpoint.
//
// The browser POSTs here once per session. This function reads the REAL visitor
// IP from Netlify's request headers (the browser can't be trusted to report it)
// and records the visit in Supabase via the record_visit() function, using the
// service-role key so the visit_log table is never exposed to the browser.
//
// Returns { total } — the new grand visit count — so the footer can display it.
// FAILS OPEN: any misconfiguration or error returns { total: null } with 200 so
// a tracking hiccup never breaks the page.

// Netlify sets x-nf-client-connection-ip to the real visitor IP; fall back to
// the first hop of x-forwarded-for. Returns '' when we can't determine it.
function clientIp(req: Request): string {
  const direct = req.headers.get('x-nf-client-connection-ip');
  if (direct) return direct.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '';
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Netlify injects visitor geo on the function context (context.geo.country.code)
// with no third party or extra request. Fall back to the x-nf-geo header (JSON)
// or x-country. Returns '' when geo isn't available.
function clientCountry(req: Request, context: any): string {
  const code = context?.geo?.country?.code;
  if (typeof code === 'string' && code) return code;
  try {
    const raw = req.headers.get('x-nf-geo');
    if (raw) {
      const geo = JSON.parse(raw);
      if (geo?.country?.code) return String(geo.country.code);
    }
  } catch {
    /* header absent or not JSON */
  }
  return (req.headers.get('x-country') || '').trim();
}

export default async (req: Request, context: any): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(200, { total: null }); // not configured → no-op

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty/invalid body is fine */
  }

  const ip = clientIp(req);
  const ua = (req.headers.get('user-agent') || '').slice(0, 500);
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : '';
  const path = typeof body.path === 'string' ? body.path.slice(0, 300) : '';
  const country = clientCountry(req, context).slice(0, 4);

  try {
    const res = await fetch(`${url}/rest/v1/rpc/record_visit`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_ip: ip, ua, referrer, path, country }),
    });
    if (!res.ok) return json(200, { total: null });
    const total = await res.json();
    return json(200, { total: typeof total === 'number' ? total : null });
  } catch {
    return json(200, { total: null });
  }
};
