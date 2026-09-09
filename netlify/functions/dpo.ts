// Secure server-side proxy for DPO Pay (DirectPay Online) v6 payments.
//
// Holds the DPO **Company Token** (which NEVER reaches the browser) and talks
// to DPO's XML API on the client's behalf. Two actions:
//   • create  → createToken: registers a transaction, returns the hosted
//               payment-page URL the browser should redirect to.
//   • verify  → verifyToken: after DPO redirects the payer back, confirms
//               whether the transaction was actually paid.
//
// The company token lives ONLY in the DPO_COMPANY_TOKEN env var (Netlify /
// local .env) — never in the repo or the client bundle. Mirrors the security
// model of chat.ts.

// ---- Config (all server-only env) ----
// DPO_COMPANY_TOKEN  (secret)  the account's API company token (GUID)
// DPO_SERVICE_TYPE            numeric service-type id from the DPO portal
// DPO_CURRENCY                default currency (e.g. "USD"); overridable per request from the allow-list
// DPO_API_URL                 override the API endpoint (default v6)
// PUBLIC_SITE_URL             canonical site origin for redirect URLs (falls back to Netlify URL, then request origin)

const API_URL = process.env.DPO_API_URL || 'https://secure.3gdirectpay.com/API/v6/';
// Hosted payment page lives on the same host as the API.
const PAY_HOST = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'https://secure.dpopay.com';
  }
})();

// Currencies we allow to be charged. Keep tight; add as the DPO account supports them.
const ALLOWED_CURRENCIES = new Set(['USD', 'ZAR', 'BWP', 'KES', 'GBP', 'EUR', 'TZS', 'UGX', 'GHS', 'NGN']);
const DEFAULT_CURRENCY = (process.env.DPO_CURRENCY || 'USD').toUpperCase();

// Amount guard rails (in the charged currency's major unit).
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

const MAX_TEXT = 200; // cap free-text fields before they reach DPO / the payment page

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

// Escape a value for safe inclusion in an XML text node.
function xmlEscape(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Pull the first <tag>…</tag> value out of a DPO XML response.
function xmlTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

// Resolve the site origin used to build RedirectURL / BackURL. Prefer an
// explicit env, then Netlify's injected URL, then the request's own origin.
function siteOrigin(req: Request): string {
  const fromEnv = process.env.PUBLIC_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return '';
}

async function postXml(xml: string): Promise<{ ok: boolean; body: string; status: number }> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });
    const body = await res.text();
    return { ok: res.ok, body, status: res.status };
  } catch {
    return { ok: false, body: '', status: 0 };
  }
}

// ---- createToken ----
async function handleCreate(req: Request, payload: any, companyToken: string): Promise<Response> {
  const serviceType = process.env.DPO_SERVICE_TYPE;
  if (!serviceType) {
    return jsonResponse(500, { error: 'Payment service is not fully configured (missing service type).' });
  }

  // Validate amount.
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return jsonResponse(400, { error: `Enter an amount between ${MIN_AMOUNT} and ${MAX_AMOUNT}.` });
  }
  const amountStr = amount.toFixed(2);

  // Validate currency against the allow-list.
  const currency = String(payload.currency || DEFAULT_CURRENCY).toUpperCase();
  if (!ALLOWED_CURRENCIES.has(currency)) {
    return jsonResponse(400, { error: 'Unsupported currency.' });
  }

  const description = xmlEscape(String(payload.description || 'Portfolio payment').slice(0, MAX_TEXT));
  const customerEmail = xmlEscape(String(payload.email || '').slice(0, MAX_TEXT));
  const customerName = String(payload.name || '').slice(0, MAX_TEXT);
  const firstName = xmlEscape(customerName.split(/\s+/)[0] || '');
  const lastName = xmlEscape(customerName.split(/\s+/).slice(1).join(' ') || '');

  const origin = siteOrigin(req);
  const redirectURL = xmlEscape(`${origin}/pay/return`);
  const backURL = xmlEscape(`${origin}/pay?cancelled=1`);

  // Unique-ish merchant reference for reconciliation.
  const companyRef = `AL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

  const now = new Date();
  const serviceDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${xmlEscape(companyToken)}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amountStr}</PaymentAmount>
    <PaymentCurrency>${currency}</PaymentCurrency>
    <CompanyRef>${companyRef}</CompanyRef>
    <RedirectURL>${redirectURL}</RedirectURL>
    <BackURL>${backURL}</BackURL>
    <CompanyRefUnique>1</CompanyRefUnique>
    <PTL>60</PTL>
    ${customerEmail ? `<customerEmail>${customerEmail}</customerEmail>` : ''}
    ${firstName ? `<customerFirstName>${firstName}</customerFirstName>` : ''}
    ${lastName ? `<customerLastName>${lastName}</customerLastName>` : ''}
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${xmlEscape(serviceType)}</ServiceType>
      <ServiceDescription>${description}</ServiceDescription>
      <ServiceDate>${serviceDate}</ServiceDate>
    </Service>
  </Services>
</API3G>`;

  const { body } = await postXml(xml);
  const result = xmlTag(body, 'Result');
  const transToken = xmlTag(body, 'TransToken');

  if (result === '000' && transToken) {
    return jsonResponse(200, {
      token: transToken,
      ref: companyRef,
      amount: amountStr,
      currency,
      // Where the browser should send the payer to complete payment.
      paymentUrl: `${PAY_HOST}/payv2.php?ID=${encodeURIComponent(transToken)}`,
    });
  }

  return jsonResponse(502, {
    error: 'Could not start the payment. Please try again.',
    dpoResult: result,
    dpoExplanation: xmlTag(body, 'ResultExplanation'),
  });
}

// ---- verifyToken ----
async function handleVerify(_req: Request, payload: any, companyToken: string): Promise<Response> {
  const token = String(payload.token || '').trim();
  // DPO transaction tokens are GUIDs; reject anything that isn't one.
  if (!/^[0-9a-fA-F-]{20,60}$/.test(token)) {
    return jsonResponse(400, { error: 'Missing or invalid transaction token.' });
  }

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${xmlEscape(companyToken)}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${xmlEscape(token)}</TransactionToken>
</API3G>`;

  const { body } = await postXml(xml);
  const result = xmlTag(body, 'Result');
  const explanation = xmlTag(body, 'ResultExplanation');

  // 000 = paid. Everything else is pending / declined / not-found.
  const paid = result === '000';
  return jsonResponse(200, {
    paid,
    result,
    explanation,
    amount: xmlTag(body, 'TransactionAmount'),
    currency: xmlTag(body, 'TransactionCurrency'),
    ref: xmlTag(body, 'CompanyRef'),
    customerName: xmlTag(body, 'CustomerName'),
    paymentMethod: xmlTag(body, 'CustomerCreditType'),
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const companyToken = process.env.DPO_COMPANY_TOKEN;
  if (!companyToken) {
    return jsonResponse(500, { error: 'Payments are not configured.' });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  switch (payload?.action) {
    case 'create':
      return handleCreate(req, payload, companyToken);
    case 'verify':
      return handleVerify(req, payload, companyToken);
    default:
      return jsonResponse(400, { error: 'Unknown action.' });
  }
};
