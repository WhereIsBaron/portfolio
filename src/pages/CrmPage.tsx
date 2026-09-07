import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, Users, Building2, KanbanSquare, CheckSquare,
  Calendar, Inbox, FileText, Megaphone, Zap, BarChart3, Settings as SettingsIcon,
  Search, Plus, X, Check, Phone, Mail, StickyNote, ChevronRight, Database,
  Clock, TrendingUp, Target, DollarSign, AlertTriangle, Send, Menu,
} from 'lucide-react';
import {
  fetchCrmData, avatarFor, money, invoiceTotal,
  STAGES, OPEN_STAGES, STAGE_PROB, STATUSES, ACTIVITY_TYPES, PRIORITIES, LEAD_SOURCES, OWNERS,
  type Contact, type Company, type Deal, type Activity, type Task, type Meeting,
  type EmailThread, type EmailTemplate, type Invoice, type Campaign, type Automation,
  type Stage, type Status, type ActivityType, type Priority, type InvoiceStatus,
} from '@/data/crmSeed';

type Tab =
  | 'dashboard' | 'contacts' | 'companies' | 'pipeline' | 'tasks' | 'calendar'
  | 'inbox' | 'invoices' | 'campaigns' | 'automations' | 'reports' | 'settings';

const NAV: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

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

export default function CrmPage() {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    fetchCrmData().then((d) => {
      if (cancelled) return;
      setContacts(d.contacts);
      setCompanies(d.companies);
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

  // ── Mutations ─────────────────────────────────────────────────────────────
  const advanceDeal = (id: string) =>
    setDeals((ds) => ds.map((d) => {
      if (d.id !== id) return d;
      const order: Stage[] = ['Lead In', 'Contacted', 'Proposal', 'Negotiation', 'Won'];
      const idx = order.indexOf(d.stage);
      const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : d.stage;
      return { ...d, stage: next, probability: STAGE_PROB[next] };
    }));
  const loseDeal = (id: string) =>
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage: 'Lost', probability: 0 } : d)));
  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const toggleAutomation = (id: string) =>
    setAutomations((as) => as.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  const markPaid = (id: string) =>
    setInvoices((iv) => iv.map((i) => (i.id === id ? { ...i, status: 'Paid' } : i)));
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
  const replyThread = (id: string, body: string) =>
    setThreads((th) => th.map((t) =>
      t.id === id ? { ...t, unread: false, messages: [...t.messages, { from: 'me', at: Date.now(), body }] } : t));
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
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-[var(--muted)] sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Live demo
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
              {tab === 'contacts' && (
                <Contacts contacts={contacts} onOpen={setSelectedId} dealsFor={(id) => deals.filter((d) => d.contactId === id)} />
              )}
              {tab === 'companies' && <Companies companies={companies} contacts={contacts} deals={deals} onOpen={setSelectedId} />}
              {tab === 'pipeline' && <Pipeline deals={deals} byId={byId} onAdvance={advanceDeal} onLose={loseDeal} />}
              {tab === 'tasks' && <Tasks tasks={tasks} byId={byId} contacts={contacts} onToggle={toggleTask} onAdd={addTask} />}
              {tab === 'calendar' && <CalendarView meetings={meetings} byId={byId} />}
              {tab === 'inbox' && (
                <InboxView threads={threads} byId={byId} templates={templates} onReply={replyThread} onRead={markThreadRead} />
              )}
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
function Pipeline({
  deals, byId, onAdvance, onLose,
}: { deals: Deal[]; byId: Record<string, Contact>; onAdvance: (id: string) => void; onLose: (id: string) => void }) {
  return (
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
  threads, byId, templates, onReply, onRead,
}: {
  threads: EmailThread[]; byId: Record<string, Contact>; templates: EmailTemplate[];
  onReply: (id: string, body: string) => void; onRead: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(threads[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const active = threads.find((t) => t.id === openId);
  const contact = active ? byId[active.contactId] : null;

  const fill = (body: string) =>
    contact ? body.replace(/{{first}}/g, contact.name.split(' ')[0]).replace(/{{company}}/g, contact.company) : body;

  const send = () => {
    if (!active || !draft.trim()) return;
    onReply(active.id, draft.trim());
    setDraft('');
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

      <div className={`${card} flex min-h-[400px] flex-col`}>
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
            </div>
            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {templates.map((tpl) => (
                  <button key={tpl.id} onClick={() => setDraft(fill(tpl.body))} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[var(--muted)] transition-colors hover:text-white">{tpl.name}</button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Write a reply… (or pick a template)" className="flex-1 resize-none rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--muted)]" />
                <button onClick={send} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-bright)] px-3 py-2.5 text-sm font-medium text-[#0b0d10] hover:bg-white"><Send size={15} /></button>
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
