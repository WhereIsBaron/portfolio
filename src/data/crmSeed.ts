// ─────────────────────────────────────────────────────────────────────────
// CRM demo data layer.
//
// Populates a small, realistic CRM dataset for the front-end demo. Contacts are
// pulled LIVE from the free randomuser.me public API (names, emails, phones,
// locations, avatars). If that call fails (offline / rate-limited), we fall back
// to a small baked-in set with DiceBear avatars so the demo NEVER breaks.
//
// Everything downstream (companies, deals, activities) is generated with a
// seeded PRNG so the same dataset is reproducible run-to-run. We deliberately
// keep the volume tiny (15 contacts) — this is a simulation, not a data dump.
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
  tags: string[];
  createdAt: number;
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

export type CrmData = {
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
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
    tags: pickN(rng, TAGS, 2),
    createdAt: now - Math.floor(rng() * 150) * day,
  }));

  const deals: Deal[] = Array.from({ length: 11 }, (_, i) => {
    const c = pick(rng, contacts);
    const stage = pick(rng, STAGES);
    return {
      id: `d${i + 1}`,
      title: `${pick(rng, DEAL_TEMPLATES)} — ${c.company}`,
      contactId: c.id,
      value: pick(rng, DEAL_VALUES),
      stage,
      probability: STAGE_PROB[stage],
      expectedClose: now + (Math.floor(rng() * 90) - 15) * day,
      owner: c.owner,
    };
  });

  const activities: Activity[] = Array.from({ length: 22 }, (_, i) => {
    const c = pick(rng, contacts);
    const type = pick(rng, ACTIVITY_TYPES);
    const at = now + (Math.floor(rng() * 24) - 14) * day;
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

  return { contacts, deals, activities, source };
}

// Live-load contacts from randomuser.me, falling back to the baked-in set.
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

export const money = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US');
