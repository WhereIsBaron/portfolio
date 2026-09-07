import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, Users, KanbanSquare, Activity as ActivityIcon,
  Search, Plus, X, Check, Phone, Mail, Calendar, StickyNote, CheckSquare,
  Building2, TrendingUp, Target, DollarSign, ChevronRight, Database,
} from 'lucide-react';
import {
  fetchCrmData, avatarFor, money,
  STAGES, OPEN_STAGES, STAGE_PROB, STATUSES, ACTIVITY_TYPES, OWNERS,
  type Contact, type Deal, type Activity, type Stage, type Status, type ActivityType,
} from '@/data/crmSeed';

type Tab = 'dashboard' | 'contacts' | 'pipeline' | 'activities';

const STATUS_STYLE: Record<Status, string> = {
  Lead: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Prospect: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Customer: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Churned: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};
const ACT_ICON: Record<ActivityType, typeof Phone> = {
  Call: Phone, Email: Mail, Meeting: Calendar, Note: StickyNote, Task: CheckSquare,
};
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

function Avatar({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = err || !src ? avatarFor(name) : src;
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      onError={() => setErr(true)}
      className="rounded-full border border-white/10 bg-[var(--bg-soft)] object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export default function CrmPage() {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCrmData().then((d) => {
      if (cancelled) return;
      setContacts(d.contacts);
      setDeals(d.deals);
      setActivities(d.activities);
      setSource(d.source);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);

  const kpis = useMemo(() => {
    const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
    const pipeline = open.reduce((s, d) => s + d.value, 0);
    const weighted = open.reduce((s, d) => s + (d.value * d.probability) / 100, 0);
    const now = new Date();
    const wonThisMonth = deals
      .filter((d) => d.stage === 'Won' && new Date(d.expectedClose).getMonth() === now.getMonth())
      .reduce((s, d) => s + d.value, 0);
    const openTasks = activities.filter((a) => !a.done && a.at >= Date.now() - 86_400_000).length;
    return { contacts: contacts.length, openDeals: open.length, pipeline, weighted, wonThisMonth, openTasks };
  }, [contacts, deals, activities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.company, c.email, c.title, c.status].some((f) => f.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const selected = selectedId ? byId[selectedId] : null;

  // ── Mutations (in-memory) ────────────────────────────────────────────────
  const advanceDeal = (id: string) =>
    setDeals((ds) =>
      ds.map((d) => {
        if (d.id !== id) return d;
        const order: Stage[] = ['Lead In', 'Contacted', 'Proposal', 'Negotiation', 'Won'];
        const idx = order.indexOf(d.stage);
        const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : d.stage;
        return { ...d, stage: next, probability: STAGE_PROB[next] };
      })
    );
  const loseDeal = (id: string) =>
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage: 'Lost', probability: 0 } : d)));
  const toggleActivity = (id: string) =>
    setActivities((as) => as.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));

  const addContact = (c: Omit<Contact, 'id' | 'avatar' | 'createdAt' | 'tags' | 'owner' | 'location'>) => {
    const id = `c${contacts.length + 1}-${Date.now()}`;
    setContacts((cs) => [
      {
        ...c,
        id,
        avatar: avatarFor(c.name),
        tags: ['Inbound'],
        owner: OWNERS[0],
        location: '—',
        createdAt: Date.now(),
      },
      ...cs,
    ]);
    setAddOpen(false);
    setTab('contacts');
    setSelectedId(id);
  };

  const logActivity = (contactId: string, type: ActivityType, subject: string) => {
    setActivities((as) => [
      { id: `a-${Date.now()}`, type, contactId, subject, at: Date.now(), done: false, owner: OWNERS[0] },
      ...as,
    ]);
  };

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
    { id: 'activities', label: 'Activities', icon: ActivityIcon },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            Andrew<span className="text-[var(--brand-bright)]">.</span>Langeveldt
          </Link>
          <Link
            to="/#work"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> Back to portfolio
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-6 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Live front-end demo
        </span>
        <h1 className="mt-6 max-w-3xl font-display text-4xl font-light leading-[1.1] text-white sm:text-5xl">
          A working <span className="text-[var(--brand-bright)]">CRM</span>, simulated end to end.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          Contacts, a drag-free deal pipeline, activity tracking, and a live dashboard — populated
          with real sample identities from a public API. Everything below is interactive: advance
          deals, log activities, add contacts, and watch the numbers move.
        </p>
      </section>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                tab === t.id
                  ? 'bg-[var(--brand-bright)] text-[#0b0d10]'
                  : 'border border-white/10 text-[var(--muted)] hover:text-white'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
          <button
            onClick={() => setAddOpen(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <Plus size={15} /> New contact
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <div className="py-24 text-center text-[var(--muted)]">Loading sample data…</div>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard kpis={kpis} deals={deals} activities={activities} byId={byId} source={source} />}
            {tab === 'contacts' && (
              <Contacts
                contacts={filtered}
                search={search}
                setSearch={setSearch}
                onOpen={setSelectedId}
                dealsFor={(id) => deals.filter((d) => d.contactId === id)}
              />
            )}
            {tab === 'pipeline' && (
              <Pipeline deals={deals} byId={byId} onAdvance={advanceDeal} onLose={loseDeal} />
            )}
            {tab === 'activities' && (
              <Activities activities={activities} byId={byId} onToggle={toggleActivity} contacts={contacts} onLog={logActivity} />
            )}
          </>
        )}
      </section>

      {/* Contact drawer */}
      {selected && (
        <ContactDrawer
          contact={selected}
          deals={deals.filter((d) => d.contactId === selected.id)}
          activities={activities.filter((a) => a.contactId === selected.id).sort((a, b) => b.at - a.at)}
          onClose={() => setSelectedId(null)}
          onLog={(type, subject) => logActivity(selected.id, type, subject)}
        />
      )}

      {addOpen && <AddContactModal onClose={() => setAddOpen(false)} onAdd={addContact} />}

      <div className="h-16" />
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({
  kpis, deals, activities, byId, source,
}: {
  kpis: { contacts: number; openDeals: number; pipeline: number; weighted: number; wonThisMonth: number; openTasks: number };
  deals: Deal[];
  activities: Activity[];
  byId: Record<string, Contact>;
  source: string;
}) {
  const stageCounts = STAGES.map((s) => ({
    stage: s,
    count: deals.filter((d) => d.stage === s).length,
    value: deals.filter((d) => d.stage === s).reduce((a, d) => a + d.value, 0),
  }));
  const maxVal = Math.max(1, ...stageCounts.map((s) => s.value));
  const recent = [...activities].sort((a, b) => b.at - a.at).slice(0, 6);
  const topDeals = [...deals].filter((d) => OPEN_STAGES.includes(d.stage)).sort((a, b) => b.value - a.value).slice(0, 5);

  const cards = [
    { label: 'Contacts', value: kpis.contacts.toString(), icon: Users },
    { label: 'Open deals', value: kpis.openDeals.toString(), icon: Target },
    { label: 'Pipeline value', value: money(kpis.pipeline), icon: DollarSign },
    { label: 'Weighted forecast', value: money(kpis.weighted), icon: TrendingUp },
    { label: 'Won this month', value: money(kpis.wonThisMonth), icon: Check },
    { label: 'Tasks due', value: kpis.openTasks.toString(), icon: CheckSquare },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
            <c.icon size={16} className="text-[var(--brand-bright)]" />
            <div className="mt-3 font-display text-2xl text-white">{c.value}</div>
            <div className="text-xs text-[var(--muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline by stage */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
          <h3 className="font-display text-lg text-white">Pipeline by stage</h3>
          <div className="mt-4 space-y-3">
            {stageCounts.map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">{s.stage} <span className="opacity-60">· {s.count}</span></span>
                  <span className="text-white">{money(s.value)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-[var(--brand-bright)]"
                    style={{ width: `${(s.value / maxVal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
          <h3 className="font-display text-lg text-white">Recent activity</h3>
          <ul className="mt-4 space-y-3">
            {recent.map((a) => {
              const Icon = ACT_ICON[a.type];
              return (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--brand-bright)]">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text)]">
                    {a.subject} <span className="text-[var(--muted)]">· {byId[a.contactId]?.name ?? '—'}</span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">{fmtDate(a.at)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Top deals */}
      <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
        <h3 className="font-display text-lg text-white">Top open deals</h3>
        <div className="mt-4 space-y-2">
          {topDeals.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl bg-[var(--bg-soft)] px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-white">{d.title}</span>
              <span className="hidden shrink-0 text-[var(--muted)] sm:inline">{d.stage}</span>
              <span className="shrink-0 font-medium text-[var(--brand-bright)]">{money(d.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data & APIs */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--surface)] to-transparent p-6">
        <h3 className="flex items-center gap-2 font-display text-lg text-white">
          <Database size={18} className="text-[var(--brand-bright)]" /> Data &amp; APIs
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Sample identities were loaded from{' '}
          <span className="text-white">
            {source === 'randomuser.me' ? 'the randomuser.me API (live)' : 'a built-in fallback set (API unavailable)'}
          </span>
          . Companies, deals, and activities are generated on top with a seeded random generator, so
          the dataset stays small and reproducible.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
          <li>• <span className="text-white">randomuser.me</span> — names, emails, phones, locations, and avatars for contacts.</li>
          <li>• <span className="text-white">DiceBear</span> — generated avatars for contacts you add, and as an image fallback.</li>
        </ul>
        <p className="mt-3 text-xs text-[var(--muted)]/70">
          Front-end demo — changes live in your browser only. A Supabase-backed version (persisted
          contacts, deals, and activities) is the next step, matching the booking demo.
        </p>
      </div>
    </div>
  );
}

// ── Contacts ─────────────────────────────────────────────────────────────────
function Contacts({
  contacts, search, setSearch, onOpen, dealsFor,
}: {
  contacts: Contact[];
  search: string;
  setSearch: (v: string) => void;
  onOpen: (id: string) => void;
  dealsFor: (id: string) => Deal[];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2">
        <Search size={16} className="text-[var(--muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company, email, status…"
          className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Deals</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="cursor-pointer border-t border-white/5 bg-[var(--bg)]/40 transition-colors hover:bg-white/5"
              >
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
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{c.owner}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{dealsFor(c.id).length}</td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight size={16} className="text-[var(--muted)]" />
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">No contacts match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pipeline (kanban) ────────────────────────────────────────────────────────
function Pipeline({
  deals, byId, onAdvance, onLose,
}: {
  deals: Deal[];
  byId: Record<string, Contact>;
  onAdvance: (id: string) => void;
  onLose: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const col = deals.filter((d) => d.stage === stage);
        const total = col.reduce((s, d) => s + d.value, 0);
        return (
          <div key={stage} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-white">{stage}</span>
              <span className="text-xs text-[var(--muted)]">{col.length}</span>
            </div>
            <div className="mb-2 px-1 text-xs text-[var(--brand-bright)]">{money(total)}</div>
            <div className="space-y-2">
              {col.map((d) => {
                const c = byId[d.contactId];
                const canAdvance = stage !== 'Won' && stage !== 'Lost';
                return (
                  <div key={d.id} className="rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3">
                    <div className="text-sm font-medium text-white">{money(d.value)}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{d.title}</div>
                    {c && (
                      <div className="mt-2 flex items-center gap-2">
                        <Avatar src={c.avatar} name={c.name} size={20} />
                        <span className="truncate text-xs text-[var(--muted)]">{c.name}</span>
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-[var(--muted)]/70">{d.probability}% · {d.owner}</div>
                    {canAdvance && (
                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={() => onAdvance(d.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--brand-bright)] px-2 py-1 text-[11px] font-medium text-[#0b0d10] transition-colors hover:bg-white"
                        >
                          Advance <ChevronRight size={12} />
                        </button>
                        <button
                          onClick={() => onLose(d.id)}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-[var(--muted)] transition-colors hover:text-rose-300"
                        >
                          Lost
                        </button>
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
  );
}

// ── Activities ───────────────────────────────────────────────────────────────
function Activities({
  activities, byId, onToggle, contacts, onLog,
}: {
  activities: Activity[];
  byId: Record<string, Contact>;
  onToggle: (id: string) => void;
  contacts: Contact[];
  onLog: (contactId: string, type: ActivityType, subject: string) => void;
}) {
  const [cid, setCid] = useState('');
  const [type, setType] = useState<ActivityType>('Call');
  const [subject, setSubject] = useState('');
  const sorted = [...activities].sort((a, b) => b.at - a.at);

  const submit = () => {
    const contactId = cid || contacts[0]?.id;
    if (!contactId || !subject.trim()) return;
    onLog(contactId, type, subject.trim());
    setSubject('');
  };

  return (
    <div className="space-y-4">
      {/* Log activity */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] p-3">
        <select
          value={cid || contacts[0]?.id || ''}
          onChange={(e) => setCid(e.target.value)}
          className="rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none"
        >
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ActivityType)}
          className="rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none"
        >
          {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="What happened?"
          className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--muted)]"
        />
        <button
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-bright)] px-3 py-2 text-sm font-medium text-[#0b0d10] transition-colors hover:bg-white"
        >
          <Plus size={15} /> Log
        </button>
      </div>

      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
        {sorted.map((a) => {
          const Icon = ACT_ICON[a.type];
          const upcoming = a.at > Date.now();
          return (
            <li key={a.id} className="flex items-center gap-3 bg-[var(--surface)] px-4 py-3">
              <button
                onClick={() => onToggle(a.id)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  a.done ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border-white/20 text-transparent hover:border-white/40'
                }`}
                aria-label={a.done ? 'Mark not done' : 'Mark done'}
              >
                <Check size={14} />
              </button>
              <Icon size={16} className="shrink-0 text-[var(--brand-bright)]" />
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm ${a.done ? 'text-[var(--muted)] line-through' : 'text-white'}`}>{a.subject}</div>
                <div className="truncate text-xs text-[var(--muted)]">
                  {a.type} · {byId[a.contactId]?.name ?? '—'} · {a.owner}
                </div>
              </div>
              <span className={`shrink-0 text-xs ${upcoming ? 'text-[var(--brand-bright)]' : 'text-[var(--muted)]'}`}>{fmtDate(a.at)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Contact drawer ───────────────────────────────────────────────────────────
function ContactDrawer({
  contact, deals, activities, onClose, onLog,
}: {
  contact: Contact;
  deals: Deal[];
  activities: Activity[];
  onClose: () => void;
  onLog: (type: ActivityType, subject: string) => void;
}) {
  const [type, setType] = useState<ActivityType>('Note');
  const [subject, setSubject] = useState('');
  const submit = () => {
    if (!subject.trim()) return;
    onLog(type, subject.trim());
    setSubject('');
  };
  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <Avatar src={contact.avatar} name={contact.name} size={52} />
            <div>
              <div className="font-display text-lg text-white">{contact.name}</div>
              <div className="text-sm text-[var(--muted)]">{contact.title}</div>
              <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[contact.status]}`}>{contact.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 border-b border-white/10 p-5 text-sm">
          <Row icon={Building2} text={contact.company} />
          <Row icon={Mail} text={contact.email} />
          <Row icon={Phone} text={contact.phone} />
          <Row icon={Calendar} text={`Added ${fmtDate(contact.createdAt)} · ${contact.location}`} />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {contact.tags.map((t) => (
              <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-[var(--muted)]">{t}</span>
            ))}
          </div>
        </div>

        {deals.length > 0 && (
          <div className="border-b border-white/10 p-5">
            <h4 className="text-xs uppercase tracking-wide text-[var(--muted)]">Deals</h4>
            <div className="mt-2 space-y-2">
              {deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl bg-[var(--bg-soft)] px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-white">{d.title}</span>
                  <span className="ml-2 shrink-0 text-[var(--muted)]">{d.stage} · <span className="text-[var(--brand-bright)]">{money(d.value)}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-5">
          <h4 className="text-xs uppercase tracking-wide text-[var(--muted)]">Timeline</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
              className="rounded-lg border border-white/10 bg-[var(--bg-soft)] px-2 py-1.5 text-sm text-white outline-none"
            >
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Log something…"
              className="min-w-[120px] flex-1 rounded-lg border border-white/10 bg-[var(--bg-soft)] px-3 py-1.5 text-sm text-white outline-none placeholder:text-[var(--muted)]"
            />
            <button onClick={submit} className="rounded-lg bg-[var(--brand-bright)] px-3 py-1.5 text-sm font-medium text-[#0b0d10] hover:bg-white">Add</button>
          </div>
          <ul className="mt-4 space-y-3">
            {activities.map((a) => {
              const Icon = ACT_ICON[a.type];
              return (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--brand-bright)]">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`${a.done ? 'text-[var(--muted)] line-through' : 'text-white'}`}>{a.subject}</div>
                    <div className="text-xs text-[var(--muted)]">{a.type} · {fmtDate(a.at)}</div>
                  </div>
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
  return (
    <div className="flex items-center gap-2 text-[var(--muted)]">
      <Icon size={15} className="shrink-0" />
      <span className="truncate text-[var(--text)]">{text}</span>
    </div>
  );
}

// ── Add contact ──────────────────────────────────────────────────────────────
function AddContactModal({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (c: { name: string; email: string; phone: string; company: string; title: string; status: Status }) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('Lead');

  const field = 'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-bright)]';
  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: '—',
      company: company.trim() || 'Unassigned',
      title: title.trim() || 'Contact',
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-white">New contact</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={field} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={field} />
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className={field} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className={field} />
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={field}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={submit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bright)] py-2.5 font-medium text-[#0b0d10] transition-colors hover:bg-white"
          >
            <Plus size={16} /> Add contact
          </button>
        </div>
      </div>
    </div>
  );
}
