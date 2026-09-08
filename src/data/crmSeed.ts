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
    return {
      id: `d${i + 1}`,
      title: `${pick(rng, DEAL_TEMPLATES)} — ${c.company}`,
      contactId: c.id,
      value: pick(rng, DEAL_VALUES),
      stage,
      probability: STAGE_PROB[stage],
      expectedClose: now + (rint(rng, 0, 90) - 15) * day,
      owner: c.owner,
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

  const threads: EmailThread[] = pickN(rng, contacts, Math.min(8, contacts.length)).map((c, i) => {
    const subj = pick(rng, ['Proposal for ' + c.company, 'Re: Pricing', 'Next steps', 'Intro & scheduling', 'Following up']);
    const n = rint(rng, 1, 3);
    const base = now - rint(rng, 1, 20) * day;
    const messages: EmailMessage[] = Array.from({ length: n }, (_, k) => ({
      from: k % 2 === 0 ? 'them' : 'me',
      at: base + k * rint(rng, 1, 3) * day,
      body:
        k % 2 === 0
          ? pick(rng, [
              `Hi, thanks for reaching out. Could you share pricing for ${c.company}?`,
              `Appreciate the demo. What would onboarding look like for our team?`,
              `We're comparing a couple of options — what makes yours different?`,
            ])
          : pick(rng, [
              `Happy to help! I've attached a proposal tailored to ${c.company}.`,
              `Great question — onboarding takes about two weeks with a dedicated lead.`,
              `Let's set up a quick call this week to walk through it.`,
            ]),
    }));
    return {
      id: `em${i + 1}`,
      contactId: c.id,
      subject: subj,
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
  const CASE_STATE: CaseStatus[] = ['Open', 'Open', 'Pending', 'Replied', 'Replied', 'Resolved', 'Resolved', 'Closed'];
  const cases: SupportCase[] = CASE_SUBJECTS.map((subject, i) => {
    const c = pick(rng, contacts);
    const createdAt = now - rint(rng, 0, 25) * day;
    return {
      id: `case${i + 1}`,
      number: `CASE-${1000 + i}`,
      subject,
      contactId: c.id,
      priority: pick(rng, PRIORITIES),
      status: CASE_STATE[i],
      type: pick(rng, CASE_TYPES as unknown as string[]) as SupportCase['type'],
      createdAt,
      updatedAt: createdAt + rint(rng, 0, 5) * day,
    };
  });

  return {
    contacts, companies, leads, cases, deals, activities, tasks, meetings,
    threads, templates, invoices, campaigns, automations, source,
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
