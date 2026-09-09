import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, Users, Building2, KanbanSquare, CheckSquare,
  Calendar, Inbox, FileText, Megaphone, Zap, BarChart3, Settings as SettingsIcon,
  Search, Plus, X, Check, Phone, Mail, StickyNote, ChevronRight, Database,
  Clock, TrendingUp, Target, DollarSign, AlertTriangle, Send, Menu,
  UserPlus, LifeBuoy, ArrowRightLeft, Flame, Sparkles, Radio,
  Package, BookOpen, ScrollText, ClipboardList, Trash2,
  GraduationCap, CheckCircle2, Circle, ChevronDown, PartyPopper,
} from 'lucide-react';
import {
  fetchCrmData, avatarFor, money, invoiceTotal,
  bookPrice, lineNet, quoteSubtotal, quoteTax, quoteGrand,
  STAGES, OPEN_STAGES, STAGE_PROB, STATUSES, ACTIVITY_TYPES, PRIORITIES, LEAD_SOURCES, OWNERS,
  LOST_REASONS, COMPETITORS, CASE_STATUSES, SLA_HOURS, caseSla,
  type Contact, type Company, type Deal, type Activity, type Task, type Meeting,
  type EmailThread, type EmailTemplate, type Invoice, type Campaign, type Automation,
  type Lead, type SupportCase, type LeadStatus, type CaseStatus, type SlaState,
  type Stage, type Status, type ActivityType, type Priority, type InvoiceStatus,
  type Product, type PriceBook, type Quote, type QuoteLine, type QuoteStatus,
  type SalesOrder, type SalesOrderStatus,
} from '@/data/crmSeed';

type Tab =
  | 'dashboard' | 'contacts' | 'leads' | 'companies' | 'pipeline'
  | 'quotes' | 'salesorders' | 'products' | 'pricebooks'
  | 'tasks' | 'calendar'
  | 'inbox' | 'cases' | 'invoices' | 'campaigns' | 'automations' | 'reports' | 'settings';

const NAV: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: UserPlus },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'companies', label: 'Accounts', icon: Building2 },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'quotes', label: 'Quotes', icon: ScrollText },
  { id: 'salesorders', label: 'Sales Orders', icon: ClipboardList },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'pricebooks', label: 'Price Books', icon: BookOpen },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'cases', label: 'Cases', icon: LifeBuoy },
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
const QUOTE_STYLE: Record<QuoteStatus, string> = {
  Draft: 'bg-white/5 text-[var(--muted)] border-white/10',
  Delivered: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Accepted: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};
const SO_STYLE: Record<SalesOrderStatus, string> = {
  Created: 'bg-white/5 text-[var(--muted)] border-white/10',
  Approved: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Delivered: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Invoiced: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
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

// ── Blueprint ────────────────────────────────────────────────────────────────
// Zoho's signature "enforced process": a deal can't jump to the next stage until
// the rep has completed the required steps for the transition. This turns the
// pipeline into a teaching tool — it drills the actual motion of a sale, in order.
type BlueprintStep = { next: Stage; guidance: string; checklist: string[]; nextStepLabel: string };
const BLUEPRINT: Record<Stage, BlueprintStep | null> = {
  'Lead In': {
    next: 'Contacted',
    guidance: 'Make first contact and confirm this is a real opportunity worth working.',
    checklist: [
      'Logged a call or email with the buyer',
      'Confirmed you’re speaking to a decision-maker',
      'Captured the problem they’re trying to solve',
    ],
    nextStepLabel: 'What’s the very next action? (e.g. “Book a discovery call”)',
  },
  Contacted: {
    next: 'Proposal',
    guidance: 'Qualify the need and budget, then get a tailored proposal out.',
    checklist: [
      'Ran a discovery / needs call',
      'Confirmed budget and buying timeline',
      'Sent a proposal tailored to their use case',
    ],
    nextStepLabel: 'What’s the next step after sending the proposal?',
  },
  Proposal: {
    next: 'Negotiation',
    guidance: 'Make sure the buyer has actually engaged with the proposal before negotiating.',
    checklist: [
      'Buyer has reviewed the proposal',
      'Answered pricing / scope questions',
      'Agreed who signs off and by when',
    ],
    nextStepLabel: 'What needs to happen to reach agreement?',
  },
  Negotiation: {
    next: 'Won',
    guidance: 'Lock in the commercials and close it out.',
    checklist: [
      'Final terms and price agreed',
      'Contract sent for signature',
      'Written or verbal commitment to proceed',
    ],
    nextStepLabel: 'Confirm the closing step (e.g. “Countersign & kick off onboarding”)',
  },
  Won: null,
  Lost: null,
};

// ── Guided Training Mode ──────────────────────────────────────────────────────
// A step-by-step challenge track that walks a learner through the whole sales
// lifecycle in order — the same motion a real rep runs, turned into checkable
// objectives. Each step is marked done when the matching action actually fires
// anywhere in the app (see trainStep calls), so the panel teaches by DOING, not
// by reading. Steps intentionally mirror the real Zoho lead-to-cash flow.
type TrainStep = { id: string; title: string; hint: string; tab: Tab };
const TRAINING_STEPS: TrainStep[] = [
  { id: 'qualify', title: 'Qualify a lead', hint: 'Open Leads and advance a New lead through Contacted to Qualified.', tab: 'leads' },
  { id: 'convert', title: 'Convert the lead', hint: 'Convert your qualified lead — it becomes a contact, account & an open deal.', tab: 'leads' },
  { id: 'advance', title: 'Advance the deal', hint: 'In Pipeline, hit Advance and clear the Blueprint gate to move the deal on.', tab: 'pipeline' },
  { id: 'quote', title: 'Build a quote', hint: 'Create a quote — pick a price book and add a product line or two.', tab: 'quotes' },
  { id: 'salesorder', title: 'Raise a sales order', hint: 'Mark the quote Accepted, then convert it into a sales order.', tab: 'quotes' },
  { id: 'invoice', title: 'Generate the invoice', hint: 'Approve & deliver the order, then generate its invoice.', tab: 'salesorders' },
  { id: 'win', title: 'Close it Won', hint: 'Keep advancing the opportunity in Pipeline until it closes Won.', tab: 'pipeline' },
];

// ── Zia (AI insights) ─────────────────────────────────────────────────────────
// A lightweight stand-in for Zoho's Zia: it reads the same signals a predictive
// model would — source, engagement, stage, momentum, deal size — and explains its
// read in plain language, so learners see WHY a lead is hot or a deal likely to
// close rather than just a number.
const SIGNAL_HINTS = ['open', 'click', 'view', 'repl', 'book', 'download', 'paid'];
const isSignal = (subject: string) => SIGNAL_HINTS.some((h) => subject.toLowerCase().includes(h));

function ziaDealRead(deal: Deal, activities: Activity[]) {
  const reasons: string[] = [`In ${deal.stage} — deals here close around ${deal.probability}% of the time`];
  const signals = activities.filter((a) => isSignal(a.subject)).length;
  reasons.push(signals >= 2 ? `Strong engagement — ${signals} recent buyer signals` : signals === 1 ? 'Some engagement — one recent buyer signal' : 'Quiet lately — no recent buyer signals');
  const days = Math.round((deal.expectedClose - Date.now()) / 86_400_000);
  reasons.push(days < 0 ? `Past its expected close by ${Math.abs(days)}d — needs a push` : `Expected to close in ~${days}d`);
  if (deal.value >= 40000) reasons.push('High-value — worth prioritising');
  const verdict = deal.probability >= 70 ? 'Likely to close' : deal.probability >= 40 ? 'On track — keep momentum' : 'At risk — needs attention';
  const tone: Warmth = deal.probability >= 70 ? 'warm' : deal.probability >= 40 ? 'neutral' : 'cool';
  return { pct: deal.probability, verdict, tone, reasons: reasons.slice(0, 4) };
}

function ziaLeadRead(lead: Lead) {
  const hotSource = /referral|linkedin|event|inbound/i.test(lead.source);
  const reasons = [
    hotSource ? `${lead.source} leads convert above average` : `${lead.source} is a lower-intent source`,
    lead.estValue >= 30000 ? `Sizeable potential — ${money(lead.estValue)}` : `Modest potential — ${money(lead.estValue)}`,
    lead.score >= 70 ? 'Profile closely matches your won deals' : lead.score >= 40 ? 'Partial fit to your ideal profile' : 'Weak fit to your ideal profile',
  ];
  const verdict = lead.score >= 70 ? 'Hot — act today' : lead.score >= 40 ? 'Warm — worth nurturing' : 'Cold — low priority';
  const tone: Warmth = lead.score >= 70 ? 'warm' : lead.score >= 40 ? 'neutral' : 'cool';
  return { pct: lead.score, verdict, tone, reasons };
}

const ZIA_TONE: Record<Warmth, string> = {
  warm: 'border-emerald-500/30 text-emerald-300',
  neutral: 'border-amber-500/30 text-amber-300',
  cool: 'border-rose-500/30 text-rose-300',
};

// The compact Zia card — a score ring, a one-line verdict, and the reasons behind
// it. Reused on the record page (deal read) and could drive a leads popover.
function ZiaCard({ pct, verdict, tone, reasons, unit = '%' }: { pct: number; verdict: string; tone: Warmth; reasons: string[]; unit?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-bright)]"><Sparkles size={13} /> Zia insights</div>
      <div className="mt-2 flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${ZIA_TONE[tone]}`}>
          <span className="font-display text-sm text-white">{pct}{unit}</span>
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-medium ${ZIA_TONE[tone].split(' ')[1]}`}>{verdict}</div>
          <div className="text-[11px] text-[var(--muted)]">Zia's read of this record</div>
        </div>
      </div>
      <ul className="mt-2.5 space-y-1">
        {reasons.map((r) => (
          <li key={r} className="flex gap-1.5 text-[11px] text-[var(--muted)]"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--brand-bright)]" />{r}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Live simulation layer ────────────────────────────────────────────────────
// This is a demo, but it behaves like a real CRM: your actions trigger reactions
// (activities logged, follow-up tasks created, simulated buyer replies) and the
// workspace ticks along on its own so it feels live. Nothing leaves the browser.
type Toast = { id: number; text: string; tone: 'info' | 'success' | 'warn' | 'coach'; contactId?: string };
type Warmth = 'warm' | 'neutral' | 'cool';
// One line in the automation run log — which rule fired, what it did, and when.
type AutoRun = { id: string; autoId: string; name: string; detail: string; at: number };

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

// The Guided Training overlay — a dockable challenge card (bottom-left) with the
// live checklist, a progress bar, a "Go" jump to the step's module, and a
// celebration when the full lifecycle is complete. Purely presentational: it
// reads the `done` map the parent maintains from real actions.
function TrainingPanel({
  done, minimized, onMinimize, onRestore, onClose, onGo, onReset,
}: {
  done: Record<string, boolean>;
  minimized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  onGo: (t: Tab) => void;
  onReset: () => void;
}) {
  const total = TRAINING_STEPS.length;
  const doneCount = TRAINING_STEPS.filter((s) => done[s.id]).length;
  const allDone = doneCount === total;
  const currentIdx = TRAINING_STEPS.findIndex((s) => !done[s.id]);

  if (minimized) {
    return (
      <button
        onClick={onRestore}
        className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-2 rounded-full border border-[var(--brand-bright)]/40 bg-[var(--surface)]/95 px-3.5 py-2 text-sm text-white shadow-xl backdrop-blur transition-colors hover:border-[var(--brand-bright)]"
      >
        <GraduationCap size={15} className="text-[var(--brand-bright)]" />
        Training <span className="text-[var(--muted)]">· {doneCount}/{total}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[70] flex max-h-[min(78vh,640px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)]/97 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <GraduationCap size={17} className="shrink-0 text-[var(--brand-bright)]" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white">Guided Training</div>
          <div className="text-[11px] text-[var(--muted)]">Lead → cash, one step at a time</div>
        </div>
        <button onClick={onMinimize} className="rounded-lg p-1 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Minimise training"><ChevronDown size={16} /></button>
        <button onClick={onClose} className="rounded-lg p-1 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close training"><X size={16} /></button>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>{allDone ? 'Complete' : `Step ${Math.min(currentIdx + 1, total)} of ${total}`}</span>
          <span>{doneCount}/{total}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-[var(--brand-bright)] transition-all duration-500" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      </div>

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {TRAINING_STEPS.map((s, i) => {
          const complete = Boolean(done[s.id]);
          const current = !complete && i === currentIdx;
          return (
            <li
              key={s.id}
              className={`rounded-xl border px-3 py-2.5 transition-colors ${
                current ? 'border-[var(--brand-bright)]/40 bg-[var(--brand-bright)]/5' : complete ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-white/10 bg-[var(--bg-soft)]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {complete
                  ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                  : <Circle size={17} className={`mt-0.5 shrink-0 ${current ? 'text-[var(--brand-bright)]' : 'text-[var(--muted)]'}`} />}
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${complete ? 'text-[var(--muted)] line-through' : 'text-white'}`}>{s.title}</div>
                  {!complete && (current || currentIdx < 0) && (
                    <div className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">{s.hint}</div>
                  )}
                </div>
                {current && (
                  <button
                    onClick={() => onGo(s.tab)}
                    className="shrink-0 rounded-full border border-[var(--brand-bright)]/40 bg-[var(--brand-bright)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--brand-bright)] transition-colors hover:bg-[var(--brand-bright)]/20"
                  >
                    Go →
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {allDone && (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <PartyPopper size={16} /> Full lifecycle complete
          </div>
          <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
            You qualified a lead, converted it, advanced the deal through the Blueprint, quoted, raised a sales order, invoiced, and closed it Won — the entire Zoho lead-to-cash motion.
          </p>
          <button onClick={onReset} className="mt-2.5 w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-xs font-medium text-white transition-colors hover:border-white/25">
            Restart challenge
          </button>
        </div>
      )}
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
  const [products, setProducts] = useState<Product[]>([]);
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [losingId, setLosingId] = useState<string | null>(null);
  const [blueprintId, setBlueprintId] = useState<string | null>(null);

  // Guided Training Mode — a challenge overlay whose objectives tick off as the
  // matching real actions fire. `trainingOn` gates tracking; `trainDone` is the
  // per-step completion map; `trainingMin` collapses the panel to a chip.
  const [trainingOn, setTrainingOn] = useState(false);
  const [trainingMin, setTrainingMin] = useState(false);
  const [trainDone, setTrainDone] = useState<Record<string, boolean>>({});
  const trainCelebrated = useRef(false);

  // Live-simulation state: toast notifications, inbox "typing…", and a running
  // count of ambient events so the header can show the workspace is alive.
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [autoRuns, setAutoRuns] = useState<AutoRun[]>([]);
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

  // ── Workflow automations ────────────────────────────────────────────────────
  // The Automations module isn't decorative: enabled rules actually fire when
  // their trigger event happens (a contact is created, a deal hits Proposal, a
  // deal is Won, an invoice goes overdue…). Firing bumps the rule's run count,
  // appends to a visible run log, raises a toast, and performs its side effect.
  // Toggling a rule off genuinely stops it. `autoRef` gives the ambient engine
  // and plain handlers the latest rules without re-arming effects.
  const autoRef = useRef<Automation[]>([]);
  autoRef.current = automations;
  const fireAutomation = useCallback((autoId: string, detail: string, action?: () => void) => {
    const a = autoRef.current.find((x) => x.id === autoId);
    if (!a || !a.enabled) return false;
    setAutomations((list) => list.map((x) => (x.id === autoId ? { ...x, runs: x.runs + 1 } : x)));
    setAutoRuns((rs) => [{ id: `ar-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, autoId, name: a.name, detail, at: Date.now() }, ...rs].slice(0, 40));
    notify(`Automation ran — ${a.name}`, 'info');
    action?.();
    return true;
  }, [notify]);

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
      setProducts(d.products);
      setPriceBooks(d.priceBooks);
      setQuotes(d.quotes);
      setSalesOrders(d.salesOrders);
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

      // ~1 in 4 ticks an eligible TIME-BASED automation fires instead of an
      // ordinary ambient event — so enabled rules visibly do work over time,
      // and disabled ones stay silent.
      const eligible = autoRef.current.filter((a) => a.enabled && ['au3', 'au5', 'au6'].includes(a.id));
      if (eligible.length && Math.random() < 0.25) {
        const a = pickR(eligible)!;
        if (a.id === 'au5') {
          const overdue = iv.find((x) => x.status !== 'Paid');
          const who = overdue ? bid[overdue.contactId]?.name : null;
          fireAutomation('au5', overdue ? `Payment reminder emailed${who ? ` to ${who}` : ''} — ${overdue.number}` : 'Scanned invoices — none overdue');
        } else if (a.id === 'au3') {
          const openDeal = pickR(ds.filter((x) => OPEN_STAGES.includes(x.stage)));
          fireAutomation('au3', openDeal ? `Nudged owner on idle deal “${openDeal.title}”` : 'Scanned pipeline for stale deals');
        } else {
          const cust = pickR(cs.filter((x) => x.status === 'Customer')) ?? c;
          fireAutomation('au6', `Renewal reminder sent to ${cust.name}`);
        }
        setLiveCount((n) => n + 1);
        setLastSync(Date.now());
        return;
      }

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
  }, [loading, notify, pushActivity, fireAutomation]);

  // Mark a training objective complete when its real action fires. No-op unless
  // the challenge is active and the step isn't already done; nudges with a coach
  // toast so the learner feels the progress.
  const trainStep = (id: string) => {
    if (!trainingOn || trainDone[id]) return;
    setTrainDone((d) => (d[id] ? d : { ...d, [id]: true }));
    const s = TRAINING_STEPS.find((x) => x.id === id);
    if (s) notify(`Training complete: ${s.title}`, 'coach');
  };
  // Celebrate once when every objective is done.
  useEffect(() => {
    if (!trainingOn) { trainCelebrated.current = false; return; }
    const all = TRAINING_STEPS.every((s) => trainDone[s.id]);
    if (all && !trainCelebrated.current) {
      trainCelebrated.current = true;
      notify('Training complete — you ran the full lead-to-cash lifecycle! 🎉', 'success');
    }
  }, [trainingOn, trainDone, notify]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const advanceDeal = (id: string) => {
    const d = deals.find((x) => x.id === id);
    if (!d) return;
    const order: Stage[] = ['Lead In', 'Contacted', 'Proposal', 'Negotiation', 'Won'];
    const idx = order.indexOf(d.stage);
    if (idx < 0 || idx >= order.length - 1) { notify(`${d.title} is already at the final stage`, 'info'); return; }
    const next = order[idx + 1];
    setDeals((ds) => ds.map((x) => (x.id === id ? { ...x, stage: next, probability: STAGE_PROB[next] } : x)));
    if (next === 'Won') trainStep('win');
    const c = byId[d.contactId];
    // Reaction 1: log the stage change on the timeline.
    notify(next === 'Won' ? `${d.title} marked Won — ${money(d.value)}` : `${d.title} advanced to ${next} · win probability now ${STAGE_PROB[next]}%`, next === 'Won' ? 'success' : 'info');
    pushActivity(d.contactId, 'Note', `Deal moved to ${next}`);
    // Reaction 2: advancing an open deal spins up a follow-up task automatically.
    if (next !== 'Won') {
      setTasks((ts) => [{ id: `t-${Date.now()}`, contactId: d.contactId, title: `Follow up on “${d.title}” (${next})`, priority: next === 'Negotiation' ? 'High' : 'Medium', dueAt: Date.now() + 2 * 86_400_000, done: false, owner: OWNERS[0] }, ...ts]);
    }
    // Automation triggers: Proposal follow-up rule, and Won → onboarding rule.
    if (next === 'Proposal') fireAutomation('au2', `Follow-up task queued for “${d.title}”`);
    if (next === 'Won') {
      fireAutomation('au4', `Onboarding meeting booked with ${c?.name ?? 'the customer'}`, () =>
        setMeetings((ms) => [{
          id: `m-${Date.now()}`, title: `Onboarding — ${c?.name?.split(' ')[0] ?? 'new customer'}`,
          contactId: d.contactId, startAt: Date.now() + 3 * 86_400_000, durationMin: 60,
          kind: 'Onboarding', location: 'Google Meet', owner: OWNERS[0],
        }, ...ms]));
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
    if (next === 'Qualified') trainStep('qualify');
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
    fireAutomation('au1', `Intro email sent to ${lead.name}`, () => pushActivity(contactId, 'Email', 'Intro / first touch email sent'));
    trainStep('convert');
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
    fireAutomation('au1', `Intro email sent to ${c.name}`, () => pushActivity(id, 'Email', 'Intro / first touch email sent'));
  };

  // ── Quote-to-cash ───────────────────────────────────────────────────────────
  const toggleProduct = (id: string) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  const togglePriceBook = (id: string) =>
    setPriceBooks((bs) => bs.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));

  const createQuote = (data: { title: string; contactId: string; priceBookId: string; lines: QuoteLine[]; taxPct: number }) => {
    const id = `q-${Date.now()}`;
    const num = `QT-${2000 + quotes.length}`;
    setQuotes((qs) => [
      { id, number: num, title: data.title, contactId: data.contactId, dealId: deals.find((d) => d.contactId === data.contactId)?.id, priceBookId: data.priceBookId, lines: data.lines, taxPct: data.taxPct, status: 'Draft', createdAt: Date.now(), validUntil: Date.now() + 30 * 86_400_000 },
      ...qs,
    ]);
    setQuoteOpen(false);
    setTab('quotes');
    trainStep('quote');
    notify(`Quote ${num} drafted — ${money(quoteGrand(data.lines, data.taxPct))}`, 'success', data.contactId);
    pushActivity(data.contactId, 'Note', `Quote ${num} created`);
  };
  const sendQuote = (id: string) => {
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    setQuotes((qs) => qs.map((x) => (x.id === id ? { ...x, status: 'Delivered' } : x)));
    notify(`Quote ${q.number} sent to ${byId[q.contactId]?.name ?? 'client'}`, 'info', q.contactId);
    pushActivity(q.contactId, 'Email', `Sent quote ${q.number}`);
  };
  const setQuoteOutcome = (id: string, status: QuoteStatus) => {
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    setQuotes((qs) => qs.map((x) => (x.id === id ? { ...x, status } : x)));
    notify(`Quote ${q.number} ${status.toLowerCase()}`, status === 'Accepted' ? 'success' : 'warn', q.contactId);
    pushActivity(q.contactId, 'Note', `Quote ${q.number} ${status.toLowerCase()}`);
  };
  const convertQuoteToSO = (id: string) => {
    const q = quotes.find((x) => x.id === id);
    if (!q || q.salesOrderId) return;
    const soId = `so-${Date.now()}`;
    const num = `SO-${3000 + salesOrders.length}`;
    setSalesOrders((so) => [
      { id: soId, number: num, quoteId: q.id, contactId: q.contactId, lines: q.lines, taxPct: q.taxPct, status: 'Created', createdAt: Date.now() },
      ...so,
    ]);
    setQuotes((qs) => qs.map((x) => (x.id === id ? { ...x, salesOrderId: soId } : x)));
    setTab('salesorders');
    trainStep('salesorder');
    notify(`Sales order ${num} created from ${q.number}`, 'success', q.contactId);
    pushActivity(q.contactId, 'Note', `Sales order ${num} raised from quote ${q.number}`);
  };
  const approveSO = (id: string) =>
    setSalesOrders((so) => so.map((x) => (x.id === id ? { ...x, status: 'Approved' } : x)));
  const deliverSO = (id: string) =>
    setSalesOrders((so) => so.map((x) => (x.id === id ? { ...x, status: 'Delivered' } : x)));
  const invoiceSO = (id: string) => {
    const so = salesOrders.find((x) => x.id === id);
    if (!so || so.invoiceId) return;
    const invId = `inv-${Date.now()}`;
    const num = `INV-${1000 + invoices.length}`;
    const items = so.lines.map((l) => ({
      desc: products.find((p) => p.id === l.productId)?.name ?? 'Item',
      qty: l.qty,
      unitPrice: Math.round(l.listPrice * (1 - l.discountPct / 100)),
    }));
    setInvoices((iv) => [
      { id: invId, number: num, contactId: so.contactId, items, status: 'Sent', issuedAt: Date.now(), dueAt: Date.now() + 30 * 86_400_000 },
      ...iv,
    ]);
    setSalesOrders((sos) => sos.map((x) => (x.id === id ? { ...x, status: 'Invoiced', invoiceId: invId } : x)));
    setTab('invoices');
    trainStep('invoice');
    notify(`Invoice ${num} raised from ${so.number}`, 'success', so.contactId);
    pushActivity(so.contactId, 'Note', `Invoice ${num} raised from sales order ${so.number}`);
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setTrainingOn((v) => !v); setTrainingMin(false); }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                trainingOn
                  ? 'border-[var(--brand-bright)]/50 bg-[var(--brand-bright)]/10 text-[var(--brand-bright)]'
                  : 'border-white/10 text-[var(--muted)] hover:border-white/25 hover:text-white'
              }`}
              title="Guided walkthrough of the full sales lifecycle"
            >
              <GraduationCap size={15} /> <span className="hidden sm:inline">Guided Training</span>
            </button>
            <Link to="/#work" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white">
              <ArrowLeft size={15} /> <span className="hidden sm:inline">Back to portfolio</span>
            </Link>
          </div>
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
            {tab === 'quotes' && (
              <button
                onClick={() => setQuoteOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-bright)] px-4 py-2 text-sm font-medium text-[#0b0d10] transition-colors hover:bg-white"
              >
                <Plus size={15} /> New quote
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
              {tab === 'pipeline' && <Pipeline deals={deals} byId={byId} onAdvance={(id) => setBlueprintId(id)} onLose={(id) => setLosingId(id)} />}
              {tab === 'quotes' && (
                <QuotesView quotes={quotes} byId={byId} priceBooks={priceBooks} products={products} onSend={sendQuote} onOutcome={setQuoteOutcome} onConvert={convertQuoteToSO} onNew={() => setQuoteOpen(true)} />
              )}
              {tab === 'salesorders' && (
                <SalesOrdersView salesOrders={salesOrders} quotes={quotes} byId={byId} products={products} onApprove={approveSO} onDeliver={deliverSO} onInvoice={invoiceSO} onGoInvoices={() => go('invoices')} />
              )}
              {tab === 'products' && <ProductsView products={products} onToggle={toggleProduct} />}
              {tab === 'pricebooks' && <PriceBooksView priceBooks={priceBooks} products={products} onToggle={togglePriceBook} />}
              {tab === 'tasks' && <Tasks tasks={tasks} byId={byId} contacts={contacts} onToggle={toggleTask} onAdd={addTask} />}
              {tab === 'calendar' && <CalendarView meetings={meetings} byId={byId} />}
              {tab === 'inbox' && (
                <InboxView threads={threads} byId={byId} templates={templates} onReply={replyThread} onRead={markThreadRead} typingId={typingId} />
              )}
              {tab === 'cases' && <CasesView cases={cases} byId={byId} onAdvance={advanceCase} />}
              {tab === 'invoices' && <Invoices invoices={invoices} byId={byId} onPaid={markPaid} />}
              {tab === 'campaigns' && <Campaigns campaigns={campaigns} />}
              {tab === 'automations' && <Automations automations={automations} runs={autoRuns} onToggle={toggleAutomation} />}
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
      {quoteOpen && (
        <QuoteModal
          contacts={contacts}
          products={products.filter((p) => p.active)}
          priceBooks={priceBooks.filter((b) => b.active)}
          onClose={() => setQuoteOpen(false)}
          onCreate={createQuote}
        />
      )}
      <Toasts items={toasts} onDismiss={dismissToast} onOpen={setSelectedId} />
      {trainingOn && (
        <TrainingPanel
          done={trainDone}
          minimized={trainingMin}
          onMinimize={() => setTrainingMin(true)}
          onRestore={() => setTrainingMin(false)}
          onClose={() => setTrainingOn(false)}
          onGo={go}
          onReset={() => { setTrainDone({}); trainCelebrated.current = false; }}
        />
      )}
      {losingId && (
        <LostDealModal
          deal={deals.find((d) => d.id === losingId)!}
          onClose={() => setLosingId(null)}
          onConfirm={(reason, competitor) => loseDeal(losingId, reason, competitor)}
        />
      )}
      {blueprintId && deals.find((d) => d.id === blueprintId) && (
        <BlueprintModal
          deal={deals.find((d) => d.id === blueprintId)!}
          contact={byId[deals.find((d) => d.id === blueprintId)!.contactId]}
          onClose={() => setBlueprintId(null)}
          onConfirm={(nextStep) => {
            const d = deals.find((x) => x.id === blueprintId)!;
            const bp = BLUEPRINT[d.stage];
            advanceDeal(blueprintId);
            trainStep('advance');
            if (bp) pushActivity(d.contactId, 'Note', `Blueprint ${d.stage} → ${bp.next} · next: ${nextStep}`);
            setBlueprintId(null);
          }}
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
  // Zia's top recommendation: the highest-scoring lead still worth working.
  const hottest = [...leads]
    .filter((l) => l.status !== 'Converted' && l.status !== 'Unqualified')
    .sort((a, b) => b.score - a.score)[0];

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
        <span className="text-white">Web-to-Lead:</span> new leads flow in from the website form and cold outreach, get scored and qualified, then <span className="text-[var(--brand-bright)]">convert</span> into a contact, an account, and an opportunity in one click.
      </div>
      {hottest && (() => {
        const z = ziaLeadRead(hottest);
        return (
          <div className={`${card} flex flex-wrap items-center gap-x-4 gap-y-2 p-3`}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-bright)]"><Sparkles size={13} /> Zia recommends</div>
            <div className="flex items-center gap-2 text-sm">
              <Avatar src={hottest.avatar} name={hottest.name} size={24} />
              <span className="font-medium text-white">{hottest.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${ZIA_TONE[z.tone]}`}>{z.verdict}</span>
            </div>
            <span className="text-xs text-[var(--muted)]">{z.reasons[0]} · score {z.pct}</span>
          </div>
        );
      })()}
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

// Blueprint transition gate — the rep must tick every required step and record a
// next action before the deal is allowed to advance. Mirrors Zoho's Blueprint.
function BlueprintModal({
  deal, contact, onClose, onConfirm,
}: { deal: Deal; contact?: Contact; onClose: () => void; onConfirm: (nextStep: string) => void }) {
  const bp = BLUEPRINT[deal.stage];
  const [done, setDone] = useState<boolean[]>(() => (bp ? bp.checklist.map(() => false) : []));
  const [nextStep, setNextStep] = useState('');
  if (!bp) return null;
  const allChecked = done.every(Boolean);
  const ready = allChecked && nextStep.trim().length > 0;
  const toggle = (i: number) => setDone((d) => d.map((v, k) => (k === i ? !v : v)));
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-lg p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-bright)]/15 text-[var(--brand-bright)]"><KanbanSquare size={16} /></span>
            <div>
              <h3 className="font-display text-lg leading-tight text-white">Blueprint</h3>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">{deal.stage} <ChevronRight size={12} /> <span className="text-[var(--brand-bright)]">{bp.next}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{money(deal.value)} · {deal.title}{contact ? ` · ${contact.name}` : ''}</p>
        <div className="mt-3 rounded-xl border border-[var(--brand-bright)]/25 bg-[var(--brand-bright)]/5 px-3 py-2 text-[13px] text-[var(--text)]">{bp.guidance}</div>

        <div className="mt-4 text-xs uppercase tracking-wide text-[var(--muted)]">Required before advancing</div>
        <ul className="mt-2 space-y-1.5">
          {bp.checklist.map((item, i) => (
            <li key={item}>
              <button onClick={() => toggle(i)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-left text-sm transition-colors hover:border-white/20">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${done[i] ? 'border-[var(--brand-bright)] bg-[var(--brand-bright)] text-[#0b0d10]' : 'border-white/20 text-transparent'}`}><Check size={13} /></span>
                <span className={done[i] ? 'text-white' : 'text-[var(--muted)]'}>{item}</span>
              </button>
            </li>
          ))}
        </ul>

        <label className="mt-4 block text-xs uppercase tracking-wide text-[var(--muted)]">Next step <span className="text-rose-300">*</span></label>
        <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder={bp.nextStepLabel} className={`mt-1 ${field}`} />

        <div className="mt-6 flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--muted)]">{done.filter(Boolean).length}/{bp.checklist.length} steps done{ready ? '' : ' · complete all + a next step to continue'}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--muted)] hover:text-white">Cancel</button>
            <button
              disabled={!ready}
              onClick={() => onConfirm(nextStep.trim())}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${ready ? 'bg-[var(--brand-bright)] text-[#0b0d10] hover:bg-white' : 'cursor-not-allowed bg-white/5 text-[var(--muted)]'}`}
            >
              Complete & move to {bp.next} <ChevronRight size={15} />
            </button>
          </div>
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
function Automations({ automations, runs, onToggle }: { automations: Automation[]; runs: AutoRun[]; onToggle: (id: string) => void }) {
  const active = automations.filter((a) => a.enabled).length;
  const totalRuns = automations.reduce((s, a) => s + a.runs, 0);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">Rules that run automatically when something happens. Toggle any rule on or off — disabled rules genuinely stop firing.</p>
          <span className="shrink-0 rounded-full border border-[var(--brand-bright)]/30 bg-[var(--brand-bright)]/10 px-3 py-1 text-xs text-[var(--brand-bright)]">{active} of {automations.length} active</span>
        </div>
        {automations.map((a) => (
          <div key={a.id} className={`${card} flex items-center gap-4 p-4`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.enabled ? 'bg-[var(--brand-bright)]/15 text-[var(--brand-bright)]' : 'bg-white/5 text-[var(--muted)]'}`}><Zap size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-white">{a.name}</div>
              <div className="text-xs text-[var(--muted)]"><span className="text-[var(--text)]">When</span> {a.trigger} → <span className="text-[var(--text)]">do</span> {a.action}</div>
              <div className="mt-0.5 text-[11px] text-[var(--muted)]/70">{a.runs} runs{a.enabled ? '' : ' · paused'}</div>
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

      <div className={`${card} flex flex-col p-5 lg:sticky lg:top-[73px] lg:max-h-[calc(100vh-96px)]`}>
        <h3 className="flex items-center gap-2 font-display text-lg text-white"><Zap size={17} className="text-[var(--brand-bright)]" /> Run log</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">{totalRuns} total runs · live as rules fire</p>
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {runs.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No runs yet this session. Convert a lead, advance a deal to Proposal or Won, or wait for a time-based rule to fire — each run shows up here.</p>
          ) : (
            runs.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/5 bg-[var(--bg-soft)] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white">{r.name}</span>
                  <span className="shrink-0 text-[10px] text-[var(--muted)]">{relTime(r.at)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">{r.detail}</div>
              </div>
            ))
          )}
        </div>
      </div>
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

  // Conversion funnel — cumulative "reached at least this stage" (Won counts for
  // every earlier stage), so it decreases monotonically and stage-to-stage
  // conversion rates are meaningful. Lost deals are excluded from the flow.
  const stageOrder: Stage[] = ['Lead In', 'Contacted', 'Proposal', 'Negotiation', 'Won'];
  const active = deals.filter((d) => d.stage !== 'Lost');
  const funnel = stageOrder.map((s, idx) => ({
    stage: s,
    count: active.filter((d) => stageOrder.indexOf(d.stage) >= idx).length,
  }));
  const maxFunnel = Math.max(1, funnel[0].count);
  const leadToWin = funnel[0].count ? Math.round((funnel[funnel.length - 1].count / funnel[0].count) * 100) : 0;

  // Forecast vs. target: committed (Won) + weighted open pipeline against a
  // quarterly quota, the number a sales manager actually reports on.
  const quarterTarget = 450_000;
  const committed = deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0);
  const weighted = deals.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + (d.value * d.probability) / 100, 0);
  const forecast = committed + weighted;
  const attainment = Math.round((committed / quarterTarget) * 100);
  const forecastPct = Math.round((forecast / quarterTarget) * 100);

  // Win/loss reasons — why deals slipped away (from the Lost-deal modal capture).
  const lostDeals = deals.filter((d) => d.stage === 'Lost');
  const lossReasons = LOST_REASONS
    .map((r) => ({ label: r, count: lostDeals.filter((d) => d.lostReason === r).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxLoss = Math.max(1, ...lossReasons.map((r) => r.count));

  // Per-owner leaderboard — won value, open pipeline and personal win rate.
  const board = OWNERS.map((o) => {
    const od = deals.filter((d) => d.owner === o);
    const w = od.filter((d) => d.stage === 'Won');
    const l = od.filter((d) => d.stage === 'Lost');
    return {
      owner: o,
      wonValue: w.reduce((s, d) => s + d.value, 0),
      openValue: od.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + d.value, 0),
      winRate: w.length + l.length ? Math.round((w.length / (w.length + l.length)) * 100) : 0,
    };
  }).sort((a, b) => b.wonValue - a.wonValue);
  const maxBoard = Math.max(1, ...board.map((b) => b.wonValue + b.openValue));

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Win rate', value: `${winRate}%` },
          { label: 'Avg. deal size', value: money(avgDeal) },
          { label: 'Weighted forecast', value: money(forecast) },
          { label: 'Quarter attainment', value: `${attainment}%` },
          { label: 'Deals won', value: won.toString() },
          { label: 'Email open rate', value: `${emailOpen}%` },
        ].map((k) => (
          <div key={k.label} className={`${card} p-4`}><div className="font-display text-2xl text-white">{k.value}</div><div className="text-xs text-[var(--muted)]">{k.label}</div></div>
        ))}
      </div>

      {/* Forecast vs. target — full width */}
      <div className={`${card} p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="font-display text-lg text-white">Forecast vs. quarter target</h3>
          <div className="text-sm text-[var(--muted)]">Target <span className="text-white">{money(quarterTarget)}</span></div>
        </div>
        <div className="mt-5 h-9 w-full overflow-hidden rounded-xl bg-white/5">
          <div className="flex h-full">
            <div className="flex h-full items-center justify-end bg-emerald-500/80 px-2 text-[11px] font-medium text-[#0b0d10] transition-all" style={{ width: `${Math.min((committed / quarterTarget) * 100, 100)}%` }} title={`Committed (Won): ${money(committed)}`}>
              {committed / quarterTarget > 0.12 ? money(committed) : ''}
            </div>
            <div className="flex h-full items-center justify-end bg-[var(--brand-bright)]/50 px-2 text-[11px] font-medium text-white transition-all" style={{ width: `${Math.min((weighted / quarterTarget) * 100, Math.max(0, 100 - (committed / quarterTarget) * 100))}%` }} title={`Weighted open pipeline: ${money(weighted)}`}>
              {weighted / quarterTarget > 0.12 ? money(weighted) : ''}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80" /> Committed (Won) · {money(committed)}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-bright)]/50" /> Weighted pipeline · {money(weighted)}</span>
          <span className="ml-auto text-[var(--text)]">Forecast {money(forecast)} · <span className={forecastPct >= 100 ? 'text-emerald-300' : 'text-amber-300'}>{forecastPct}% of target</span></span>
        </div>
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
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg text-white">Conversion funnel</h3>
            <span className="text-xs text-[var(--muted)]">Lead→Won <span className="text-[var(--brand-bright)]">{leadToWin}%</span></span>
          </div>
          <div className="mt-4 space-y-2">
            {funnel.map((f, i) => {
              const prev = i > 0 ? funnel[i - 1].count : 0;
              const step = i > 0 && prev ? Math.round((f.count / prev) * 100) : null;
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-[var(--muted)]">{f.stage}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded-lg bg-white/5">
                    <div className="flex h-full items-center justify-end rounded-lg bg-[var(--brand-bright)] px-2 text-[11px] font-medium text-[#0b0d10]" style={{ width: `${Math.max((f.count / maxFunnel) * 100, 8)}%` }}>{f.count}</div>
                  </div>
                  <span className="w-12 shrink-0 text-right text-[11px] text-[var(--muted)]">{step !== null ? `${step}%` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${card} p-6 lg:col-span-2`}>
          <h3 className="font-display text-lg text-white">Sales leaderboard</h3>
          <div className="mt-4 space-y-3">
            {board.map((b) => (
              <div key={b.owner} className="flex items-center gap-3">
                <div className="flex w-28 shrink-0 items-center gap-2 sm:w-40">
                  <Avatar src={avatarFor(b.owner)} name={b.owner} size={28} />
                  <span className="truncate text-sm text-white">{b.owner}</span>
                </div>
                <div className="flex h-6 flex-1 overflow-hidden rounded-lg bg-white/5">
                  <div className="h-full bg-emerald-500/80 transition-all" style={{ width: `${(b.wonValue / maxBoard) * 100}%` }} title={`Won: ${money(b.wonValue)}`} />
                  <div className="h-full bg-[var(--brand-bright)]/50 transition-all" style={{ width: `${(b.openValue / maxBoard) * 100}%` }} title={`Open: ${money(b.openValue)}`} />
                </div>
                <span className="hidden w-24 shrink-0 text-right text-xs text-white sm:block">{money(b.wonValue)}</span>
                <span className="w-14 shrink-0 text-right text-xs text-[var(--muted)]">{b.winRate}% win</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80" /> Won revenue</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-bright)]/50" /> Open pipeline</span>
          </div>
        </div>

        <div className={`${card} p-6`}>
          <h3 className="font-display text-lg text-white">Why deals are lost</h3>
          {lossReasons.length ? (
            <div className="mt-4 space-y-2">
              {lossReasons.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-[var(--muted)]" title={r.label}>{r.label}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-lg bg-white/5">
                    <div className="flex h-full items-center justify-end rounded-lg bg-rose-500/70 px-2 text-[11px] font-medium text-white" style={{ width: `${Math.max((r.count / maxLoss) * 100, 10)}%` }}>{r.count}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">No lost deals yet — mark a deal Lost in the pipeline to see reasons here.</p>
          )}
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
  // Zia reads the contact's most relevant open deal; SalesSignals surface recent
  // engagement (opens, clicks, views) already captured on the timeline.
  const focusDeal = deals.find((d) => OPEN_STAGES.includes(d.stage)) ?? deals[0];
  const zia = focusDeal ? ziaDealRead(focusDeal, activities) : null;
  const signals = activities.filter((a) => isSignal(a.subject)).slice(0, 4);
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

        {(zia || signals.length > 0) && (
          <div className="space-y-3 border-b border-white/10 p-5">
            {zia && <ZiaCard {...zia} />}
            {signals.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--muted)]"><Radio size={12} className="text-emerald-400" /> SalesSignals</h4>
                <ul className="mt-2 space-y-1.5">
                  {signals.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-[13px]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="min-w-0 flex-1 truncate text-[var(--text)]">{a.subject}</span>
                      <span className="shrink-0 text-[11px] text-[var(--muted)]">{relTime(a.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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

// ── Products ─────────────────────────────────────────────────────────────────
const CAT_STYLE: Record<Product['category'], string> = {
  Subscription: 'bg-[var(--brand-bright)]/15 text-[var(--brand-bright)] border-[var(--brand-bright)]/30',
  Services: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Support: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Add-on': 'bg-white/5 text-[var(--muted)] border-white/10',
};
function ProductsView({ products, onToggle }: { products: Product[]; onToggle: (id: string) => void }) {
  const active = products.filter((p) => p.active).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={`${card} p-4`}><div className="font-display text-xl text-white">{products.length}</div><div className="text-xs text-[var(--muted)]">Products</div></div>
        <div className={`${card} p-4`}><div className="font-display text-xl text-emerald-300">{active}</div><div className="text-xs text-[var(--muted)]">Active</div></div>
        <div className={`${card} p-4`}><div className="font-display text-xl text-white">{new Set(products.map((p) => p.category)).size}</div><div className="text-xs text-[var(--muted)]">Categories</div></div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">List price</th>
              <th className="px-4 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{p.code}</td>
                <td className={`px-4 py-3 font-medium ${p.active ? 'text-white' : 'text-[var(--muted)] line-through'}`}>{p.name}</td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${CAT_STYLE[p.category]}`}>{p.category}</span></td>
                <td className="px-4 py-3 text-white">{money(p.unitPrice)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => onToggle(p.id)} className={`h-5 w-9 rounded-full p-0.5 transition-colors ${p.active ? 'bg-emerald-500/70' : 'bg-white/15'}`} aria-label="Toggle active">
                    <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${p.active ? 'translate-x-4' : ''}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Price Books ────────────────────────────────────────────────────────────
function PriceBooksView({ priceBooks, products, onToggle }: { priceBooks: PriceBook[]; products: Product[]; onToggle: (id: string) => void }) {
  const preview = products.filter((p) => p.active).slice(0, 4);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {priceBooks.map((b) => (
        <div key={b.id} className={`${card} flex flex-col p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-lg text-white">{b.name}</div>
              <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs ${b.adjustmentPct < 0 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-[var(--muted)] border-white/10'}`}>
                {b.adjustmentPct === 0 ? 'List price' : `${b.adjustmentPct}% off list`}
              </span>
            </div>
            <button onClick={() => onToggle(b.id)} className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${b.active ? 'bg-emerald-500/70' : 'bg-white/15'}`} aria-label="Toggle active">
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${b.active ? 'translate-x-4' : ''}`} />
            </button>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">{b.description}</p>
          <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
            {preview.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[13px]">
                <span className="min-w-0 truncate text-[var(--text)]">{p.name}</span>
                <span className="ml-2 shrink-0">
                  {b.adjustmentPct !== 0 && <span className="mr-1.5 text-xs text-[var(--muted)] line-through">{money(p.unitPrice)}</span>}
                  <span className="text-[var(--brand-bright)]">{money(bookPrice(p.unitPrice, b))}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Quote / Sales-order shared line rendering ───────────────────────────────
function LineTable({ lines, products }: { lines: QuoteLine[]; products: Product[] }) {
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? 'Item';
  return (
    <div className="space-y-1 border-t border-white/5 pt-3">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between text-[13px]">
          <span className="min-w-0 truncate text-[var(--text)]">
            {name(l.productId)} <span className="text-[var(--muted)]">× {l.qty}</span>
            {l.discountPct > 0 && <span className="ml-1 text-emerald-300">−{l.discountPct}%</span>}
          </span>
          <span className="ml-2 shrink-0 text-white">{money(lineNet(l))}</span>
        </div>
      ))}
    </div>
  );
}
function Totals({ lines, taxPct }: { lines: QuoteLine[]; taxPct: number }) {
  return (
    <div className="mt-2 space-y-0.5 border-t border-white/5 pt-2 text-[13px]">
      <div className="flex justify-between text-[var(--muted)]"><span>Subtotal</span><span>{money(quoteSubtotal(lines))}</span></div>
      <div className="flex justify-between text-[var(--muted)]"><span>VAT ({taxPct}%)</span><span>{money(quoteTax(lines, taxPct))}</span></div>
      <div className="flex justify-between font-medium text-white"><span>Total</span><span>{money(quoteGrand(lines, taxPct))}</span></div>
    </div>
  );
}

// ── Quotes ───────────────────────────────────────────────────────────────────
function QuotesView({
  quotes, byId, priceBooks, products, onSend, onOutcome, onConvert, onNew,
}: {
  quotes: Quote[]; byId: Record<string, Contact>; priceBooks: PriceBook[]; products: Product[];
  onSend: (id: string) => void; onOutcome: (id: string, s: QuoteStatus) => void; onConvert: (id: string) => void; onNew: () => void;
}) {
  const bookName = (id: string) => priceBooks.find((b) => b.id === id)?.name ?? '—';
  const openValue = quotes.filter((q) => q.status === 'Draft' || q.status === 'Delivered').reduce((s, q) => s + quoteGrand(q.lines, q.taxPct), 0);
  const stats: [string, string | number][] = [
    ['Open value', money(openValue)],
    ['Awaiting client', quotes.filter((q) => q.status === 'Delivered').length],
    ['Accepted', quotes.filter((q) => q.status === 'Accepted').length],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className={`${card} p-4`}><div className="font-display text-xl text-white">{value}</div><div className="text-xs text-[var(--muted)]">{label}</div></div>
        ))}
      </div>
      {quotes.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <ScrollText size={28} className="mx-auto text-[var(--muted)]" />
          <p className="mt-3 text-sm text-[var(--muted)]">No quotes yet.</p>
          <button onClick={onNew} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-bright)] px-4 py-2 text-sm font-medium text-[#0b0d10] hover:bg-white"><Plus size={15} /> New quote</button>
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {quotes.map((q) => (
          <div key={q.id} className={`${card} flex flex-col p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="font-mono">{q.number}</span> · {bookName(q.priceBookId)}</div>
                <div className="mt-0.5 truncate font-medium text-white">{q.title}</div>
                <div className="mt-0.5 text-sm text-[var(--muted)]">{byId[q.contactId]?.name ?? '—'} · valid to {fmtDate(q.validUntil)}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${QUOTE_STYLE[q.status]}`}>{q.status}</span>
            </div>
            <LineTable lines={q.lines} products={products} />
            <Totals lines={q.lines} taxPct={q.taxPct} />
            <div className="mt-4 flex flex-wrap gap-2">
              {q.status === 'Draft' && (
                <button onClick={() => onSend(q.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-500/25"><Send size={13} /> Send to client</button>
              )}
              {q.status === 'Delivered' && (
                <>
                  <button onClick={() => onOutcome(q.id, 'Accepted')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25"><Check size={13} /> Mark accepted</button>
                  <button onClick={() => onOutcome(q.id, 'Rejected')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-white/10"><X size={13} /> Rejected</button>
                </>
              )}
              {q.status === 'Accepted' && (
                q.salesOrderId
                  ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-[var(--muted)]"><Check size={13} /> Sales order raised</span>
                  : <button onClick={() => onConvert(q.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-bright)] px-3 py-1.5 text-xs font-medium text-[#0b0d10] hover:bg-white"><ArrowRightLeft size={13} /> Convert to sales order</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sales Orders ─────────────────────────────────────────────────────────────
function SalesOrdersView({
  salesOrders, quotes, byId, products, onApprove, onDeliver, onInvoice, onGoInvoices,
}: {
  salesOrders: SalesOrder[]; quotes: Quote[]; byId: Record<string, Contact>; products: Product[];
  onApprove: (id: string) => void; onDeliver: (id: string) => void; onInvoice: (id: string) => void; onGoInvoices: () => void;
}) {
  const quoteNum = (id?: string) => quotes.find((q) => q.id === id)?.number;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className={`${card} p-4`}><div className="font-display text-xl text-white">{salesOrders.length}</div><div className="text-xs text-[var(--muted)]">Orders</div></div>
        <div className={`${card} p-4`}><div className="font-display text-xl text-sky-300">{salesOrders.filter((s) => s.status !== 'Invoiced').length}</div><div className="text-xs text-[var(--muted)]">In flight</div></div>
        <div className={`${card} p-4`}><div className="font-display text-xl text-emerald-300">{salesOrders.filter((s) => s.status === 'Invoiced').length}</div><div className="text-xs text-[var(--muted)]">Invoiced</div></div>
      </div>
      {salesOrders.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <ClipboardList size={28} className="mx-auto text-[var(--muted)]" />
          <p className="mt-3 text-sm text-[var(--muted)]">No sales orders yet. Accept a quote and convert it to raise one.</p>
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {salesOrders.map((so) => (
          <div key={so.id} className={`${card} flex flex-col p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="font-mono">{so.number}</span>{quoteNum(so.quoteId) && <> · from {quoteNum(so.quoteId)}</>}</div>
                <div className="mt-0.5 truncate font-medium text-white">{byId[so.contactId]?.name ?? '—'}</div>
                <div className="mt-0.5 text-sm text-[var(--muted)]">Raised {fmtDate(so.createdAt)}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${SO_STYLE[so.status]}`}>{so.status}</span>
            </div>
            <LineTable lines={so.lines} products={products} />
            <Totals lines={so.lines} taxPct={so.taxPct} />
            <div className="mt-4 flex flex-wrap gap-2">
              {so.status === 'Created' && (
                <button onClick={() => onApprove(so.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/25"><Check size={13} /> Approve</button>
              )}
              {so.status === 'Approved' && (
                <button onClick={() => onDeliver(so.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-500/25"><Send size={13} /> Mark delivered</button>
              )}
              {so.status === 'Delivered' && (
                <button onClick={() => onInvoice(so.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-bright)] px-3 py-1.5 text-xs font-medium text-[#0b0d10] hover:bg-white"><FileText size={13} /> Generate invoice</button>
              )}
              {so.status === 'Invoiced' && (
                <button onClick={onGoInvoices} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-white/10"><FileText size={13} /> View in Invoices</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── New quote modal ────────────────────────────────────────────────────────
type DraftLine = { productId: string; qty: number; discountPct: number };
function QuoteModal({
  contacts, products, priceBooks, onClose, onCreate,
}: {
  contacts: Contact[]; products: Product[]; priceBooks: PriceBook[];
  onClose: () => void;
  onCreate: (data: { title: string; contactId: string; priceBookId: string; lines: QuoteLine[]; taxPct: number }) => void;
}) {
  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState(contacts[0]?.id ?? '');
  const [priceBookId, setPriceBookId] = useState(priceBooks[0]?.id ?? '');
  const [taxPct, setTaxPct] = useState(15);
  const [lines, setLines] = useState<DraftLine[]>([{ productId: products[0]?.id ?? '', qty: 1, discountPct: 0 }]);

  const book = priceBooks.find((b) => b.id === priceBookId) ?? priceBooks[0];
  const prod = (id: string) => products.find((p) => p.id === id);
  // Materialise draft lines into priced QuoteLines using the chosen price book.
  const priced: QuoteLine[] = lines
    .filter((l) => l.productId)
    .map((l) => ({ productId: l.productId, qty: Math.max(1, l.qty), listPrice: book ? bookPrice(prod(l.productId)!.unitPrice, book) : prod(l.productId)!.unitPrice, discountPct: l.discountPct }));

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { productId: products[0]?.id ?? '', qty: 1, discountPct: 0 }]);
  const removeLine = (i: number) => setLines((ls) => (ls.length > 1 ? ls.filter((_, k) => k !== i) : ls));

  const contact = contacts.find((c) => c.id === contactId);
  const canSave = !!contactId && priced.length > 0;
  const submit = () => {
    if (!canSave) return;
    onCreate({ title: title.trim() || `Quote — ${contact?.company ?? contact?.name ?? 'client'}`, contactId, priceBookId, lines: priced, taxPct });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="font-display text-lg text-white">New quote</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quote title (optional)" className={field} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-[var(--muted)]">Client
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${field} mt-1`}>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
            <label className="text-xs text-[var(--muted)]">Price book
              <select value={priceBookId} onChange={(e) => setPriceBookId(e.target.value)} className={`${field} mt-1`}>{priceBooks.map((b) => <option key={b.id} value={b.id}>{b.name}{b.adjustmentPct !== 0 ? ` (${b.adjustmentPct}%)` : ''}</option>)}</select>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wide text-[var(--muted)]">Line items</span><button onClick={addLine} className="inline-flex items-center gap-1 text-xs text-[var(--brand-bright)] hover:underline"><Plus size={13} /> Add line</button></div>
            {lines.map((l, i) => {
              const p = prod(l.productId);
              const unit = p && book ? bookPrice(p.unitPrice, book) : p?.unitPrice ?? 0;
              return (
                <div key={i} className="rounded-xl bg-[var(--bg-soft)] p-3">
                  <div className="flex items-center gap-2">
                    <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })} className={`${field} min-w-0 flex-1`}>{products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}</select>
                    {lines.length > 1 && <button onClick={() => removeLine(i)} className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-rose-300" aria-label="Remove line"><Trash2 size={15} /></button>}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <label className="text-[var(--muted)]">Qty<input type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className={`${field} mt-1`} /></label>
                    <label className="text-[var(--muted)]">Disc %<input type="number" min={0} max={100} value={l.discountPct} onChange={(e) => setLine(i, { discountPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className={`${field} mt-1`} /></label>
                    <div className="text-[var(--muted)]">Line total<div className="mt-1 py-2 font-medium text-white">{money(Math.round(Math.max(1, l.qty) * unit * (1 - l.discountPct / 100)))}</div></div>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="block text-xs text-[var(--muted)]">VAT %
            <input type="number" min={0} max={100} value={taxPct} onChange={(e) => setTaxPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className={`${field} mt-1 w-24`} />
          </label>
          <Totals lines={priced} taxPct={taxPct} />
        </div>
        <div className="border-t border-white/10 p-5">
          <button onClick={submit} disabled={!canSave} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bright)] py-2.5 font-medium text-[#0b0d10] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"><ScrollText size={16} /> Create quote</button>
        </div>
      </div>
    </div>
  );
}
