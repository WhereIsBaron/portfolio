// CRM inbox "smart reply" — role-plays the contact so the demo inbox answers what
// you actually said, not a fixed script. Non-streaming: returns one JSON reply.
//
// /crm is a PUBLIC demo, so this is rate-limited per IP (shared with the chatbot's
// guard) and always degrades gracefully — on any failure the client falls back to
// its built-in scripted reply, so the inbox never breaks. Keys stay server-side.

type ProviderName = 'gemini' | 'groq';
interface ProviderConfig { url: string; model: string; keyEnv: string; extraBody?: Record<string, unknown>; }

const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-3.5-flash-lite',
    keyEnv: 'GEMINI_API_KEY',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-20b',
    keyEnv: 'GROQ_API_KEY',
    extraBody: { reasoning_effort: 'low' },
  },
};

const ORDER: ProviderName[] = (process.env.ACTIVE_PROVIDER as ProviderName) === 'groq'
  ? ['groq', 'gemini']
  : ['gemini', 'groq'];

const MAX_HISTORY = 10;
const MAX_MSG_CHARS = 800;
const MAX_OUTPUT_TOKENS = 160;
const RATE_LIMIT_MAX = 30;      // replies allowed per IP per window
const RATE_LIMIT_WINDOW = 300;  // seconds

type Msg = { from: 'me' | 'them'; body: string };

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// Shared per-IP guard (check_chat_rate_limit is SECURITY DEFINER granted to anon,
// so the publishable key is enough). FAILS OPEN — a guard error never blocks the demo.
async function underRateLimit(ip: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return true;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_chat_rate_limit`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_ip: ip, max_requests: RATE_LIMIT_MAX, window_seconds: RATE_LIMIT_WINDOW }),
    });
    if (!res.ok) return true;
    return (await res.json()) === true;
  } catch {
    return true;
  }
}

function systemPrompt(name: string, title: string, company: string): string {
  const first = name.split(' ')[0] || name;
  return [
    `You are ${name}, ${title} at ${company}. You are a customer (or prospect) exchanging short messages with Andrew Langeveldt, a software engineer and consultant, inside his CRM's inbox.`,
    `Stay fully in character as ${first}. Read what Andrew just said and respond to it directly and naturally — answer questions, and where it fits, add a realistic follow-up, a small objection, a scheduling detail, or a next step.`,
    `Keep it to 1–3 sentences, professional but human, and vary your wording so replies never feel formulaic. It is fine to be a little unpredictable.`,
    `Never say or imply you are an AI, never break character, and do not sign off with a name.`,
  ].join(' ');
}

async function callProvider(name: ProviderName, messages: { role: string; content: string }[]): Promise<string | null> {
  const cfg = PROVIDERS[name];
  const key = process.env[cfg.keyEnv];
  if (!key) return null;
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.9,
        stream: false,
        messages,
        ...cfg.extraBody,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

export default async (req: Request, context: any): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let body: any = {};
  try { body = await req.json(); } catch { return json(400, { error: 'Bad JSON' }); }

  const contact = body.contact || {};
  const name = typeof contact.name === 'string' ? contact.name.slice(0, 80) : '';
  const title = typeof contact.title === 'string' ? contact.title.slice(0, 80) : 'a contact';
  const company = typeof contact.company === 'string' ? contact.company.slice(0, 80) : 'their company';
  if (!name) return json(200, { reply: null }); // nothing to role-play → client falls back

  const rawHistory: Msg[] = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .filter((m) => m && (m.from === 'me' || m.from === 'them') && typeof m.body === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ from: m.from, body: m.body.slice(0, MAX_MSG_CHARS) }));
  if (history.length === 0 || history[history.length - 1].from !== 'me') {
    return json(200, { reply: null }); // must end on Andrew's turn
  }

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'anon';
  if (!(await underRateLimit(String(ip).split(',')[0].trim()))) {
    return json(200, { reply: null }); // over budget → graceful scripted fallback
  }

  // Map the thread to chat roles: the contact is the assistant, Andrew is the user.
  const messages = [
    { role: 'system', content: systemPrompt(name, title, company) },
    ...history.map((m) => ({ role: m.from === 'them' ? 'assistant' : 'user', content: m.body })),
  ];

  for (const provider of ORDER) {
    const reply = await callProvider(provider, messages);
    if (reply) return json(200, { reply });
  }
  return json(200, { reply: null }); // both providers unavailable → client fallback
};
