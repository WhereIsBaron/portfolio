// ─────────────────────────────────────────────────────────────────────────
// CRM demo data layer.
//
// Populates a small but FULL-FEATURED CRM dataset for the front-end demo.
// People are pulled LIVE from the free randomuser.me public API (names, emails,
// phones, locations, avatars). If that call fails (offline / rate-limited), we
// fall back to a small baked-in set with DiceBear avatars so the demo NEVER
// breaks.
//
// Everything else (companies, deals, tasks, meetings, emails, invoices,
// campaigns, automations) is generated with a seeded PRNG so the dataset is
// reproducible run-to-run. Volume is deliberately tiny — this is a simulation,
// not a data dump.
// ─────────────────────────────────────────────────────────────────────────

export type Stage = 'Lead In' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export const STAGES: Stage[] = ['Lead In', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];
export const OPEN_STAGES: Stage[] = ['Lead In', 'Contacted', 'Proposal', 'Negotiation'];
export const STAGE_PROB: Record<Stage, number> = {
  'Lead In': 10,
  Contacted: 25,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0,
};

export type Status = 'Lead' | 'Prospect' | 'Customer' | 'Churned';
export const STATUSES: Status[] = ['Lead', 'Prospect', 'Customer', 'Churned'];

export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Note' | 'Task';
export const ACTIVITY_TYPES: ActivityType[] = ['Call', 'Email', 'Meeting', 'Note', 'Task'];

export type Priority = 'Low' | 'Medium' | 'High';
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

export const LEAD_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold outreach', 'Event', 'Inbound call'];

// Lead qualification (ERPNext lead / EspoCRM lead): a lead is captured, worked,
// and then CONVERTED into a contact + company + opportunity.
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted';
export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted'];

// Why a deal was lost + who we lost to (ERPNext opportunity_lost_reason / competitor).
export const LOST_REASONS = ['Price too high', 'Chose a competitor', 'No budget', 'Lost to status quo', 'Timing / postponed', 'Missing feature'];
export const COMPETITORS = ['Salesforce', 'HubSpot', 'Zoho', 'Pipedrive', 'In-house build', 'None'];

// Support cases (EspoCRM Cases / ERPNext Support Issue).
export type CaseStatus = 'Open' | 'Pending' | 'Replied' | 'Resolved' | 'Closed';
export const CASE_STATUSES: CaseStatus[] = ['Open', 'Pending', 'Replied', 'Resolved', 'Closed'];
export const CASE_TYPES = ['Question', 'Problem', 'Feature Request', 'Incident'] as const;

// Service-Level Agreement policy: first-response and resolution targets (hours)
// by priority — the model EspoCRM/ERPNext use to hold support to a commitment.
export const SLA_HOURS: Record<Priority, { response: number; resolution: number }> = {
  High: { response: 1, resolution: 8 },
  Medium: { response: 4, resolution: 24 },
  Low: { response: 8, resolution: 72 },
};
export type SlaState = 'Met' | 'On track' | 'Due soon' | 'Breached';
export type CaseSla = { responseDueAt: number; resolutionDueAt: number; responseState: SlaState; resolutionState: SlaState };

const slaState = (dueAt: number, windowMs: number, met: boolean, now: number): SlaState => {
  if (met) return 'Met';
  const left = dueAt - now;
  if (left <= 0) return 'Breached';
  if (left <= windowMs * 0.25) return 'Due soon';
  return 'On track';
};

// Live SLA status for a case: a first reply satisfies the response target once the
// case leaves 'Open'; a Resolved/Closed case satisfies the resolution target.
export function caseSla(c: { priority: Priority; status: CaseStatus; createdAt: number }, now: number = Date.now()): CaseSla {
  const h = SLA_HOURS[c.priority];
  const responseWin = h.response * 3_600_000;
  const resolutionWin = h.resolution * 3_600_000;
  const responseDueAt = c.createdAt + responseWin;
  const resolutionDueAt = c.createdAt + resolutionWin;
  const responded = c.status !== 'Open';
  const resolved = c.status === 'Resolved' || c.status === 'Closed';
  return {
    responseDueAt,
    resolutionDueAt,
    responseState: slaState(responseDueAt, responseWin, responded, now),
    resolutionState: slaState(resolutionDueAt, resolutionWin, resolved, now),
  };
}

export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  company: string;
  title: string;
  location: string;
  status: Status;
  owner: string;
  source: string;
  tags: string[];
  createdAt: number;
};

export type Company = {
  id: string;
  name: string;
  industry: string;
  size: string;
  website: string;
  contactIds: string[];
};

export type Deal = {
  id: string;
  title: string;
  contactId: string;
  value: number;
  stage: Stage;
  probability: number;
  expectedClose: number;
  owner: string;
  lostReason?: string;
  competitor?: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  company: string;
  title: string;
  source: string;
  status: LeadStatus;
  score: number; // 0–100 qualification rating
  estValue: number; // potential opportunity value
  owner: string;
  createdAt: number;
  convertedContactId?: string;
  convertedDealId?: string;
};

export type SupportCase = {
  id: string;
  number: string;
  subject: string;
  contactId: string;
  priority: Priority;
  status: CaseStatus;
  type: (typeof CASE_TYPES)[number];
  createdAt: number;
  updatedAt: number;
};

export type Activity = {
  id: string;
  type: ActivityType;
  contactId: string;
  subject: string;
  at: number;
  done: boolean;
  owner: string;
};

export type Task = {
  id: string;
  title: string;
  contactId: string;
  dueAt: number;
  priority: Priority;
  done: boolean;
  owner: string;
};

export type Meeting = {
  id: string;
  title: string;
  contactId: string;
  startAt: number;
  durationMin: number;
  kind: 'Discovery' | 'Demo' | 'Review' | 'Onboarding' | 'Check-in';
  location: 'Zoom' | 'Google Meet' | 'Phone' | 'On-site';
  owner: string;
};

export type EmailMessage = {
  from: 'me' | 'them';
  at: number;
  body: string;
};

export type EmailThread = {
  id: string;
  contactId: string;
  subject: string;
  messages: EmailMessage[];
  unread: boolean;
};

// Distinct inbox conversations. Each is a hand-written scenario with its own
// subject and back-and-forth, so every thread in the demo reads differently.
// `first` = contact's first name, `co` = company; both are interpolated per thread.
type EmailScenario = {
  subject: (co: string) => string;
  turns: { from: 'me' | 'them'; body: (first: string, co: string) => string }[];
};
const EMAIL_SCENARIOS: EmailScenario[] = [
  {
    subject: () => 'Re: Pricing',
    turns: [
      { from: 'them', body: (_f, co) => `Hi, thanks for the demo. Could you share pricing for ${co}? I'll need something to take to finance.` },
      { from: 'me', body: (f) => `Hi ${f}, of course — I'll send our plan tiers now and flag the one that fits your team size.` },
      { from: 'them', body: () => `Perfect. If the numbers land I can push sign-off through this quarter.` },
    ],
  },
  {
    subject: () => 'Onboarding & timelines',
    turns: [
      { from: 'them', body: () => `Loved the walkthrough. Realistically, what would onboarding look like for a team of twelve?` },
      { from: 'me', body: (f) => `Hi ${f}, about two weeks: workspace setup, data import, then a live training session. A dedicated lead runs it with you.` },
      { from: 'them', body: () => `That's reassuring — the last tool we tried took months. Send the timeline and I'll rally the team.` },
    ],
  },
  {
    subject: () => 'Comparing options',
    turns: [
      { from: 'them', body: () => `Being upfront — we're weighing you against two others. What genuinely sets you apart?` },
      { from: 'me', body: (f) => `Fair question, ${f}. The short version: automation that actually runs itself, and support that answers in minutes, not days. I'll send a one-pager.` },
    ],
  },
  {
    subject: () => 'Quick call this week?',
    turns: [
      { from: 'them', body: () => `Could we grab 20 minutes this week? Tuesday or Wednesday afternoon works my end.` },
      { from: 'me', body: (f) => `Hi ${f}, Wednesday at 2 suits me — I'll send an invite with a dial-in.` },
      { from: 'them', body: () => `Booked, thanks. I'll bring our ops lead along too.` },
    ],
  },
  {
    subject: (co) => `Proposal for ${co}`,
    turns: [
      { from: 'me', body: (f, co) => `Hi ${f}, as promised the proposal tailored to ${co} is attached. Happy to walk through it live.` },
      { from: 'them', body: () => `Got it, thank you. One thing — does the mid tier include the reporting add-on, or is that separate?` },
    ],
  },
  {
    subject: () => 'Renewal coming up',
    turns: [
      { from: 'me', body: (f) => `Hi ${f}, your plan renews next month. Want to review usage and options before it does?` },
      { from: 'them', body: () => `Yes please. Usage is up a lot since we added the sales team — curious whether we should move up a tier.` },
    ],
  },
  {
    subject: () => 'Following up on that ticket',
    turns: [
      { from: 'them', body: () => `Any word on the export bug my team flagged? It's slowing down our month-end.` },
      { from: 'me', body: (f) => `Hi ${f}, fix went out this morning and I've asked support to confirm with you directly. Sorry for the hold-up.` },
      { from: 'them', body: () => `No worries — just tested it and exports are clean again. Appreciate the quick turnaround.` },
    ],
  },
  {
    subject: () => 'Intro — thanks for connecting',
    turns: [
      { from: 'them', body: (_f, co) => `Good to connect! A colleague recommended you. We're rethinking how ${co} handles its pipeline.` },
      { from: 'me', body: (f) => `Great to hear from you, ${f}. Sounds like a good fit — would a short call next week be a sensible first step?` },
    ],
  },
  {
    subject: () => 'Security & data questions',
    turns: [
      { from: 'them', body: () => `Before we go further, our IT team needs the basics: where's data hosted, and are you SOC 2?` },
      { from: 'me', body: (f) => `Hi ${f}, EU-hosted with encryption at rest, and yes — SOC 2 Type II. I'll email the report and our DPA.` },
      { from: 'them', body: () => `Exactly what they'll want. That should clear the last hurdle internally.` },
    ],
  },
  {
    subject: () => 'Contract for signature',
    turns: [
      { from: 'me', body: (f) => `Hi ${f}, the agreement's ready — I've sent it over for e-signature. Shout if anything needs adjusting.` },
      { from: 'them', body: () => `Reviewing with legal today. Assuming no surprises we should have it back to you by Friday.` },
    ],
  },
];

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export type LineItem = { desc: string; qty: number; unitPrice: number };
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';
export type Invoice = {
  id: string;
  number: string;
  contactId: string;
  items: LineItem[];
  status: InvoiceStatus;
  issuedAt: number;
  dueAt: number;
};

// ── Quote-to-cash (Zoho: Products → Price Books → Quotes → Sales Orders → Invoices)
// A sellable product/service in the catalogue.
export type Product = {
  id: string;
  code: string; // SKU
  name: string;
  category: 'Subscription' | 'Services' | 'Support' | 'Add-on';
  unitPrice: number; // list price
  active: boolean;
};

// A named price list that adjusts list prices by a percentage (negative = discount).
export type PriceBook = {
  id: string;
  name: string;
  description: string;
  adjustmentPct: number; // e.g. -12 = 12% off list
  active: boolean;
};

// One line on a quote / sales order. `listPrice` is the per-unit price at add time
// (already adjusted by the chosen price book); `discountPct` is a further line discount.
export type QuoteLine = { productId: string; qty: number; listPrice: number; discountPct: number };
export type QuoteStatus = 'Draft' | 'Delivered' | 'Accepted' | 'Rejected';
export type Quote = {
  id: string;
  number: string; // QT-2000
  title: string;
  contactId: string;
  dealId?: string;
  priceBookId: string;
  lines: QuoteLine[];
  taxPct: number; // VAT
  status: QuoteStatus;
  createdAt: number;
  validUntil: number;
  salesOrderId?: string;
};

export type SalesOrderStatus = 'Created' | 'Approved' | 'Delivered' | 'Invoiced';
export type SalesOrder = {
  id: string;
  number: string; // SO-3000
  quoteId?: string;
  contactId: string;
  lines: QuoteLine[];
  taxPct: number;
  status: SalesOrderStatus;
  createdAt: number;
  invoiceId?: string;
};

export type Campaign = {
  id: string;
  name: string;
  channel: 'Email';
  status: 'Draft' | 'Scheduled' | 'Sent';
  sentAt: number;
  recipients: number;
  opens: number;
  clicks: number;
};

export type Automation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  runs: number;
};

export type CrmData = {
  contacts: Contact[];
  companies: Company[];
  leads: Lead[];
  cases: SupportCase[];
  deals: Deal[];
  activities: Activity[];
  tasks: Task[];
  meetings: Meeting[];
  threads: EmailThread[];
  templates: EmailTemplate[];
  products: Product[];
  priceBooks: PriceBook[];
  quotes: Quote[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  campaigns: Campaign[];
  automations: Automation[];
  source: 'randomuser.me' | 'fallback';
};

// The (small) sales team deals are assigned to.
export const OWNERS = ['Andrew L.', 'Thabo M.', 'Lerato K.', 'Sipho D.'];

const COMPANIES = [
  'Nova Retail Group', 'Kalahari Logistics', 'BluePeak Health', 'Summit Freight',
  'Orbit Software', 'Greenfield Agri', 'Vantage Legal', 'Coastal Hospitality',
  'Ironwood Construction', 'Pulse Media', 'Northstar Finance', 'Zenith Manufacturing',
  'Harbor Analytics', 'Cedar & Co.', 'Brightline Energy', 'Meridian Travel',
];
const INDUSTRIES = [
  'Retail', 'Logistics', 'Healthcare', 'Software', 'Agriculture', 'Legal',
  'Hospitality', 'Construction', 'Media', 'Finance', 'Manufacturing', 'Energy', 'Travel',
];
const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];
const TITLES = [
  'Operations Manager', 'Procurement Lead', 'CTO', 'Founder', 'Marketing Director',
  'Head of Sales', 'Finance Manager', 'IT Administrator', 'Product Owner', 'General Manager',
];
const TAGS = ['Enterprise', 'SMB', 'Inbound', 'Referral', 'Hot', 'Renewal', 'Upsell', 'Cold'];
const DEAL_TEMPLATES = [
  'Annual license', 'Onboarding package', 'Pilot program', 'Platform upgrade',
  'Support retainer', 'Custom integration', 'Seat expansion', 'Data migration',
];
const DEAL_VALUES = [5000, 8000, 12000, 15000, 20000, 25000, 40000, 60000, 90000];
const SUBJECTS: Record<ActivityType, string[]> = {
  Call: ['Discovery call', 'Follow-up call', 'Check-in call', 'Renewal discussion'],
  Email: ['Sent proposal', 'Pricing questions', 'Intro email', 'Contract sent'],
  Meeting: ['Demo scheduled', 'Kick-off meeting', 'Quarterly review', 'On-site visit'],
  Note: ['Budget confirmed', 'Decision maker identified', 'Competitor mentioned', 'Timeline noted'],
  Task: ['Prepare quote', 'Send NDA', 'Update forecast', 'Chase signature'],
};
const TASK_TITLES = [
  'Follow up on proposal', 'Send pricing breakdown', 'Prepare demo environment',
  'Draft contract', 'Chase signature', 'Schedule onboarding call', 'Update forecast',
  'Send case study', 'Confirm budget with finance', 'Renewal check-in',
];
const MEETING_KINDS: Meeting['kind'][] = ['Discovery', 'Demo', 'Review', 'Onboarding', 'Check-in'];
const MEETING_LOCS: Meeting['location'][] = ['Zoom', 'Google Meet', 'Phone', 'On-site'];
const LINE_DESCS = [
  'Platform subscription (annual)', 'Implementation & setup', 'Priority support',
  'Custom integration', 'Additional seats', 'Training workshop', 'Data migration',
];

// Deterministic PRNG so the generated dataset is stable across reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const pickN = <T,>(rng: () => number, arr: T[], n: number): T[] => {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
};
const rint = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

type Person = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  city: string;
  country: string;
};

const FALLBACK_PEOPLE: Person[] = [
  ['Amara', 'Okafor', 'Lagos', 'Nigeria'],
  ['Liam', 'Bennett', 'Manchester', 'UK'],
  ['Sofia', 'Rossi', 'Milan', 'Italy'],
  ['Noah', 'Williams', 'Toronto', 'Canada'],
  ['Priya', 'Sharma', 'Pune', 'India'],
  ['Ethan', 'Nguyen', 'Sydney', 'Australia'],
  ['Chloe', 'Dubois', 'Lyon', 'France'],
  ['Marcus', 'Johansson', 'Gothenburg', 'Sweden'],
  ['Zanele', 'Dlamini', 'Durban', 'South Africa'],
  ['Diego', 'Fernández', 'Seville', 'Spain'],
  ['Hana', 'Kim', 'Busan', 'South Korea'],
  ['Oliver', 'Murphy', 'Dublin', 'Ireland'],
].map(([firstName, lastName, city, country]) => ({
  firstName,
  lastName,
  city,
  country,
  email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
  phone: '+1 555 0100',
  avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(firstName + lastName)}`,
}));

// Turn a set of people into a full CRM dataset.
function buildCrmData(people: Person[], source: CrmData['source']): CrmData {
  const rng = mulberry32(1337);
  const now = Date.now();
  const day = 86_400_000;

  const contacts: Contact[] = people.map((p, i) => ({
    id: `c${i + 1}`,
    name: `${p.firstName} ${p.lastName}`,
    email: p.email,
    phone: p.phone,
    avatar: p.avatar,
    company: pick(rng, COMPANIES),
    title: pick(rng, TITLES),
    location: `${p.city}, ${p.country}`,
    status: pick(rng, STATUSES),
    owner: pick(rng, OWNERS),
    source: pick(rng, LEAD_SOURCES),
    tags: pickN(rng, TAGS, 2),
    createdAt: now - rint(rng, 5, 150) * day,
  }));

  // Companies: aggregate from the company names contacts actually landed on.
  const companyNames = Array.from(new Set(contacts.map((c) => c.company)));
  const companies: Company[] = companyNames.map((name, i) => ({
    id: `co${i + 1}`,
    name,
    industry: pick(rng, INDUSTRIES),
    size: pick(rng, COMPANY_SIZES),
    website: `www.${name.toLowerCase().replace(/[^a-z]+/g, '')}.com`,
    contactIds: contacts.filter((c) => c.company === name).map((c) => c.id),
  }));

  // A fixed stage spread so the pipeline and reports always look healthy
  // (a few won, a couple lost, the rest spread across open stages).
  const DEAL_STAGES: Stage[] = [
    'Won', 'Won', 'Won', 'Lost', 'Lost', 'Negotiation',
    'Negotiation', 'Proposal', 'Proposal', 'Contacted', 'Lead In', 'Lead In',
  ];
  const deals: Deal[] = Array.from({ length: 12 }, (_, i) => {
    const c = pick(rng, contacts);
    const stage = DEAL_STAGES[i];
    // Lost deals carry a reason + competitor so win/loss reporting is populated
    // out of the box (these are otherwise only captured via the Lost-deal modal).
    const lost = stage === 'Lost'
      ? { lostReason: pick(rng, LOST_REASONS), competitor: pick(rng, COMPETITORS.filter((x) => x !== 'None')) }
      : {};
    return {
      id: `d${i + 1}`,
      title: `${pick(rng, DEAL_TEMPLATES)} — ${c.company}`,
      contactId: c.id,
      value: pick(rng, DEAL_VALUES),
      stage,
      probability: STAGE_PROB[stage],
      expectedClose: now + (rint(rng, 0, 90) - 15) * day,
      owner: c.owner,
      ...lost,
    };
  });

  const activities: Activity[] = Array.from({ length: 24 }, (_, i) => {
    const c = pick(rng, contacts);
    const type = pick(rng, ACTIVITY_TYPES);
    const at = now + (rint(rng, 0, 24) - 14) * day;
    return {
      id: `a${i + 1}`,
      type,
      contactId: c.id,
      subject: pick(rng, SUBJECTS[type]),
      at,
      done: at < now ? rng() > 0.3 : false,
      owner: c.owner,
    };
  });

  // Seed a few engagement "signals" (opens, clicks, views) on several contacts so
  // the record page shows SalesSignals on first open — the live ambient engine
  // then adds more as you use the app.
  const SIGNAL_SUBJECTS = [
    'Opened your last email', 'Clicked a link in your proposal', 'Viewed your pricing page',
    'Replied to your message', 'Opened your follow-up', 'Downloaded the case study',
  ];
  pickN(rng, contacts, Math.min(6, contacts.length)).forEach((c, i) => {
    const count = rint(rng, 1, 3);
    for (let k = 0; k < count; k++) {
      activities.unshift({
        id: `sig${i + 1}-${k + 1}`,
        type: 'Email',
        contactId: c.id,
        subject: pick(rng, SIGNAL_SUBJECTS),
        at: now - rint(rng, 1, 72) * 3_600_000,
        done: true,
        owner: c.owner,
      });
    }
  });

  const tasks: Task[] = Array.from({ length: 14 }, (_, i) => {
    const c = pick(rng, contacts);
    const dueAt = now + (rint(rng, 0, 20) - 8) * day;
    return {
      id: `t${i + 1}`,
      title: pick(rng, TASK_TITLES),
      contactId: c.id,
      dueAt,
      priority: pick(rng, PRIORITIES),
      done: dueAt < now ? rng() > 0.45 : false,
      owner: c.owner,
    };
  });

  const meetings: Meeting[] = Array.from({ length: 9 }, (_, i) => {
    const c = pick(rng, contacts);
    const startAt = now + (rint(rng, 0, 20) - 6) * day + rint(rng, 9, 16) * 3_600_000;
    return {
      id: `m${i + 1}`,
      title: `${pick(rng, MEETING_KINDS)} — ${c.name.split(' ')[0]}`,
      contactId: c.id,
      startAt,
      durationMin: pick(rng, [30, 45, 60]),
      kind: pick(rng, MEETING_KINDS),
      location: pick(rng, MEETING_LOCS),
      owner: c.owner,
    };
  });

  // Each inbox thread is its own scenario, assigned uniquely so no two
  // conversations read alike — pricing, onboarding, a competitor bake-off,
  // scheduling, a support follow-up, renewal, and so on.
  const chosen = pickN(rng, contacts, Math.min(EMAIL_SCENARIOS.length, contacts.length));
  const threads: EmailThread[] = chosen.map((c, i) => {
    const scenario = EMAIL_SCENARIOS[i % EMAIL_SCENARIOS.length];
    const first = c.name.split(' ')[0];
    const base = now - rint(rng, 1, 20) * day;
    const messages: EmailMessage[] = scenario.turns.map((t, k) => ({
      from: t.from,
      at: base + k * rint(rng, 1, 3) * day,
      body: t.body(first, c.company),
    }));
    return {
      id: `em${i + 1}`,
      contactId: c.id,
      subject: scenario.subject(c.company),
      messages,
      unread: messages[messages.length - 1].from === 'them' && rng() > 0.4,
    };
  });

  const templates: EmailTemplate[] = [
    { id: 'tpl1', name: 'Intro / first touch', subject: 'Quick intro — {{company}}', body: 'Hi {{first}},\n\nI came across {{company}} and thought there might be a fit. Would you be open to a short call this week?\n\nBest,\nAndrew' },
    { id: 'tpl2', name: 'Send proposal', subject: 'Proposal for {{company}}', body: 'Hi {{first}},\n\nAs promised, here is a proposal tailored to {{company}}. Happy to walk through it live.\n\nThanks,\nAndrew' },
    { id: 'tpl3', name: 'Follow-up nudge', subject: 'Following up', body: 'Hi {{first}},\n\nJust floating this back to the top of your inbox. Any questions on the proposal?\n\nCheers,\nAndrew' },
    { id: 'tpl4', name: 'Renewal reminder', subject: 'Your renewal is coming up', body: 'Hi {{first}},\n\nYour plan renews soon. Would you like to review usage and options before it does?\n\nBest,\nAndrew' },
  ];

  // Product catalogue — the sellable items quotes are built from.
  const products: Product[] = [
    ['PLAT-SUB', 'Platform subscription (annual)', 'Subscription', 12000],
    ['IMPL-SETUP', 'Implementation & setup', 'Services', 4000],
    ['SUP-PRIO', 'Priority support', 'Support', 6000],
    ['INT-CUSTOM', 'Custom integration', 'Services', 8000],
    ['SEAT-ADD', 'Additional seats (per 5)', 'Add-on', 2500],
    ['TRAIN-WS', 'Training workshop', 'Services', 1800],
    ['DATA-MIG', 'Data migration', 'Services', 3500],
  ].map(([code, name, category, unitPrice], i) => ({
    id: `prod${i + 1}`,
    code: code as string,
    name: name as string,
    category: category as Product['category'],
    unitPrice: unitPrice as number,
    active: true,
  }));

  // Price books — named lists that discount off list price.
  const priceBooks: PriceBook[] = [
    { id: 'pb1', name: 'Standard', description: 'List pricing for standard deals.', adjustmentPct: 0, active: true },
    { id: 'pb2', name: 'Enterprise Volume', description: 'Volume discount for 200+ seat accounts.', adjustmentPct: -12, active: true },
    { id: 'pb3', name: 'Startup / SMB', description: 'Reduced tier for small teams.', adjustmentPct: -20, active: true },
  ];

  const byCode = (code: string) => products.find((p) => p.code === code)!;
  const mkLines = (rows: [string, number, number][], book: PriceBook): QuoteLine[] =>
    rows.map(([code, qty, discountPct]) => ({
      productId: byCode(code).id,
      qty,
      listPrice: bookPrice(byCode(code).unitPrice, book),
      discountPct,
    }));

  // A few seeded quotes across the lifecycle so the module reads full on first open.
  const qContacts = pickN(rng, contacts, Math.min(3, contacts.length));
  const quoteSeeds: { book: PriceBook; rows: [string, number, number][]; status: QuoteStatus }[] = [
    { book: priceBooks[0], rows: [['PLAT-SUB', 1, 0], ['IMPL-SETUP', 1, 0], ['TRAIN-WS', 1, 10]], status: 'Draft' },
    { book: priceBooks[1], rows: [['PLAT-SUB', 2, 5], ['SUP-PRIO', 1, 0], ['SEAT-ADD', 4, 0]], status: 'Delivered' },
    { book: priceBooks[2], rows: [['PLAT-SUB', 1, 0], ['DATA-MIG', 1, 0]], status: 'Accepted' },
  ];
  const quotes: Quote[] = quoteSeeds.map((s, i) => {
    const c = qContacts[i % qContacts.length];
    const createdAt = now - rint(rng, 3, 30) * day;
    return {
      id: `q${i + 1}`,
      number: `QT-${2000 + i}`,
      title: `${byCode(s.rows[0][0]).name.split(' ')[0]} package — ${c.company}`,
      contactId: c.id,
      dealId: deals.find((d) => d.contactId === c.id)?.id,
      priceBookId: s.book.id,
      lines: mkLines(s.rows, s.book),
      taxPct: 15,
      status: s.status,
      createdAt,
      validUntil: createdAt + 30 * day,
    };
  });

  // One sales order already in flight (from an accepted quote), delivered and
  // ready to invoice — so the tail of the chain is populated too.
  const soContact = qContacts[0];
  const salesOrders: SalesOrder[] = [
    {
      id: 'so1',
      number: 'SO-3000',
      contactId: soContact.id,
      lines: mkLines([['PLAT-SUB', 1, 0], ['SUP-PRIO', 1, 5]], priceBooks[0]),
      taxPct: 15,
      status: 'Delivered',
      createdAt: now - rint(rng, 5, 20) * day,
    },
  ];

  const invStatuses: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Paid', 'Overdue'];
  const invoices: Invoice[] = Array.from({ length: 11 }, (_, i) => {
    const c = pick(rng, contacts);
    const issuedAt = now - rint(rng, 2, 90) * day;
    const status = pick(rng, invStatuses);
    const items: LineItem[] = pickN(rng, LINE_DESCS, rint(rng, 1, 3)).map((desc) => ({
      desc,
      qty: rint(rng, 1, 5),
      unitPrice: pick(rng, [500, 1200, 2500, 4000, 6000]),
    }));
    return {
      id: `inv${i + 1}`,
      number: `INV-${1000 + i}`,
      contactId: c.id,
      items,
      status,
      issuedAt,
      dueAt: issuedAt + 30 * day,
    };
  });

  const campaigns: Campaign[] = [
    ['Spring product launch', 30],
    ['Renewal reminders Q3', 22],
    ['Webinar invite', 40],
    ['Case study newsletter', 55],
    ['Re-engagement — cold leads', 35],
  ].map(([name, recipients], i) => {
    const r = recipients as number;
    const opens = Math.round(r * (0.35 + rng() * 0.3));
    const clicks = Math.round(opens * (0.2 + rng() * 0.25));
    return {
      id: `cmp${i + 1}`,
      name: name as string,
      channel: 'Email' as const,
      status: i === 4 ? ('Scheduled' as const) : ('Sent' as const),
      sentAt: now - rint(rng, 1, 60) * day,
      recipients: r,
      opens,
      clicks,
    };
  });

  const automations: Automation[] = [
    { id: 'au1', name: 'Welcome new leads', trigger: 'Contact created', action: 'Send "Intro / first touch" email', enabled: true, runs: rint(rng, 20, 60) },
    { id: 'au2', name: 'Proposal follow-up', trigger: 'Deal moves to Proposal', action: 'Create follow-up task in 3 days', enabled: true, runs: rint(rng, 8, 25) },
    { id: 'au3', name: 'Stale deal alert', trigger: 'Deal idle 14 days', action: 'Notify deal owner', enabled: true, runs: rint(rng, 3, 12) },
    { id: 'au4', name: 'Won → onboarding', trigger: 'Deal marked Won', action: 'Schedule onboarding meeting', enabled: false, runs: rint(rng, 2, 9) },
    { id: 'au5', name: 'Invoice overdue', trigger: 'Invoice past due date', action: 'Email reminder + flag owner', enabled: true, runs: rint(rng, 1, 6) },
    { id: 'au6', name: 'Renewal 30-day', trigger: 'Customer renewal in 30 days', action: 'Send renewal reminder', enabled: false, runs: rint(rng, 1, 5) },
  ];

  // Unconverted leads — raw prospects that haven't become contacts yet.
  // Names are drawn from a small pool so they feel distinct from contacts.
  const LEAD_NAMES = [
    ['Grace', 'Mokoena'], ['Daniel', 'Reyes'], ['Aisha', 'Karim'], ['Tom', 'Fletcher'],
    ['Lindiwe', 'Naidoo'], ['Marco', 'Bianchi'], ['Yuki', 'Tanaka'], ['Sarah', 'O’Brien'],
  ];
  const LEAD_STATE: LeadStatus[] = ['New', 'New', 'Contacted', 'Contacted', 'Qualified', 'Qualified', 'Unqualified'];
  const leads: Lead[] = LEAD_NAMES.slice(0, 7).map(([first, last], i) => {
    const company = pick(rng, COMPANIES);
    const status = LEAD_STATE[i];
    return {
      id: `l${i + 1}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@${company.toLowerCase().replace(/[^a-z]+/g, '')}.com`,
      phone: '+27 82 000 ' + rint(rng, 1000, 9999),
      avatar: avatarFor(first + last),
      company,
      title: pick(rng, TITLES),
      source: pick(rng, LEAD_SOURCES),
      status,
      score: status === 'Qualified' ? rint(rng, 70, 95) : status === 'Contacted' ? rint(rng, 40, 70) : status === 'Unqualified' ? rint(rng, 5, 25) : rint(rng, 20, 60),
      estValue: pick(rng, DEAL_VALUES),
      owner: pick(rng, OWNERS),
      createdAt: now - rint(rng, 1, 40) * day,
    };
  });

  // Support cases (tickets) tied to existing customer contacts.
  const CASE_SUBJECTS = [
    'Login issue after password reset', 'Export to CSV is failing', 'Request: bulk import of contacts',
    'Invoice PDF shows wrong logo', 'API rate limit questions', 'Onboarding — SSO setup help',
    'Report totals look incorrect', 'Mobile app crashes on upload',
  ];
  // Curated priority + age (hours) per case so the SLA board always shows a
  // realistic mix — a couple breached, some due soon, the rest on track or met.
  const hour = 3_600_000;
  const CASE_ROWS: { status: CaseStatus; priority: Priority; ageH: number }[] = [
    { status: 'Open', priority: 'High', ageH: 2 },      // resolution 8h → on track (response already breached)
    { status: 'Open', priority: 'Medium', ageH: 21 },   // resolution 24h → due soon
    { status: 'Pending', priority: 'High', ageH: 12 },  // High resolution 8h, past due → breached
    { status: 'Replied', priority: 'Low', ageH: 30 },   // Low resolution 72h → on track
    { status: 'Replied', priority: 'Medium', ageH: 40 }, // Medium resolution 24h, past → breached
    { status: 'Resolved', priority: 'High', ageH: 100 }, // met
    { status: 'Resolved', priority: 'Medium', ageH: 200 }, // met
    { status: 'Closed', priority: 'Low', ageH: 400 },   // met
  ];
  const cases: SupportCase[] = CASE_SUBJECTS.map((subject, i) => {
    const row = CASE_ROWS[i];
    const c = pick(rng, contacts);
    const createdAt = now - row.ageH * hour;
    return {
      id: `case${i + 1}`,
      number: `CASE-${1000 + i}`,
      subject,
      contactId: c.id,
      priority: row.priority,
      status: row.status,
      type: pick(rng, CASE_TYPES as unknown as string[]) as SupportCase['type'],
      createdAt,
      updatedAt: createdAt + Math.round(row.ageH * 0.5) * hour,
    };
  });

  return {
    contacts, companies, leads, cases, deals, activities, tasks, meetings,
    threads, templates, products, priceBooks, quotes, salesOrders,
    invoices, campaigns, automations, source,
  };
}

// Live-load people from randomuser.me, falling back to the baked-in set.
export async function fetchCrmData(): Promise<CrmData> {
  try {
    const res = await fetch(
      'https://randomuser.me/api/?results=15&seed=langeveldt-crm&nat=us,gb,ca,au,nz,fr,es&inc=name,email,phone,picture,location'
    );
    if (!res.ok) throw new Error(`randomuser ${res.status}`);
    const json = await res.json();
    const people: Person[] = (json.results ?? []).map((r: any) => ({
      firstName: r.name?.first ?? 'Unknown',
      lastName: r.name?.last ?? '',
      email: r.email ?? 'unknown@example.com',
      phone: r.phone ?? '',
      avatar: r.picture?.large ?? r.picture?.medium ?? '',
      city: r.location?.city ?? '',
      country: r.location?.country ?? '',
    }));
    if (!people.length) throw new Error('no results');
    return buildCrmData(people, 'randomuser.me');
  } catch {
    return buildCrmData(FALLBACK_PEOPLE, 'fallback');
  }
}

// A DiceBear avatar for contacts created inside the demo.
export const avatarFor = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed || 'new')}`;

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
export const invoiceTotal = (inv: Invoice) => inv.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

// ── Quote-to-cash money math ────────────────────────────────────────────────
// Price-book-adjusted unit price for a product.
export const bookPrice = (unitPrice: number, book: PriceBook) =>
  Math.round(unitPrice * (1 + book.adjustmentPct / 100));
// Net total for one line after its own discount.
export const lineNet = (l: QuoteLine) => Math.round(l.qty * l.listPrice * (1 - l.discountPct / 100));
export const quoteSubtotal = (lines: QuoteLine[]) => lines.reduce((s, l) => s + lineNet(l), 0);
export const quoteTax = (lines: QuoteLine[], taxPct: number) => Math.round(quoteSubtotal(lines) * taxPct / 100);
export const quoteGrand = (lines: QuoteLine[], taxPct: number) => quoteSubtotal(lines) + quoteTax(lines, taxPct);
