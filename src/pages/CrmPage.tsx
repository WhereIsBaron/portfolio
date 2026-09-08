import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, Users, Building2, KanbanSquare, CheckSquare,
  Calendar, Inbox, FileText, Megaphone, Zap, BarChart3, Settings as SettingsIcon,
  Search, Plus, X, Check, Phone, Mail, StickyNote, ChevronRight, Database,
  Clock, TrendingUp, Target, DollarSign, AlertTriangle, Send, Menu,
  UserPlus, LifeBuoy, ArrowRightLeft, Flame, Sparkles, Radio,
} from 'lucide-react';
import {
  fetchCrmData, avatarFor, money, invoiceTotal,
  STAGES, OPEN_STAGES, STAGE_PROB, STATUSES, ACTIVITY_TYPES, PRIORITIES, LEAD_SOURCES, OWNERS,
  LOST_REASONS, COMPETITORS, CASE_STATUSES, SLA_HOURS, caseSla,
  type Contact, type Company, type Deal, type Activity, type Task, type Meeting,
  type EmailThread, type EmailTemplate, type Invoice, type Campaign, type Automation,
  type Lead, type SupportCase, type LeadStatus, type CaseStatus, type SlaState,
  type Stage, type Status, type ActivityType, type Priority, type InvoiceStatus,
} from '@/data/crmSeed';

type Tab =
  | 'dashboard' | 'contacts' | 'leads' | 'companies' | 'pipeline' | 'tasks' | 'calendar'
  | 'inbox' | 'cases' | 'invoices' | 'campaigns' | 'automations' | 'reports' | 'settings';

const NAV: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: UserPlus },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'cases', label: 'Cases', icon: LifeBuoy },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  New: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Contacted: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Qualified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Unqualified: 'bg-white/5 text-[var(--muted)] border-white/10',
  Converted: 'bg-[var(--brand-bright)]/15 text-[var(--brand-bright)] border-[var(--brand-bright)]/30',
};
const CASE_STATUS_STYLE: Record<CaseStatus, string> = {
  Open: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Replied: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Closed: 'bg-white/5 text-[var(--muted)] border-white/10',
};
const SLA_STYLE: Record<SlaState, string> = {
  Met: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'On track': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'Due soon': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Breached: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};
// Short human countdown: "in 3h" when due ahead, "5h ago" when overdue.
const relTime = (ms: number, now = Date.now()) => {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const h = abs / 3_600_000;
  const unit = h >= 48 ? `${Math.round(h / 24)}d` : h >= 1 ? `${Math.round(h)}h` : `${Math.max(1, Math.round(abs / 60_000))}m`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
};

const STATUS_STYLE: Record<Status, string> = {
  Lead: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Prospect: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Customer: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Churned: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};
const PRIO_STYLE: Record<Priority, string> = {
  Low: 'bg-white/5 text-[var(--muted)] border-white/10',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  High: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};
const INV_STYLE: Record<InvoiceStatus, string> = {
  Draft: 'bg-white/5 text-[var(--muted)] border-white/10',
  Sent: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Overdue: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};
const ACT_ICON: Record<ActivityType, typeof Phone> = {
  Call: Phone, Email: Mail, Meeting: Calendar, Note: StickyNote, Task: CheckSquare,
};

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

function Avatar({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = err || !src ? avatarFor(name) : src;
  return (
    <img
      src={url}
      alt={name}
      onError={() => setErr(true)}
      className="rounded-full border border-white/10 bg-[var(--bg-soft)] object-cover"
      style={{ width: size, height: size }}
    />
  );
}

const card = 'rounded-2xl border border-white/10 bg-[var(--surface)]';
const field =
  'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-bright)]';

// One consistent pill for every quick reply — border matches the text colour, no emoji.
const quickReplyPill =
  'rounded-full border border-[var(--brand-bright)]/40 bg-[var(--brand-bright)]/5 px-2.5 py-1 text-[11px] text-[var(--brand-bright)] transition-colors hover:bg-[var(--brand-bright)]/15';

// ── Live simulation layer ────────────────────────────────────────────────────
// This is a demo, but it behaves like a real CRM: your actions trigger reactions
// (activities logged, follow-up tasks created, simulated buyer replies) and the
// workspace ticks along on its own so it feels live. Nothing leaves the browser.
type Toast = { id: number; text: string; tone: 'info' | 'success' | 'warn' | 'coach'; contactId?: string };
type Warmth = 'warm' | 'neutral' | 'cool';

// Contextual quick replies — the instant, rules-based half of the inbox: read the
// contact's LAST message and offer matching responses (no network). Clicking one
// loads it into the reply box to review or tweak. {{first}} fills with the contact.
type QuickReply = { label: string; body: string };

const BASE_REPLIES: QuickReply[] = [
  { label: 'Acknowledge', body: 'Hi {{first}}, thanks for the update — noted, and I’ll follow up shortly.' },
  { label: 'Offer a call', body: 'Hi {{first}}, would a 20-minute call this week work? Let me know a time that suits and I’ll send an invite.' },
  { label: 'Send proposal', body: 'Hi {{first}}, I’ll put a short proposal together and send it over today.' },
];

// Each intent is matched against the contact's latest message; first match wins.
// Patterns are word-STEMS anchored at the start of a word (leading \b, no trailing
// \b) so "pric" catches pricing/price/priced, "schedul" catches scheduling, etc.
const REPLY_INTENTS: { test: RegExp; replies: QuickReply[] }[] = [
  { test: /\b(pric|quot|cost|budget|discount|afford|expensiv|how much)/i, replies: [
    { label: 'Send pricing', body: 'Hi {{first}}, I’ll send pricing over now. Let me know if you’d like a formal quote for finance.' },
    { label: 'Offer annual rate', body: 'Hi {{first}}, happy to share options — the annual plan works out best value if that helps the budget.' },
    { label: 'Prepare quote', body: 'Hi {{first}}, I’ll prepare a formal quote you can take to your finance team and send it across.' },
  ] },
  { test: /\b(call|meet|demo|schedul|calendar|book|zoom|invit|availab|thursday|friday|monday|tuesday|wednesday)/i, replies: [
    { label: 'Propose times', body: 'Hi {{first}}, I’ve got Wednesday or Thursday afternoon free — would either suit for a quick call?' },
    { label: 'Send invite', body: 'Hi {{first}}, great — I’ll send a calendar invite across now.' },
    { label: 'Confirm the call', body: 'Hi {{first}}, that works for me. I’ll be there and will send an invite to confirm.' },
  ] },
  { test: /\b(onboard|get started|getting started|kick ?off|next step|timeline|implement|roll ?out|set up|setup)/i, replies: [
    { label: 'Outline onboarding', body: 'Hi {{first}}, onboarding is quick — we set up your workspace, import your data, and run a short training session. I’ll share a timeline.' },
    { label: 'Share timeline', body: 'Hi {{first}}, I’ll send a short timeline so your team knows what to expect and when.' },
  ] },
  { test: /\b(proposal|document|scope|spec|deck|send over|send me|send across)/i, replies: [
    { label: 'Send proposal', body: 'Hi {{first}}, I’ll send a tailored proposal over today — happy to walk through it live afterwards.' },
    { label: 'Follow up', body: 'Hi {{first}}, just checking you received everything — any questions I can answer?' },
  ] },
  { test: /\b(support|issue|bug|problem|broke|error|not working|doesn.?t work|fix|down|urgent)/i, replies: [
    { label: 'Reassure & ETA', body: 'Hi {{first}}, thanks for flagging this — I’m on it and will have an update for you shortly.' },
    { label: 'Loop in support', body: 'Hi {{first}}, I’ve passed this to our support team and they’ll follow up with you directly.' },
  ] },
  { test: /\b(not sure|hesit|think about|thinking|competitor|already us|concern|worried|not convinced|too expensiv|hold off)/i, replies: [
    { label: 'Handle objection', body: 'Hi {{first}}, that’s a fair point — happy to talk it through so you’ve got what you need to decide.' },
    { label: 'Share case study', body: 'Hi {{first}}, I’ll send a short case study from a similar team — it might help put the concern to rest.' },
  ] },
  { test: /\b(thank|appreciat|sounds good|looks good|perfect|awesome|brilliant|excellent|great, )/i, replies: [
    { label: 'Acknowledge', body: 'Hi {{first}}, glad that helps — I’ll keep things moving on my side.' },
    { label: 'Thank & confirm', body: 'Thanks, {{first}}. I’ll confirm the details and send a calendar invite.' },
  ] },
];

// Suggestions for the contact's latest message, padded with one base option.
function suggestReplies(lastInbound: string): QuickReply[] {
  const matched = REPLY_INTENTS.find((i) => i.test.test(lastInbound || ''));
  const picks = matched ? [...matched.replies] : [...BASE_REPLIES];
  const extra = BASE_REPLIES.find((b) => !picks.some((p) => p.label === b.label));
  if (extra && picks.length < 4) picks.push(extra);
  return picks.slice(0, 4);
}

// The AI half of the hybrid inbox: ask the serverless role-play endpoint for a
// reply that reads what you actually wrote. Returns null on any failure (offline,
// rate-limited, no keys) so the caller falls back to the scripted reaction and the
// demo never breaks. Times out fast so the "typing" beat never hangs.
async function fetchAiReply(
  contact: { name?: string; title?: string; company?: string } | null | undefined,
  history: { from: 'me' | 'them'; body: string }[],
): Promise<string | null> {
  if (!contact?.name) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch('/.netlify/functions/crmReply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        contact: { name: contact.name, title: contact.title, company: contact.company },
        history,
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const reply = data?.reply;
    return typeof reply === 'string' && reply.trim() ? reply.trim() : null;
  } catch {
    return null;
  }
}

// Score an outgoing reply the way a sales coach would, so the user can reflect on
// HOW they responded — did they personalise, propose a next step, invite a reply?
function coachReply(body: string, firstName: string) {
  const b = body.trim();
  const personalized = firstName ? b.toLowerCase().includes(firstName.toLowerCase()) : false;
  const nextStep = /\b(call|meet(ing)?|demo|schedul|calendar|book|zoom|time|walkthrough|invite)\b/i.test(b);
  const question = b.includes('?');
  const tooShort = b.length < 15;
  let score = (personalized ? 1 : 0) + (nextStep ? 1 : 0) + (question ? 1 : 0);
  if (tooShort) score = Math.max(0, score - 1);
  const tips: string[] = [];
  if (!personalized) tips.push(`Use ${firstName || 'their'} name to personalise it`);
  if (!nextStep) tips.push('Propose a clear next step — a call or a demo');
  if (!question && !tooShort) tips.push('End on a question to keep the thread moving');
  if (tooShort) tips.push('A one-liner reads as curt — add a little context');
  const warmth: Warmth = score >= 2 ? 'warm' : score === 1 ? 'neutral' : 'cool';
  return { score, tips: tips.slice(0, 2), warmth };
}

// The buyer's simulated reply — reacts to BOTH intent (what you offered) and
// quality (how warmly you wrote it), so good replies earn enthusiastic ones.
// Each intent has several variants and we skip whatever the buyer said last, so
// a thread never loops the same line back at you (`avoid` = their previous reply).
function inboundReaction(body: string, firstName: string, avoid = ''): { body: string; warmth: Warmth } {
  const { warmth } = coachReply(body, firstName);
  const b = body.toLowerCase();
  let variants: string[];
  if (/\b(pric|quote|cost|discount|budget|plan)\b/.test(b)) variants = [
    'Thanks for the numbers — can you put together a formal quote I can take to my finance team?',
    'That works for our budget. Send the quote across and I’ll kick off sign-off.',
    'Appreciate it — once the quote lands I’ll loop in finance and come back to you.',
    'Good, that’s in range. What would the annual plan look like versus monthly?',
  ];
  else if (/\b(call|meet|demo|schedul|calendar|book|zoom|time|invite)\b/.test(b)) variants = [
    "Sounds good — I'm free Thursday afternoon. Send the invite and I'll be there.",
    'Perfect, put something in the diary for next week and I’ll make it work.',
    'A quick call works — mornings suit me best if you’ve got a slot.',
  ];
  else if (/\b(sorry|apolog|delay|late)\b/.test(b)) variants = [
    'No problem at all — I appreciate you keeping me in the loop.',
    'These things happen — thanks for the heads up.',
  ];
  else if (/\b(thank|thanks|appreciate|welcome)\b/.test(b)) variants = [
    'Likewise — really looking forward to working together on this.',
    'Thanks again, you’ve made this easy. Talk soon.',
  ];
  else if (/\b(support|issue|bug|problem|broke|error|ticket|fix|fault|outage|down)\b/.test(b)) variants = [
    'Great, thanks for chasing that up. I’ll keep an eye out for their message.',
    'Appreciate you jumping on it — I’ll watch for the follow-up.',
  ];
  else if (/\b(onboard|get started|getting started|implement|roll ?out|set ?up|setup|training|migrat|import)\b/.test(b)) variants = [
    'That’s reassuring — two weeks is very manageable. What do you need from us to kick off?',
    'Great, the timeline works for us. I’ll line up the team for the training session.',
    'Perfect. Who handles the data import — is that your side or ours?',
  ];
  else if (/\b(proposal|document|scope|spec|deck|next step|timeline)\b/.test(b)) variants = [
    'Perfect — send it over and I’ll review with the team this week.',
    'That’s helpful, thanks. Anything you need from our side before we start?',
  ];
  else variants = [
    'Got it, thanks. Let me run this past the team and come back to you.',
    'Understood — I’ll review and get back to you shortly.',
    'Makes sense. I’ll take a look and follow up.',
  ];
  // Don't echo the buyer's own last line (opener is a prefix, so substring-match).
  const pool = variants.filter((v) => !avoid || !avoid.includes(v));
  const choices = pool.length ? pool : variants;
  const base = choices[Math.floor(Math.random() * choices.length)];
  // A varied, occasional opener signals tone without templating every reply.
  const openers: Record<Warmth, string[]> = {
    warm: ['This is really helpful — ', 'Brilliant — ', 'Perfect — '],
    cool: ['Okay. ', 'Right. ', 'Noted. '],
    neutral: ['', 'Thanks — ', ''],
  };
  const bank = openers[warmth];
  const opener = Math.random() < 0.6 ? bank[Math.floor(Math.random() * bank.length)] : '';
  return { body: opener + base, warmth };
}

// Toast stack (bottom-right). Each is dismissed on a timer by the caller.
function Toasts({ items, onDismiss, onOpen }: { items: Toast[]; onDismiss: (id: number) => void; onOpen: (id: string) => void }) {
  const dot: Record<Toast['tone'], string> = {
    info: 'bg-sky-400', success: 'bg-emerald-400', warn: 'bg-amber-400', coach: 'bg-[var(--brand-bright)]',
  };
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[80] flex w-[min(92vw,340px)] flex-col gap-2">
      {items.map((t) => {
        const clickable = Boolean(t.contactId);
        return (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border border-white/10 bg-[var(--surface)]/95 px-3.5 py-2.5 text-sm text-[var(--text)] shadow-xl backdrop-blur animate-[slideIn_.25s_ease] ${clickable ? 'cursor-pointer transition-colors hover:border-[var(--brand-bright)]/40 hover:bg-[var(--surface)]' : ''}`}
          onClick={clickable ? () => { onOpen(t.contactId!); onDismiss(t.id); } : undefined}
          role={clickable ? 'button' : undefined}
        >
          {t.tone === 'coach'
            ? <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--brand-bright)]" />
            : <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[t.tone]}`} />}
          <span className="min-w-0 flex-1">
            {t.text}
            {clickable && <span className="mt-0.5 block text-[11px] text-[var(--brand-bright)]">View activity →</span>}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onDismiss(t.id); }} className="shrink-0 text-[var(--muted)] hover:text-white"><X size={13} /></button>
        </div>
        );
      })}
    </div>
  );
}

export default function CrmPage() {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [losingId, setLosingId] = useState<string | null>(null);

  // Live-simulation state: toast notifications, inbox "typing…", and a running
  // count of ambient events so the header can show the workspace is alive.
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [lastSync, setLastSync] = useState(Date.now());
  const toastSeq = useRef(0);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback((text: string, tone: Toast['tone'] = 'info', contactId?: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t.slice(-3), { id, text, tone, contactId }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'coach' ? 6500 : 5200);
  }, []);
  // Append an activity (append-only, always safe) — the currency of "reactions".
  const pushActivity = useCallback((contactId: string, type: ActivityType, subject: string) =>
    setActivities((as) => [{ id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, contactId, subject, at: Date.now(), done: true, owner: OWNERS[0] }, ...as].slice(0, 250)), []);

  useEffect(() => {
    let cancelled = false;
    fetchCrmData().then((d) => {
      if (cancelled) return;
      setContacts(d.contacts);
      setCompanies(d.companies);
      setLeads(d.leads);
      setCases(d.cases);
      setDeals(d.deals);
      setActivities(d.activities);
      setTasks(d.tasks);
      setMeetings(d.meetings);
      setThreads(d.threads);
      setTemplates(d.templates);
      setInvoices(d.invoices);
      setCampaigns(d.campaigns);
      setAutomations(d.automations);
      setSource(d.source);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const byId = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);

  // Latest data for the ambient engine, without re-arming the interval on every
  // state change.
  const simRef = useRef({ contacts, deals, invoices, cases, campaigns, byId });
  simRef.current = { contacts, deals, invoices, cases, campaigns, byId };

  // ── Ambient "real-time" engine ──────────────────────────────────────────────
  // Every few seconds the workspace does something on its own — an email opens,
  // a teammate leaves a note, a payment lands — so the demo feels live. Paused
  // when the tab is hidden. Everything stays in the browser.
  useEffect(() => {
    if (loading) return;
    const pickR = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];
    const tick = () => {
      if (document.hidden) return;
      const { contacts: cs, deals: ds, invoices: iv, cases: cases_, campaigns: cps, byId: bid } = simRef.current;
      if (!cs.length) return;
      const c = pickR(cs)!;
      const first = c.name.split(' ')[0];
      const mate = pickR(OWNERS.filter((o) => o !== OWNERS[0])) ?? OWNERS[1];
      const roll = Math.random();

      if (roll < 0.22) {
        notify(`${c.name} opened your email`, 'info', c.id);
        pushActivity(c.id, 'Email', 'Opened your last email');
      } else if (roll < 0.4 && cps.length) {
        notify(`${first} clicked a link in “${pickR(cps)!.name}”`, 'info', c.id);
        pushActivity(c.id, 'Email', 'Clicked a campaign link');
      } else if (roll < 0.56) {
        notify(`${mate} left a note on ${c.name}`, 'info', c.id);
        pushActivity(c.id, 'Note', `Note from ${mate}`);
      } else if (roll < 0.72) {
        notify(`New lead captured from ${pickR(LEAD_SOURCES)}`, 'success');
      } else if (roll < 0.86) {
        const openCase = cases_.find((x) => x.status === 'Open' || x.status === 'Pending');
        if (openCase) notify(`SLA reminder: a support case is awaiting your reply`, 'warn');
        else { notify(`${c.name} viewed your proposal`, 'info', c.id); pushActivity(c.id, 'Note', 'Viewed your proposal'); }
      } else {
        const unpaid = iv.find((x) => x.status !== 'Paid');
        if (unpaid) {
          setInvoices((list) => list.map((x) => (x.id === unpaid.id ? { ...x, status: 'Paid' } : x)));
          const payer = bid[unpaid.contactId];
          notify(`Payment received${payer ? ` from ${payer.name}` : ''} — invoice marked paid`, 'success', payer?.id);
          if (payer) pushActivity(payer.id, 'Note', 'Invoice paid');
        } else {
          notify(`${c.name} booked a meeting`, 'success', c.id);
          pushActivity(c.id, 'Meeting', 'Booked a meeting');
        }
      }
      setLiveCount((n) => n + 1);
      setLastSync(Date.now());
    };
    const iv = window.setInterval(tick, 7000);
    return () => window.clearInterval(iv);
  }, [loading, notify, pushActivity]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const advanceDeal = (id: string) => {
    const d = deals.find((x) => x.id === id);
    if (!d) return;
    const order: Stage[] = ['Lead In', 'Contacted', 'Proposal', 'Negotiation', 'Won'];
    const idx = order.indexOf(d.stage);
    if (idx < 0 || idx >= order.length - 1) { notify(`${d.title} is already at the final stage`, 'info'); return; }
    const next = order[idx + 1];
    setDeals((ds) => ds.map((x) => (x.id === id ? { ...x, stage: next, probability: STAGE_PROB[next] } : x)));
    const c = byId[d.contactId];
    // Reaction 1: log the stage change on the timeline.
    notify(next === 'Won' ? `${d.title} marked Won — ${money(d.value)}` : `${d.title} advanced to ${next} · win probability now ${STAGE_PROB[next]}%`, next === 'Won' ? 'success' : 'info');
    pushActivity(d.contactId, 'Note', `Deal moved to ${next}`);
    // Reaction 2: advancing an open deal spins up a follow-up task automatically.
    if (next !== 'Won') {
      setTasks((ts) => [{ id: `t-${Date.now()}`, contactId: d.contactId, title: `Follow up on “${d.title}” (${next})`, priority: next === 'Negotiation' ? 'High' : 'Medium', dueAt: Date.now() + 2 * 86_400_000, done: false, owner: OWNERS[0] }, ...ts]);
    }
    // Reaction 3: at proposal/negotiation the buyer reacts a couple of seconds later.
    if (next === 'Proposal' || next === 'Negotiation') {
      window.setTimeout(() => {
        notify(`${c?.name ?? 'The buyer'} reviewed the ${next.toLowerCase()} and has a question`, 'info');
        pushActivity(d.contactId, 'Email', `Question on the ${next.toLowerCase()}`);
      }, 2400);
    }
  };
  const loseDeal = (id: string, reason: string, competitor: string) => {
    const d = deals.find((x) => x.id === id);
    setDeals((ds) => ds.map((x) => (x.id === id ? { ...x, stage: 'Lost', probability: 0, lostReason: reason, competitor } : x)));
    setLosingId(null);
    if (d) { notify(`${d.title} marked Lost — ${reason}`, 'warn'); pushActivity(d.contactId, 'Note', `Deal lost to ${competitor} (${reason})`); }
  };

  // Lead qualification & conversion (ERPNext lead → opportunity / EspoCRM convert).
  const advanceLead = (id: string) => {
    const l = leads.find((x) => x.id === id);
    if (!l || l.status === 'Converted' || l.status === 'Unqualified') return;
    const order: LeadStatus[] = ['New', 'Contacted', 'Qualified'];
    const idx = order.indexOf(l.status);
    if (idx < 0 || idx >= order.length - 1) return;
    const next = order[idx + 1];
    setLeads((ls) => ls.map((x) => (x.id === id ? { ...x, status: next } : x)));
    notify(next === 'Qualified' ? `${l.name} is now Qualified — ready to convert` : `${l.name} moved to ${next}`, next === 'Qualified' ? 'success' : 'info');
  };
  const disqualifyLead = (id: string) => {
    const l = leads.find((x) => x.id === id);
    setLeads((ls) => ls.map((x) => (x.id === id ? { ...x, status: 'Unqualified' } : x)));
    if (l) notify(`${l.name} marked Unqualified`, 'warn');
  };
  const convertLead = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === 'Converted') return;
    const contactId = `c-${Date.now()}`;
    const dealId = `d-${Date.now()}`;
    // 1) Lead becomes a Contact (a Customer/Prospect).
    setContacts((cs) => [
      {
        id: contactId, name: lead.name, email: lead.email, phone: lead.phone, avatar: lead.avatar,
        company: lead.company, title: lead.title, location: '—', status: 'Prospect',
        owner: lead.owner, source: lead.source, tags: ['Converted'], createdAt: Date.now(),
      },
      ...cs,
    ]);
    // 2) Company is created if it doesn't already exist.
    setCompanies((co) =>
      co.some((x) => x.name === lead.company)
        ? co.map((x) => (x.name === lead.company ? { ...x, contactIds: [...x.contactIds, contactId] } : x))
        : [...co, { id: `co-${Date.now()}`, name: lead.company, industry: '—', size: '—', website: `www.${lead.company.toLowerCase().replace(/[^a-z]+/g, '')}.com`, contactIds: [contactId] }]);
    // 3) An Opportunity (deal) is opened in the pipeline.
    setDeals((ds) => [
      {
        id: dealId, title: `New opportunity — ${lead.company}`, contactId, value: lead.estValue,
        stage: 'Contacted', probability: STAGE_PROB.Contacted, expectedClose: Date.now() + 45 * 86_400_000, owner: lead.owner,
      },
      ...ds,
    ]);
    // 4) Lead is marked Converted and linked to the new records.
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: 'Converted', convertedContactId: contactId, convertedDealId: dealId } : l)));
    pushActivity(contactId, 'Note', `Lead converted — contact, company & opportunity created`);
    notify(`${lead.name} converted → contact, company & a ${money(lead.estValue)} opportunity created`, 'success');
    setSelectedId(contactId);
    setTab('contacts');
  };

  const advanceCase = (id: string) =>
    setCases((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const order: CaseStatus[] = ['Open', 'Pending', 'Replied', 'Resolved', 'Closed'];
      const idx = order.indexOf(c.status);
      const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : c.status;
      return { ...c, status: next, updatedAt: Date.now() };
    }));
  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const toggleAutomation = (id: string) =>
    setAutomations((as) => as.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  const markPaid = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    setInvoices((iv) => iv.map((i) => (i.id === id ? { ...i, status: 'Paid' } : i)));
    if (inv) { notify(`Invoice marked paid — ${money(invoiceTotal(inv))} received`, 'success'); pushActivity(inv.contactId, 'Note', 'Payment received — invoice paid'); }
  };
  const logActivity = (contactId: string, type: ActivityType, subject: string) =>
    setActivities((as) => [
      { id: `a-${Date.now()}`, type, contactId, subject, at: Date.now(), done: false, owner: OWNERS[0] },
      ...as,
    ]);
  const addTask = (contactId: string, title: string, priority: Priority, dueAt: number) =>
    setTasks((ts) => [
      { id: `t-${Date.now()}`, contactId, title, priority, dueAt, done: false, owner: OWNERS[0] },
      ...ts,
    ]);
  const replyThread = (id: string, body: string) => {
    // Your message goes out immediately…
    const thread = threads.find((t) => t.id === id);
    const c = thread ? byId[thread.contactId] : null;
    const first = c?.name.split(' ')[0] ?? '';
    // Build the history the AI sees (prior turns + the message just sent).
    const priorMsgs = thread ? thread.messages.map((m) => ({ from: m.from, body: m.body })) : [];
    const history = [...priorMsgs, { from: 'me' as const, body }];
    // The buyer's own last line — so the scripted fallback never echoes it back.
    const lastInbound = thread ? [...thread.messages].reverse().find((m) => m.from === 'them')?.body ?? '' : '';

    setThreads((th) => th.map((t) =>
      t.id === id ? { ...t, unread: false, messages: [...t.messages, { from: 'me', at: Date.now(), body }] } : t));
    setTypingId(id);

    // The buyer "types", then replies — an AI-generated response that actually reads
    // what you said, with the scripted reaction as a graceful fallback.
    const started = Date.now();
    const deliver = (reply: string) => {
      const wait = Math.max(0, 1400 - (Date.now() - started)); // keep the typing beat natural
      window.setTimeout(() => {
        setThreads((th) => th.map((t) =>
          t.id === id ? { ...t, messages: [...t.messages, { from: 'them', at: Date.now(), body: reply }] } : t));
        setTypingId((cur) => (cur === id ? null : cur));
        if (thread) { notify(`${c?.name ?? 'The contact'} replied to your message`, 'info', thread.contactId); pushActivity(thread.contactId, 'Email', 'Replied to your message'); }
      }, wait);
    };

    fetchAiReply(c, history)
      .then((aiReply) => deliver(aiReply ?? inboundReaction(body, first, lastInbound).body))
      .catch(() => deliver(inboundReaction(body, first, lastInbound).body));
  };
  const markThreadRead = (id: string) =>
    setThreads((th) => th.map((t) => (t.id === id ? { ...t, unread: false } : t)));

  const addContact = (c: { name: string; email: string; company: string; title: string; status: Status; source: string }) => {
    const id = `c-${Date.now()}`;
    setContacts((cs) => [
      { ...c, id, phone: '—', avatar: avatarFor(c.name), tags: ['Inbound'], owner: OWNERS[0], location: '—', createdAt: Date.now() },
      ...cs,
    ]);
    setCompanies((co) =>
      co.some((x) => x.name === c.company) || !c.company
        ? co
        : [...co, { id: `co-${Date.now()}`, name: c.company, industry: '—', size: '—', website: '—', contactIds: [id] }]);
    setAddOpen(false);
    setTab('contacts');
    setSelectedId(id);
  };

  const selected = selectedId ? byId[selectedId] : null;
  const go = (t: Tab) => { setTab(t); setNavOpen(false); };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNavOpen((v) => !v)}
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
              Andrew<span className="text-[var(--brand-bright)]">.</span>CRM
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300 sm:inline-flex" title={`${liveCount} live update${liveCount === 1 ? '' : 's'} this session · synced ${relTime(lastSync)}`}>
              <Radio size={11} className="animate-pulse" /> Live
              <span className="text-emerald-300/60">· synced {relTime(lastSync)}</span>
            </span>
          </div>
          <Link to="/#work" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white">
            <ArrowLeft size={15} /> Back to portfolio
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside
          className={`${navOpen ? 'block' : 'hidden'} fixed inset-x-0 top-[57px] z-20 border-b border-white/10 bg-[var(--bg)] px-3 py-3 lg:sticky lg:top-[57px] lg:block lg:h-[calc(100vh-57px)] lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-6`}
        >
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                  tab === n.id
                    ? 'bg-[var(--brand-bright)] font-medium text-[#0b0d10]'
                    : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
                }`}
              >
                <n.icon size={16} className="shrink-0" /> {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="font-display text-2xl text-white">{NAV.find((n) => n.id === tab)?.label}</h1>
            {(tab === 'contacts' || tab === 'dashboard') && (
              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-bright)] px-4 py-2 text-sm font-medium text-[#0b0d10] transition-colors hover:bg-white"
              >
                <Plus size={15} /> New contact
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-24 text-center text-[var(--muted)]">Loading sample data…</div>
          ) : (
            <>
              {tab === 'dashboard' && (
                <Dashboard {...{ contacts, deals, activities, tasks, meetings, invoices, byId, source, go }} />
              )}
              {tab === 'leads' && (
                <LeadsView leads={leads} onAdvance={advanceLead} onDisqualify={disqualifyLead} onConvert={convertLead} />
              )}
              {tab === 'contacts' && (
                <Contacts contacts={contacts} onOpen={setSelectedId} dealsFor={(id) => deals.filter((d) => d.contactId === id)} />
              )}
              {tab === 'companies' && <Companies companies={companies} contacts={contacts} deals={deals} onOpen={setSelectedId} />}
              {tab === 'pipeline' && <Pipeline deals={deals} byId={byId} onAdvance={advanceDeal} onLose={(id) => setLosingId(id)} />}
              {tab === 'tasks' && <Tasks tasks={tasks} byId={byId} contacts={contacts} onToggle={toggleTask} onAdd={addTask} />}
              {tab === 'calendar' && <CalendarView meetings={meetings} byId={byId} />}
              {tab === 'inbox' && (
                <InboxView threads={threads} byId={byId} templates={templates} onReply={replyThread} onRead={markThreadRead} typingId={typingId} />
              )}
              {tab === 'cases' && <CasesView cases={cases} byId={byId} onAdvance={advanceCase} />}
              {tab === 'invoices' && <Invoices invoices={invoices} byId={byId} onPaid={markPaid} />}
              {tab === 'campaigns' && <Campaigns campaigns={campaigns} />}
              {tab === 'automations' && <Automations automations={automations} onToggle={toggleAutomation} />}
              {tab === 'reports' && <Reports deals={deals} invoices={invoices} contacts={contacts} campaigns={campaigns} />}
              {tab === 'settings' && <SettingsView contacts={contacts} source={source} />}
            </>
          )}
        </main>
      </div>

      {selected && (
        <ContactDrawer
          contact={selected}
          deals={deals.filter((d) => d.contactId === selected.id)}
          activities={activities.filter((a) => a.contactId === selected.id).sort((a, b) => b.at - a.at)}
          tasks={tasks.filter((t) => t.contactId === selected.id)}
          onClose={() => setSelectedId(null)}
          onLog={(type, subject) => logActivity(selected.id, type, subject)}
        />
      )}
      {addOpen && <AddContactModal onClose={() => setAddOpen(false)} onAdd={addContact} />}
      <Toasts items={toasts} onDismiss={dismissToast} onOpen={setSelectedId} />
      {losingId && (
        <LostDealModal
          deal={deals.find((d) => d.id === losingId)!}
          onClose={() => setLosingId(null)}
          onConfirm={(reason, competitor) => loseDeal(losingId, reason, competitor)}
        />
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({
  contacts, deals, activities, tasks, meetings, invoices, byId, source, go,
}: {
  contacts: Contact[]; deals: Deal[]; activities: Activity[]; tasks: Task[];
  meetings: Meeting[]; invoices: Invoice[]; byId: Record<string, Contact>;
  source: string; go: (t: Tab) => void;
}) {
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const pipeline = open.reduce((s, d) => s + d.value, 0);
  const weighted = open.reduce((s, d) => s + (d.value * d.probability) / 100, 0);
  const paid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + invoiceTotal(i), 0);
  const outstanding = invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + invoiceTotal(i), 0);
  const openTasks = tasks.filter((t) => !t.done).length;
  const overdue = tasks.filter((t) => !t.done && t.dueAt < Date.now()).length;
  const upcomingMeetings = meetings.filter((m) => m.startAt > Date.now()).sort((a, b) => a.startAt - b.startAt).slice(0, 4);
  const dueTasks = tasks.filter((t) => !t.done).sort((a, b) => a.dueAt - b.dueAt).slice(0, 5);
  const recent = [...activities].sort((a, b) => b.at - a.at).slice(0, 6);

  const stageCounts = STAGES.map((s) => ({
    stage: s,
    value: deals.filter((d) => d.stage === s).reduce((a, d) => a + d.value, 0),
    count: deals.filter((d) => d.stage === s).length,
  }));
  const maxVal = Math.max(1, ...stageCounts.map((s) => s.value));

  const cards = [
    { label: 'Contacts', value: contacts.length.toString(), icon: Users, tab: 'contacts' as Tab },
    { label: 'Open deals', value: open.length.toString(), icon: Target, tab: 'pipeline' as Tab },
    { label: 'Pipeline value', value: money(pipeline), icon: DollarSign, tab: 'pipeline' as Tab },
    { label: 'Weighted forecast', value: money(weighted), icon: TrendingUp, tab: 'reports' as Tab },
    { label: 'Revenue (paid)', value: money(paid), icon: Check, tab: 'invoices' as Tab },
    { label: 'Outstanding', value: money(outstanding), icon: FileText, tab: 'invoices' as Tab },
    { label: 'Open tasks', value: openTasks.toString(), icon: CheckSquare, tab: 'tasks' as Tab },
    { label: 'Overdue', value: overdue.toString(), icon: AlertTriangle, tab: 'tasks' as Tab },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => go(c.tab)} className={`${card} p-4 text-left transition-colors hover:border-white/25`}>
            <c.icon size={16} className="text-[var(--brand-bright)]" />
            <div className="mt-3 font-display text-2xl text-white">{c.value}</div>
            <div className="text-xs text-[var(--muted)]">{c.label}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${card} p-6 lg:col-span-2`}>
          <h3 className="font-display text-lg text-white">Pipeline by stage</h3>
          <div className="mt-4 space-y-3">
            {stageCounts.map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">{s.stage} <span className="opacity-60">· {s.count}</span></span>
                  <span className="text-white">{money(s.value)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-[var(--brand-bright)]" style={{ width: `${(s.value / maxVal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} p-6`}>
          <h3 className="flex items-center gap-2 font-display text-lg text-white"><Calendar size={17} className="text-[var(--brand-bright)]" /> Upcoming</h3>
          <ul className="mt-4 space-y-3">
            {upcomingMeetings.map((m) => (
              <li key={m.id} className="text-sm">
                <div className="text-white">{m.title}</div>
                <div className="text-xs text-[var(--muted)]">{fmtDay(m.startAt)} · {fmtTime(m.startAt)} · {m.location}</div>
              </li>
            ))}
            {upcomingMeetings.length === 0 && <li className="text-sm text-[var(--muted)]">No upcoming meetings.</li>}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${card} p-6`}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-white">Tasks due</h3>
            <button onClick={() => go('tasks')} className="text-xs text-[var(--brand-bright)]">View all</button>
          </div>
          <ul className="mt-4 space-y-2">
            {dueTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl bg-[var(--bg-soft)] px-3 py-2 text-sm">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PRIO_STYLE[t.priority]}`}>{t.priority}</span>
                <span className="min-w-0 flex-1 truncate text-white">{t.title}</span>
                <span className={`shrink-0 text-xs ${t.dueAt < Date.now() ? 'text-rose-300' : 'text-[var(--muted)]'}`}>{fmtDate(t.dueAt)}</span>
              </li>
            ))}
            {dueTasks.length === 0 && <li className="text-sm text-[var(--muted)]">All caught up.</li>}
          </ul>
        </div>

        <div className={`${card} p-6`}>
          <h3 className="font-display text-lg text-white">Recent activity</h3>
          <ul className="mt-4 space-y-3">
            {recent.map((a) => {
              const Icon = ACT_ICON[a.type];
              return (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--brand-bright)]"><Icon size={14} /></span>
                  <span className="min-w-0 flex-1 truncate">{a.subject} <span className="text-[var(--muted)]">· {byId[a.contactId]?.name ?? '—'}</span></span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">{fmtDate(a.at)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <ApiCredit source={source} />
    </div>
  );
}

// ── Contacts ─────────────────────────────────────────────────────────────────
function Contacts({
  contacts, onOpen, dealsFor,
}: { contacts: Contact[]; onOpen: (id: string) => void; dealsFor: (id: string) => Deal[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | Status>('All');
  const filtered = contacts.filter((c) => {
    if (status !== 'All' && c.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.company, c.email, c.title].some((f) => f.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2">
          <Search size={16} className="text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company, email…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--muted)]" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white outline-none">
          <option value="All">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Deals</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c.id)} className="cursor-pointer border-t border-white/5 transition-colors hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={c.avatar} name={c.name} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{c.name}</div>
                      <div className="truncate text-xs text-[var(--muted)]">{c.title}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{c.company}</td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3 text-[var(--muted)]">{c.source}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{c.owner}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{dealsFor(c.id).length}</td>
                <td className="px-4 py-3 text-right"><ChevronRight size={16} className="text-[var(--muted)]" /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">No contacts match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Companies ────────────────────────────────────────────────────────────────
function Companies({
  companies, contacts, deals, onOpen,
}: { companies: Company[]; contacts: Contact[]; deals: Deal[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {companies.map((co) => {
        const people = contacts.filter((c) => co.contactIds.includes(c.id));
        const value = deals.filter((d) => people.some((p) => p.id === d.contactId) && OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + d.value, 0);
        return (
          <div key={co.id} className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[var(--brand-bright)]"><Building2 size={18} /></span>
              <div className="min-w-0">
                <div className="truncate font-medium text-white">{co.name}</div>
                <div className="text-xs text-[var(--muted)]">{co.industry} · {co.size}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Open pipeline</span>
              <span className="text-[var(--brand-bright)]">{money(value)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex -space-x-2">
                {people.slice(0, 4).map((p) => <Avatar key={p.id} src={p.avatar} name={p.name} size={26} />)}
                {people.length > 4 && <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10 bg-[var(--bg-soft)] text-[10px] text-[var(--muted)]">+{people.length - 4}</span>}
              </div>
              {people[0] && <button onClick={() => onOpen(people[0].id)} className="text-xs text-[var(--brand-bright)]">Open →</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Pipeline ─────────────────────────────────────────────────────────────────
// ── Leads ────────────────────────────────────────────────────────────────────
function LeadsView({
  leads, onAdvance, onDisqualify, onConvert,
}: {
  leads: Lead[]; onAdvance: (id: string) => void; onDisqualify: (id: string) => void; onConvert: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'active' | 'all' | LeadStatus>('active');
  const shown = leads.filter((l) => {
    if (filter === 'active') return l.status !== 'Converted' && l.status !== 'Unqualified';
    if (filter === 'all') return true;
    return l.status === filter;
  });
  const kpi = [
    ['New', leads.filter((l) => l.status === 'New').length],
    ['Qualified', leads.filter((l) => l.status === 'Qualified').length],
    ['Converted', leads.filter((l) => l.status === 'Converted').length],
    ['Avg. score', leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpi.map(([label, value]) => (
          <div key={label} className={`${card} p-4`}><div className="font-display text-xl text-white">{value}</div><div className="text-xs text-[var(--muted)]">{label}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(['active', 'New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${filter === f ? 'bg-[var(--brand-bright)] text-[#0b0d10]' : 'border border-white/10 text-[var(--muted)] hover:text-white'}`}>{f}</button>
        ))}
      </div>
      <div className={`${card} p-3 text-xs text-[var(--muted)]`}>
        <span className="text-white">Web-to-Lead:</span> new leads flow in from the website form and cold outreach, get scored and qualified, then <span className="text-[var(--brand-bright)]">convert</span> into a contact, a company, and an opportunity in one click.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr><th className="px-4 py-3 font-medium">Lead</th><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 font-medium">Score</th><th className="px-4 py-3 text-right font-medium">Est. value</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={l.avatar} name={l.name} size={34} />
                    <div className="min-w-0"><div className="truncate font-medium text-white">{l.name}</div><div className="truncate text-xs text-[var(--muted)]">{l.title} · {l.company}</div></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{l.source}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {l.score >= 70 && <Flame size={13} className="text-rose-300" />}
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--brand-bright)]" style={{ width: `${l.score}%` }} /></div>
                    <span className="text-xs text-[var(--muted)]">{l.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-white">{money(l.estValue)}</td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${LEAD_STATUS_STYLE[l.status]}`}>{l.status}</span></td>
                <td className="px-4 py-3">
                  {l.status === 'Converted' ? (
                    <span className="text-xs text-[var(--muted)]">→ contact + opportunity</span>
                  ) : l.status === 'Unqualified' ? (
                    <span className="text-xs text-[var(--muted)]/60">closed</span>
                  ) : (
                    <div className="flex justify-end gap-1.5">
                      {l.status !== 'Qualified' && <button onClick={() => onAdvance(l.id)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:text-white">Advance</button>}
                      <button onClick={() => onConvert(l.id)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-bright)] px-2.5 py-1 text-xs font-medium text-[#0b0d10] transition-colors hover:bg-white"><ArrowRightLeft size={12} /> Convert</button>
                      <button onClick={() => onDisqualify(l.id)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:text-rose-300">Disqualify</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">No leads in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Cases (support) ──────────────────────────────────────────────────────────
function CasesView({
  cases, byId, onAdvance,
}: { cases: SupportCase[]; byId: Record<string, Contact>; onAdvance: (id: string) => void }) {
  const [filter, setFilter] = useState<'open' | 'all' | CaseStatus>('open');
  const now = Date.now();
  const slaOf = (c: SupportCase) => caseSla(c, now);
  const isBreached = (c: SupportCase) => {
    const s = slaOf(c);
    return s.responseState === 'Breached' || s.resolutionState === 'Breached';
  };
  const shown = cases.filter((c) => {
    if (filter === 'open') return c.status !== 'Resolved' && c.status !== 'Closed';
    if (filter === 'all') return true;
    return c.status === filter;
  }).sort((a, b) => b.updatedAt - a.updatedAt);
  const openCases = cases.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed');
  const kpi = [
    ['Open', openCases.length],
    ['SLA breached', openCases.filter(isBreached).length],
    ['Awaiting reply', cases.filter((c) => c.status === 'Pending').length],
    ['Total', cases.length],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpi.map(([label, value]) => (
          <div key={label} className={`${card} p-4`}>
            <div className={`font-display text-xl ${label === 'SLA breached' && value ? 'text-rose-300' : 'text-white'}`}>{value}</div>
            <div className="text-xs text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </div>

      <div className={`${card} flex flex-wrap items-center gap-x-5 gap-y-1 p-3 text-xs text-[var(--muted)]`}>
        <span className="font-medium text-[var(--text)]">SLA policy</span>
        {(['High', 'Medium', 'Low'] as Priority[]).map((p) => (
          <span key={p}>
            <span className={`mr-1 rounded-full border px-2 py-0.5 ${PRIO_STYLE[p]}`}>{p}</span>
            respond {SLA_HOURS[p].response}h · resolve {SLA_HOURS[p].resolution}h
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['open', ...CASE_STATUSES, 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${filter === f ? 'bg-[var(--brand-bright)] text-[#0b0d10]' : 'border border-white/10 text-[var(--muted)] hover:text-white'}`}>{f}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr><th className="px-4 py-3 font-medium">Case</th><th className="px-4 py-3 font-medium">Contact</th><th className="px-4 py-3 font-medium">Priority</th><th className="px-4 py-3 font-medium">First response</th><th className="px-4 py-3 font-medium">Resolution</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const ct = byId[c.contactId];
              const sla = slaOf(c);
              const canAdvance = c.status !== 'Closed';
              const nextLabel = c.status === 'Open' ? 'Take' : c.status === 'Pending' ? 'Reply' : c.status === 'Replied' ? 'Resolve' : c.status === 'Resolved' ? 'Close' : '';
              return (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{c.subject}</div>
                    <div className="text-xs text-[var(--muted)]">{c.number} · {c.type} · opened {fmtDate(c.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{ct?.name ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${PRIO_STYLE[c.priority]}`}>{c.priority}</span></td>
                  <td className="px-4 py-3"><SlaCell state={sla.responseState} dueAt={sla.responseDueAt} now={now} /></td>
                  <td className="px-4 py-3"><SlaCell state={sla.resolutionState} dueAt={sla.resolutionDueAt} now={now} /></td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${CASE_STATUS_STYLE[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-right">{canAdvance && nextLabel && <button onClick={() => onAdvance(c.id)} className="rounded-lg bg-[var(--brand-bright)] px-2.5 py-1 text-xs font-medium text-[#0b0d10] transition-colors hover:bg-white">{nextLabel}</button>}</td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">No cases in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// One SLA target cell: a coloured state badge plus the due/overdue countdown
// (hidden once the target is met).
function SlaCell({ state, dueAt, now }: { state: SlaState; dueAt: number; now: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${SLA_STYLE[state]}`}>{state}</span>
      {state !== 'Met' && <span className="text-[11px] text-[var(--muted)]">{relTime(dueAt, now)}</span>}
    </div>
  );
}

// ── Lost-deal modal (reason + competitor) ─────────────────────────────────────
function LostDealModal({
  deal, onClose, onConfirm,
}: { deal: Deal; onClose: () => void; onConfirm: (reason: string, competitor: string) => void }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [competitor, setCompetitor] = useState(COMPETITORS[0]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-md p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-white">Mark deal as lost</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white"><X size={18} /></button>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">{money(deal.value)} · {deal.title}</p>
        <label className="mt-4 block text-xs uppercase tracking-wide text-[var(--muted)]">Lost reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${field}`}>
          {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label className="mt-4 block text-xs uppercase tracking-wide text-[var(--muted)]">Lost to competitor</label>
        <select value={competitor} onChange={(e) => setCompetitor(e.target.value)} className={`mt-1 ${field}`}>
          {COMPETITORS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--muted)] hover:text-white">Cancel</button>
          <button onClick={() => onConfirm(reason, competitor)} className="rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500">Mark lost</button>
        </div>
      </div>
    </div>
  );
}

function Pipeline({
  deals, byId, onAdvance, onLose,
}: { deals: Deal[]; byId: Record<string, Contact>; onAdvance: (id: string) => void; onLose: (id: string) => void }) {
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const commit = deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0);
  const openValue = open.reduce((s, d) => s + d.value, 0);
  const weighted = open.reduce((s, d) => s + (d.value * d.probability) / 100, 0);
  const bestCase = commit + openValue;
  const wonCount = deals.filter((d) => d.stage === 'Won').length;
  const lostCount = deals.filter((d) => d.stage === 'Lost').length;
  const winRate = wonCount + lostCount ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
  const forecast = [
    ['Committed (Won)', money(commit)],
    ['Weighted forecast', money(commit + weighted)],
    ['Best case', money(bestCase)],
    ['Win rate', `${winRate}%`],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {forecast.map(([label, value]) => (
          <div key={label} className={`${card} p-4`}>
            <div className="font-display text-xl text-white">{value}</div>
            <div className="text-xs text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-[var(--muted)]">Weighted forecast sums each open deal by its stage probability — the number a sales manager actually forecasts on.</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const col = deals.filter((d) => d.stage === stage);
        const total = col.reduce((s, d) => s + d.value, 0);
        return (
          <div key={stage} className={`${card} p-3`}>
            <div className="flex items-center justify-between px-1"><span className="text-sm font-medium text-white">{stage}</span><span className="text-xs text-[var(--muted)]">{col.length}</span></div>
            <div className="mb-2 px-1 text-xs text-[var(--brand-bright)]">{money(total)}</div>
            <div className="space-y-2">
              {col.map((d) => {
                const c = byId[d.contactId];
                const canAdvance = stage !== 'Won' && stage !== 'Lost';
                return (
                  <div key={d.id} className="rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3">
                    <div className="text-sm font-medium text-white">{money(d.value)}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{d.title}</div>
                    {c && <div className="mt-2 flex items-center gap-2"><Avatar src={c.avatar} name={c.name} size={20} /><span className="truncate text-xs text-[var(--muted)]">{c.name}</span></div>}
                    <div className="mt-1 text-[10px] text-[var(--muted)]/70">{d.probability}% · {d.owner}</div>
                    {d.stage === 'Lost' && d.lostReason && (
                      <div className="mt-1.5 rounded-md bg-rose-500/10 px-1.5 py-1 text-[10px] text-rose-300/90">{d.lostReason}{d.competitor && d.competitor !== 'None' ? ` · ${d.competitor}` : ''}</div>
                    )}
                    {canAdvance && (
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={() => onAdvance(d.id)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--brand-bright)] px-2 py-1 text-[11px] font-medium text-[#0b0d10] transition-colors hover:bg-white">Advance <ChevronRight size={12} /></button>
                        <button onClick={() => onLose(d.id)} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-[var(--muted)] transition-colors hover:text-rose-300">Lost</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {col.length === 0 && <div className="px-1 py-4 text-center text-xs text-[var(--muted)]/50">—</div>}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── Tasks ────────────────────────────────────────────────────────────────────
function Tasks({
  tasks, byId, contacts, onToggle, onAdd,
}: {
  tasks: Task[]; byId: Record<string, Contact>; contacts: Contact[];
  onToggle: (id: string) => void; onAdd: (cid: string, title: string, p: Priority, due: number) => void;
}) {
  const [filter, setFilter] = useState<'open' | 'done' | 'overdue' | 'all'>('open');
  const [title, setTitle] = useState('');
  const [cid, setCid] = useState('');
  const [prio, setPrio] = useState<Priority>('Medium');

  const shown = tasks
    .filter((t) => {
      if (filter === 'open') return !t.done;
      if (filter === 'done') return t.done;
      if (filter === 'overdue') return !t.done && t.dueAt < Date.now();
      return true;
    })
    .sort((a, b) => a.dueAt - b.dueAt);

  const submit = () => {
    const contactId = cid || contacts[0]?.id;
    if (!contactId || !title.trim()) return;
    onAdd(contactId, title.trim(), prio, Date.now() + 3 * 86_400_000);
    setTitle('');
  };

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center gap-2 p-3`}>
        <select value={cid || contacts[0]?.id || ''} onChange={(e) => setCid(e.target.value)} className="rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none">
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={prio} onChange={(e) => setPrio(e.target.value as Priority)} className="rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none">
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="New task (due in 3 days)…" className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--muted)]" />
        <button onClick={submit} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-bright)] px-3 py-2 text-sm font-medium text-[#0b0d10] hover:bg-white"><Plus size={15} /> Add</button>
      </div>

      <div className="flex gap-2">
        {(['open', 'overdue', 'done', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${filter === f ? 'bg-[var(--brand-bright)] text-[#0b0d10]' : 'border border-white/10 text-[var(--muted)] hover:text-white'}`}>{f}</button>
        ))}
      </div>

      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
        {shown.map((t) => {
          const overdue = !t.done && t.dueAt < Date.now();
          return (
            <li key={t.id} className="flex items-center gap-3 bg-[var(--surface)] px-4 py-3">
              <button onClick={() => onToggle(t.id)} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${t.done ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border-white/20 text-transparent hover:border-white/40'}`} aria-label="Toggle"><Check size={14} /></button>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PRIO_STYLE[t.priority]}`}>{t.priority}</span>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm ${t.done ? 'text-[var(--muted)] line-through' : 'text-white'}`}>{t.title}</div>
                <div className="truncate text-xs text-[var(--muted)]">{byId[t.contactId]?.name ?? '—'} · {t.owner}</div>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 text-xs ${overdue ? 'text-rose-300' : 'text-[var(--muted)]'}`}><Clock size={12} /> {fmtDate(t.dueAt)}</span>
            </li>
          );
        })}
        {shown.length === 0 && <li className="bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--muted)]">Nothing here.</li>}
      </ul>
    </div>
  );
}

// ── Calendar (agenda) ────────────────────────────────────────────────────────
function CalendarView({ meetings, byId }: { meetings: Meeting[]; byId: Record<string, Contact> }) {
  const sorted = [...meetings].sort((a, b) => a.startAt - b.startAt);
  const groups = sorted.reduce<Record<string, Meeting[]>>((acc, m) => {
    const key = fmtDay(m.startAt);
    (acc[key] ||= []).push(m);
    return acc;
  }, {});
  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([day, items]) => (
        <div key={day}>
          <div className="mb-2 flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${items[0].startAt > Date.now() ? 'bg-[var(--brand-bright)]' : 'bg-white/20'}`} /> {day}
          </div>
          <div className="space-y-2">
            {items.map((m) => {
              const c = byId[m.contactId];
              return (
                <div key={m.id} className={`${card} flex items-center gap-4 p-4`}>
                  <div className="w-16 shrink-0 text-center">
                    <div className="font-display text-lg text-white">{fmtTime(m.startAt)}</div>
                    <div className="text-[10px] text-[var(--muted)]">{m.durationMin} min</div>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-white">{m.title}</div>
                    <div className="truncate text-xs text-[var(--muted)]">{m.kind} · {c?.name ?? '—'} · {m.owner}</div>
                  </div>
                  <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[var(--muted)] sm:inline">{m.location}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Inbox ────────────────────────────────────────────────────────────────────
function InboxView({
  threads, byId, templates, onReply, onRead, typingId,
}: {
  threads: EmailThread[]; byId: Record<string, Contact>; templates: EmailTemplate[];
  onReply: (id: string, body: string) => void; onRead: (id: string) => void; typingId: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(threads[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [coach, setCoach] = useState<{ warmth: Warmth; tips: string[] } | null>(null);
  const active = threads.find((t) => t.id === openId);
  const contact = active ? byId[active.contactId] : null;
  const first = contact?.name.split(' ')[0] ?? '';
  const isTyping = !!active && typingId === active.id;
  const endRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // Contextual quick replies — read the contact's LAST message and suggest matching
  // responses, so the options change with the conversation instead of a fixed list.
  const lastInbound = active
    ? [...active.messages].reverse().find((m) => m.from === 'them')?.body ?? ''
    : '';
  const suggestions = useMemo(() => suggestReplies(lastInbound), [lastInbound]);

  const fill = (body: string) =>
    contact ? body.replace(/{{first}}/g, first).replace(/{{company}}/g, contact.company) : body;

  // Reset the coaching note when you switch conversations.
  useEffect(() => setCoach(null), [openId]);
  // Keep the newest message (and the typing bubble) in view.
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages.length, isTyping]);
  // Grow the reply box to fit its text (up to a cap; then it scrolls internally),
  // whether the change comes from typing or from a clicked quick reply.
  useEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  const send = (raw?: string) => {
    const body = (raw ?? draft).trim();
    if (!active || !body) return;
    setCoach({ ...coachReply(body, first) }); // reflect on how the reply reads
    onReply(active.id, body);
    setDraft('');
  };

  const warmthUi: Record<Warmth, { label: string; cls: string }> = {
    warm: { label: 'Warm, well-pitched reply', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
    neutral: { label: 'Decent — room to warm it up', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
    cool: { label: 'A bit flat — see the tips', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <ul className="max-h-[70vh] divide-y divide-white/5 overflow-y-auto">
          {threads.map((t) => {
            const c = byId[t.contactId];
            const last = t.messages[t.messages.length - 1];
            return (
              <li key={t.id}>
                <button onClick={() => { setOpenId(t.id); onRead(t.id); }} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${openId === t.id ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                  {c && <Avatar src={c.avatar} name={c.name} size={34} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${t.unread ? 'font-semibold text-white' : 'text-[var(--text)]'}`}>{c?.name ?? '—'}</span>
                      <span className="shrink-0 text-[10px] text-[var(--muted)]">{fmtDate(last.at)}</span>
                    </div>
                    <div className="truncate text-xs text-[var(--muted)]">{t.subject}</div>
                    <div className="truncate text-xs text-[var(--muted)]/70">{last.body}</div>
                  </div>
                  {t.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-bright)]" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`${card} flex h-[70vh] min-h-[420px] flex-col`}>
        {active && contact ? (
          <>
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Avatar src={contact.avatar} name={contact.name} size={38} />
              <div className="min-w-0">
                <div className="truncate font-medium text-white">{active.subject}</div>
                <div className="truncate text-xs text-[var(--muted)]">{contact.name} · {contact.email}</div>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m, i) => (
                <div key={i} className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.from === 'me' ? 'ml-auto bg-[var(--brand-bright)] text-[#0b0d10]' : 'bg-[var(--bg-soft)] text-[var(--text)]'}`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <div className={`mt-1 text-[10px] ${m.from === 'me' ? 'text-[#0b0d10]/60' : 'text-[var(--muted)]'}`}>{fmtDate(m.at)} · {fmtTime(m.at)}</div>
                </div>
              ))}
              {isTyping && (
                <div className="flex max-w-[80%] items-center gap-1 rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
                  <span className="text-xs text-[var(--muted)]">{first} is typing</span>
                  <span className="ml-1 flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
                  </span>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t border-white/10 p-3">
              {coach && (
                <div className={`mb-2 rounded-xl border px-3 py-2 text-[11px] ${warmthUi[coach.warmth].cls}`}>
                  <div className="flex items-center gap-1.5 font-medium"><Sparkles size={12} /> {warmthUi[coach.warmth].label}</div>
                  {coach.tips.length > 0 && <ul className="mt-1 list-disc pl-4 opacity-90">{coach.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
                </div>
              )}
              {/* Suggested replies — matched to the contact's last message; click to
                  load the text into the reply box, review, then send. */}
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--muted)]"><Zap size={11} /> Suggested replies</div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {suggestions.map((q) => (
                  <button key={q.label} onClick={() => setDraft(fill(q.body))} className={quickReplyPill}>{q.label}</button>
                ))}
              </div>
              {templates.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {templates.map((tpl) => (
                    <button key={tpl.id} onClick={() => setDraft(fill(tpl.body))} className={quickReplyPill}>{tpl.name}</button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea ref={draftRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2} placeholder="Write a reply… (Enter to send, or pick a quick reply)" className="max-h-[180px] min-h-[52px] flex-1 resize-none overflow-y-auto rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--muted)]" />
                <button onClick={() => send()} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-bright)] px-3 py-2.5 text-sm font-medium text-[#0b0d10] hover:bg-white"><Send size={15} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">Select a conversation.</div>
        )}
      </div>
    </div>
  );
}

// ── Invoices ─────────────────────────────────────────────────────────────────
function Invoices({
  invoices, byId, onPaid,
}: { invoices: Invoice[]; byId: Record<string, Contact>; onPaid: (id: string) => void }) {
  const total = (s: InvoiceStatus) => invoices.filter((i) => i.status === s).reduce((a, i) => a + invoiceTotal(i), 0);
  const stats = [
    { label: 'Paid', value: money(total('Paid')), style: 'text-emerald-300' },
    { label: 'Sent', value: money(total('Sent')), style: 'text-sky-300' },
    { label: 'Overdue', value: money(total('Overdue')), style: 'text-rose-300' },
    { label: 'Draft', value: money(total('Draft')), style: 'text-[var(--muted)]' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`${card} p-4`}>
            <div className={`font-display text-xl ${s.style}`}>{s.value}</div>
            <div className="text-xs text-[var(--muted)]">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Issued</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-white/5">
                <td className="px-4 py-3 font-medium text-white">{inv.number}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{byId[inv.contactId]?.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{fmtDate(inv.issuedAt)}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{fmtDate(inv.dueAt)}</td>
                <td className="px-4 py-3 text-white">{money(invoiceTotal(inv))}</td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${INV_STYLE[inv.status]}`}>{inv.status}</span></td>
                <td className="px-4 py-3 text-right">
                  {inv.status !== 'Paid' && inv.status !== 'Draft' && (
                    <button onClick={() => onPaid(inv.id)} className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/25">Mark paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Campaigns ────────────────────────────────────────────────────────────────
function Campaigns({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {campaigns.map((c) => {
        const openRate = c.recipients ? Math.round((c.opens / c.recipients) * 100) : 0;
        const clickRate = c.recipients ? Math.round((c.clicks / c.recipients) * 100) : 0;
        return (
          <div key={c.id} className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">{c.name}</h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs ${c.status === 'Sent' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-amber-500/30 bg-amber-500/15 text-amber-300'}`}>{c.status}</span>
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">{c.channel} · {c.recipients} recipients · {c.status === 'Sent' ? fmtDate(c.sentAt) : 'scheduled'}</div>
            <div className="mt-4 space-y-3">
              <Meter label="Open rate" pct={openRate} detail={`${c.opens} opens`} />
              <Meter label="Click rate" pct={clickRate} detail={`${c.clicks} clicks`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Meter({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">{label}</span><span className="text-white">{pct}% <span className="text-[var(--muted)]">· {detail}</span></span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[var(--brand-bright)]" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// ── Automations ──────────────────────────────────────────────────────────────
function Automations({ automations, onToggle }: { automations: Automation[]; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">Rules that run automatically when something happens. Toggle any rule on or off.</p>
      {automations.map((a) => (
        <div key={a.id} className={`${card} flex items-center gap-4 p-4`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.enabled ? 'bg-[var(--brand-bright)]/15 text-[var(--brand-bright)]' : 'bg-white/5 text-[var(--muted)]'}`}><Zap size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-white">{a.name}</div>
            <div className="text-xs text-[var(--muted)]"><span className="text-[var(--text)]">When</span> {a.trigger} → <span className="text-[var(--text)]">do</span> {a.action}</div>
            <div className="mt-0.5 text-[11px] text-[var(--muted)]/70">{a.runs} runs</div>
          </div>
          <button
            onClick={() => onToggle(a.id)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${a.enabled ? 'bg-[var(--brand-bright)]' : 'bg-white/10'}`}
            aria-label={a.enabled ? 'Disable' : 'Enable'}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${a.enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Reports ──────────────────────────────────────────────────────────────────
function Reports({
  deals, invoices, contacts, campaigns,
}: { deals: Deal[]; invoices: Invoice[]; contacts: Contact[]; campaigns: Campaign[] }) {
  // Revenue by month from paid invoices.
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-GB', { month: 'short' }), total: 0 };
  });
  invoices.filter((i) => i.status === 'Paid').forEach((i) => {
    const d = new Date(i.issuedAt);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.total += invoiceTotal(i);
  });
  const maxRev = Math.max(1, ...months.map((m) => m.total));

  // Funnel
  const funnel = ['Lead In', 'Contacted', 'Proposal', 'Negotiation', 'Won'].map((s) => ({
    stage: s, count: deals.filter((d) => d.stage === s).length,
  }));
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));

  // Lead sources
  const sources = LEAD_SOURCES.map((s) => ({ label: s, count: contacts.filter((c) => c.source === s).length })).filter((s) => s.count > 0);
  const maxSrc = Math.max(1, ...sources.map((s) => s.count));

  const won = deals.filter((d) => d.stage === 'Won').length;
  const lost = deals.filter((d) => d.stage === 'Lost').length;
  const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;
  const avgDeal = deals.length ? deals.reduce((s, d) => s + d.value, 0) / deals.length : 0;
  const totalSent = campaigns.reduce((s, c) => s + c.recipients, 0);
  const totalOpens = campaigns.reduce((s, c) => s + c.opens, 0);
  const emailOpen = totalSent ? Math.round((totalOpens / totalSent) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Win rate', value: `${winRate}%` },
          { label: 'Avg. deal size', value: money(avgDeal) },
          { label: 'Deals won', value: won.toString() },
          { label: 'Email open rate', value: `${emailOpen}%` },
        ].map((k) => (
          <div key={k.label} className={`${card} p-4`}><div className="font-display text-2xl text-white">{k.value}</div><div className="text-xs text-[var(--muted)]">{k.label}</div></div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${card} p-6`}>
          <h3 className="font-display text-lg text-white">Revenue (last 6 months)</h3>
          <div className="mt-6 flex h-44 items-end gap-3">
            {months.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-[10px] text-[var(--muted)]">{m.total ? money(m.total) : ''}</div>
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-[var(--brand-bright)] transition-all" style={{ height: `${(m.total / maxRev) * 100}%`, minHeight: m.total ? 4 : 0 }} />
                </div>
                <div className="text-xs text-[var(--muted)]">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} p-6`}>
          <h3 className="font-display text-lg text-white">Conversion funnel</h3>
          <div className="mt-4 space-y-2">
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-[var(--muted)]">{f.stage}</span>
                <div className="h-7 flex-1 overflow-hidden rounded-lg bg-white/5">
                  <div className="flex h-full items-center justify-end rounded-lg bg-[var(--brand-bright)] px-2 text-[11px] font-medium text-[#0b0d10]" style={{ width: `${Math.max((f.count / maxFunnel) * 100, 8)}%` }}>{f.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} p-6`}>
          <h3 className="font-display text-lg text-white">Lead sources</h3>
          <div className="mt-4 space-y-2">
            {sources.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">{s.label}</span><span className="text-white">{s.count}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[var(--brand-bright)]" style={{ width: `${(s.count / maxSrc) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} p-6`}>
          <h3 className="font-display text-lg text-white">Campaign performance</h3>
          <div className="mt-4 space-y-3">
            {campaigns.map((c) => (
              <Meter key={c.id} label={c.name} pct={c.recipients ? Math.round((c.opens / c.recipients) * 100) : 0} detail={`${c.opens}/${c.recipients}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
function SettingsView({ contacts, source }: { contacts: Contact[]; source: string }) {
  const team = OWNERS.map((o, i) => ({
    name: o, role: i === 0 ? 'Admin' : i === 1 ? 'Manager' : 'Sales rep',
    contacts: contacts.filter((c) => c.owner === o).length,
  }));
  return (
    <div className="space-y-6">
      <div className={`${card} p-6`}>
        <h3 className="font-display text-lg text-white">Team &amp; roles</h3>
        <div className="mt-4 divide-y divide-white/5">
          {team.map((m) => (
            <div key={m.name} className="flex items-center gap-3 py-3">
              <Avatar src={avatarFor(m.name)} name={m.name} size={36} />
              <div className="min-w-0 flex-1"><div className="font-medium text-white">{m.name}</div><div className="text-xs text-[var(--muted)]">{m.contacts} contacts owned</div></div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-[var(--muted)]">{m.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} p-6`}>
        <h3 className="font-display text-lg text-white">Custom fields</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Fields tracked on every contact in this workspace.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Status', 'Source', 'Owner', 'Company', 'Title', 'Location', 'Tags', 'Created date'].map((f) => (
            <span key={f} className="rounded-full bg-white/5 px-3 py-1 text-xs text-[var(--text)]">{f}</span>
          ))}
        </div>
      </div>

      <ApiCredit source={source} />
    </div>
  );
}

// ── Shared: API credit ───────────────────────────────────────────────────────
function ApiCredit({ source }: { source: string }) {
  return (
    <div className={`${card} bg-gradient-to-br from-[var(--surface)] to-transparent p-6`}>
      <h3 className="flex items-center gap-2 font-display text-lg text-white"><Database size={18} className="text-[var(--brand-bright)]" /> Data &amp; APIs</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Sample identities were loaded from{' '}
        <span className="text-white">{source === 'randomuser.me' ? 'the randomuser.me API (live)' : 'a built-in fallback set (API unavailable)'}</span>.
        Companies, deals, tasks, meetings, emails, invoices, campaigns and automations are generated on top with a seeded random generator, so the dataset stays small and reproducible.
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
        <li>• <span className="text-white">randomuser.me</span> — names, emails, phones, locations, and avatars for contacts.</li>
        <li>• <span className="text-white">DiceBear</span> — generated avatars for contacts you add, and as an image fallback.</li>
      </ul>
      <p className="mt-3 text-xs text-[var(--muted)]/70">
        Front-end demo — everything you change lives in your browser only. A Supabase-backed version (persisted records) is the next step, matching the booking demo.
      </p>
    </div>
  );
}

// ── Contact drawer ───────────────────────────────────────────────────────────
function ContactDrawer({
  contact, deals, activities, tasks, onClose, onLog,
}: {
  contact: Contact; deals: Deal[]; activities: Activity[]; tasks: Task[];
  onClose: () => void; onLog: (type: ActivityType, subject: string) => void;
}) {
  const [type, setType] = useState<ActivityType>('Note');
  const [subject, setSubject] = useState('');
  const submit = () => { if (!subject.trim()) return; onLog(type, subject.trim()); setSubject(''); };
  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-black/60" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <Avatar src={contact.avatar} name={contact.name} size={52} />
            <div>
              <div className="font-display text-lg text-white">{contact.name}</div>
              <div className="text-sm text-[var(--muted)]">{contact.title}</div>
              <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[contact.status]}`}>{contact.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-2 border-b border-white/10 p-5 text-sm">
          <Row icon={Building2} text={contact.company} />
          <Row icon={Mail} text={contact.email} />
          <Row icon={Phone} text={contact.phone} />
          <Row icon={Target} text={`Source: ${contact.source}`} />
          <Row icon={Calendar} text={`Added ${fmtDate(contact.createdAt)} · ${contact.location}`} />
          <div className="flex flex-wrap gap-1.5 pt-1">{contact.tags.map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-[var(--muted)]">{t}</span>)}</div>
        </div>

        {deals.length > 0 && (
          <div className="border-b border-white/10 p-5">
            <h4 className="text-xs uppercase tracking-wide text-[var(--muted)]">Deals</h4>
            <div className="mt-2 space-y-2">
              {deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl bg-[var(--bg-soft)] px-3 py-2 text-sm"><span className="min-w-0 truncate text-white">{d.title}</span><span className="ml-2 shrink-0 text-[var(--muted)]">{d.stage} · <span className="text-[var(--brand-bright)]">{money(d.value)}</span></span></div>
              ))}
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="border-b border-white/10 p-5">
            <h4 className="text-xs uppercase tracking-wide text-[var(--muted)]">Open tasks</h4>
            <div className="mt-2 space-y-1.5">
              {tasks.filter((t) => !t.done).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm"><span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${PRIO_STYLE[t.priority]}`}>{t.priority}</span><span className="min-w-0 flex-1 truncate text-[var(--text)]">{t.title}</span><span className="shrink-0 text-xs text-[var(--muted)]">{fmtDate(t.dueAt)}</span></div>
              ))}
            </div>
          </div>
        )}

        <div className="p-5">
          <h4 className="text-xs uppercase tracking-wide text-[var(--muted)]">Timeline</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <select value={type} onChange={(e) => setType(e.target.value as ActivityType)} className="rounded-lg border border-white/10 bg-[var(--bg-soft)] px-2 py-1.5 text-sm text-white outline-none">{ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Log something…" className="min-w-[120px] flex-1 rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-1.5 text-sm text-white outline-none placeholder:text-[var(--muted)]" />
            <button onClick={submit} className="rounded-lg bg-[var(--brand-bright)] px-3 py-1.5 text-sm font-medium text-[#0b0d10] hover:bg-white">Add</button>
          </div>
          <ul className="mt-4 space-y-3">
            {activities.map((a) => {
              const Icon = ACT_ICON[a.type];
              return (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--brand-bright)]"><Icon size={13} /></span>
                  <div className="min-w-0 flex-1"><div className={a.done ? 'text-[var(--muted)] line-through' : 'text-white'}>{a.subject}</div><div className="text-xs text-[var(--muted)]">{a.type} · {fmtDate(a.at)}</div></div>
                </li>
              );
            })}
            {activities.length === 0 && <li className="text-sm text-[var(--muted)]">No activity yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
function Row({ icon: Icon, text }: { icon: typeof Phone; text: string }) {
  return <div className="flex items-center gap-2 text-[var(--muted)]"><Icon size={15} className="shrink-0" /><span className="truncate text-[var(--text)]">{text}</span></div>;
}

// ── Add contact ──────────────────────────────────────────────────────────────
function AddContactModal({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (c: { name: string; email: string; company: string; title: string; status: Status; source: string }) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('Lead');
  const [source, setSource] = useState(LEAD_SOURCES[0]);
  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
      company: company.trim() || 'Unassigned',
      title: title.trim() || 'Contact',
      status, source,
    });
  };
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg text-white">New contact</h2><button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close"><X size={18} /></button></div>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={field} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={field} />
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className={field} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className={field} />
          <div className="grid grid-cols-2 gap-3">
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={field}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={field}>{LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <button onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bright)] py-2.5 font-medium text-[#0b0d10] transition-colors hover:bg-white"><Plus size={16} /> Add contact</button>
        </div>
      </div>
    </div>
  );
}
