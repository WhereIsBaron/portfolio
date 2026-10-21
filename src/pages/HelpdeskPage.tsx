import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LifeBuoy, Ticket, Send, Clock, AlertTriangle, CheckCircle2,
  Laptop, Monitor, Printer, Network, Smartphone, HardDrive, Server,
  Boxes, Gauge, Timer, UserCircle2, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import Footer from '@/components/Footer';

// ─────────────────────────────────────────────────────────────────────────
// IT Helpdesk & Asset Console — focused single-page demo.
//
// A simulated service-desk console for the daily work of an IT support &
// networking officer: a ticket queue with live SLA tracking, an interactive
// ticket detail (change status, assign, reply — and watch the SLA recompute),
// an IT asset register (CMDB-lite), and an SLA policy board. Tickets are
// stateful in-session so the workflow is real; the seed data is fixed.
//
// Reference systems (UX/feature study only — no code reused): GLPI & osTicket.
// All logic, data and UI here are original.
// ─────────────────────────────────────────────────────────────────────────

type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
type Status = 'New' | 'Open' | 'Pending' | 'Resolved';
type Category = 'Hardware' | 'Software' | 'Network' | 'Account/Access' | 'Email' | 'Printing';

const PRIORITIES: Priority[] = ['Urgent', 'High', 'Medium', 'Low'];
const STATUSES: Status[] = ['New', 'Open', 'Pending', 'Resolved'];
const AGENTS = ['Andrew L.', 'Boitumelo K.', 'Unassigned'];

// SLA targets in minutes: [first response, resolution] per priority.
const SLA_TARGET: Record<Priority, { response: number; resolution: number }> = {
  Urgent: { response: 15, resolution: 240 },
  High:   { response: 60, resolution: 480 },
  Medium: { response: 240, resolution: 1440 },
  Low:    { response: 480, resolution: 2880 },
};

type ThreadEntry = { author: string; role: 'requester' | 'agent'; body: string; agoMin: number };

type TicketT = {
  id: string;
  subject: string;
  requester: string;
  dept: string;
  category: Category;
  priority: Priority;
  status: Status;
  assignee: string;
  createdMinAgo: number;
  firstResponseMinAgo: number | null; // null = not yet responded
  resolvedMinAgo: number | null;      // null = not yet resolved
  thread: ThreadEntry[];
};

const SEED_TICKETS: TicketT[] = [
  {
    id: 'DESK-4071', subject: 'Cannot connect to office Wi-Fi after password change', requester: 'Lesego M.',
    dept: 'Finance', category: 'Network', priority: 'High', status: 'New', assignee: 'Unassigned',
    createdMinAgo: 42, firstResponseMinAgo: null, resolvedMinAgo: null,
    thread: [{ author: 'Lesego M.', role: 'requester', body: 'Since the Wi-Fi password rotated this morning my laptop won\'t reconnect — it just says "incorrect password" even though I typed the new one.', agoMin: 42 }],
  },
  {
    id: 'DESK-4070', subject: 'Outlook stuck on "disconnected"', requester: 'Thabo R.',
    dept: 'Sales', category: 'Email', priority: 'Medium', status: 'Open', assignee: 'Andrew L.',
    createdMinAgo: 180, firstResponseMinAgo: 150, resolvedMinAgo: null,
    thread: [
      { author: 'Thabo R.', role: 'requester', body: 'Outlook has been showing "disconnected" in the bottom bar since ~9am. Webmail works fine.', agoMin: 180 },
      { author: 'Andrew L.', role: 'agent', body: 'Thanks Thabo — sounds like the cached credential. Can you try File → Account Settings → Repair? I\'ll stay on the ticket.', agoMin: 150 },
    ],
  },
  {
    id: 'DESK-4069', subject: 'Request: install Adobe Acrobat on new laptop', requester: 'Naledi P.',
    dept: 'Marketing', category: 'Software', priority: 'Low', status: 'Pending', assignee: 'Boitumelo K.',
    createdMinAgo: 320, firstResponseMinAgo: 260, resolvedMinAgo: null,
    thread: [
      { author: 'Naledi P.', role: 'requester', body: 'Could I get Acrobat Pro installed? I need it for the brochure proofs.', agoMin: 320 },
      { author: 'Boitumelo K.', role: 'agent', body: 'Raising a licence request with procurement — will install once the seat is approved. Marking Pending.', agoMin: 260 },
    ],
  },
  {
    id: 'DESK-4068', subject: 'Payroll server share unreachable', requester: 'Kabo T.',
    dept: 'HR', category: 'Network', priority: 'Urgent', status: 'New', assignee: 'Unassigned',
    createdMinAgo: 12, firstResponseMinAgo: null, resolvedMinAgo: null,
    thread: [{ author: 'Kabo T.', role: 'requester', body: '\\\\PAYROLL-SRV\\hr is not mapping for anyone in HR — we have payroll cut-off at 3pm. This is blocking the whole team.', agoMin: 12 }],
  },
  {
    id: 'DESK-4067', subject: 'Printer on 2nd floor jamming repeatedly', requester: 'Gaone S.',
    dept: 'Operations', category: 'Printing', priority: 'Medium', status: 'Open', assignee: 'Andrew L.',
    createdMinAgo: 95, firstResponseMinAgo: 70, resolvedMinAgo: null,
    thread: [
      { author: 'Gaone S.', role: 'requester', body: 'The HP on 2nd floor jams on every 3rd page. Already cleared the visible paper.', agoMin: 95 },
      { author: 'Andrew L.', role: 'agent', body: 'Logged — I\'ll come up and check the fuser and the tray-2 rollers after lunch.', agoMin: 70 },
    ],
  },
  {
    id: 'DESK-4066', subject: 'New starter account + mailbox for J. Dube', requester: 'Mpho D.',
    dept: 'HR', category: 'Account/Access', priority: 'Medium', status: 'Resolved', assignee: 'Boitumelo K.',
    createdMinAgo: 1400, firstResponseMinAgo: 1320, resolvedMinAgo: 980,
    thread: [
      { author: 'Mpho D.', role: 'requester', body: 'New hire Joseph Dube starts Monday — please set up AD account, mailbox and VPN.', agoMin: 1400 },
      { author: 'Boitumelo K.', role: 'agent', body: 'Account created, mailbox provisioned, VPN profile emailed to his manager. Resolving.', agoMin: 980 },
    ],
  },
  {
    id: 'DESK-4065', subject: 'Laptop very slow, fan constantly running', requester: 'Tebogo N.',
    dept: 'Finance', category: 'Hardware', priority: 'Low', status: 'Open', assignee: 'Andrew L.',
    createdMinAgo: 520, firstResponseMinAgo: 430, resolvedMinAgo: null,
    thread: [
      { author: 'Tebogo N.', role: 'requester', body: 'My laptop has become really slow this week and the fan never stops.', agoMin: 520 },
      { author: 'Andrew L.', role: 'agent', body: 'Could be dust or a runaway process. Can you drop it at the desk? I\'ll check Task Manager and blow out the vents.', agoMin: 430 },
    ],
  },
];

// ── SLA computation ─────────────────────────────────────────────────────────────

type SlaState = 'Met' | 'On track' | 'Due soon' | 'Breached' | 'Resolved';

function ticketSla(t: TicketT): { state: SlaState; label: string; detail: string } {
  if (t.status === 'Resolved') {
    return { state: 'Resolved', label: 'Resolved', detail: t.resolvedMinAgo != null ? `closed ${fmtMin(t.resolvedMinAgo)} ago` : 'closed' };
  }
  const tgt = SLA_TARGET[t.priority];
  // If not yet responded, the live clock is the response target.
  if (t.firstResponseMinAgo == null) {
    const remaining = tgt.response - t.createdMinAgo;
    return slaFromRemaining(remaining, 'first response');
  }
  // Responded — now racing the resolution target.
  const remaining = tgt.resolution - t.createdMinAgo;
  return slaFromRemaining(remaining, 'resolution');
}

function slaFromRemaining(remaining: number, kind: string): { state: SlaState; label: string; detail: string } {
  if (remaining < 0) return { state: 'Breached', label: 'Breached', detail: `${kind} overdue by ${fmtMin(-remaining)}` };
  if (remaining <= 30) return { state: 'Due soon', label: 'Due soon', detail: `${kind} due in ${fmtMin(remaining)}` };
  return { state: 'On track', label: 'On track', detail: `${kind} due in ${fmtMin(remaining)}` };
}

function fmtMin(m: number): string {
  m = Math.round(m);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem ? `${h}h ${rem}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

// ── Seeded asset register ───────────────────────────────────────────────────────

type AssetStatus = 'In use' | 'In stock' | 'Repair' | 'Retired';
type Asset = {
  tag: string;
  type: 'Laptop' | 'Desktop' | 'Monitor' | 'Printer' | 'Switch' | 'Router' | 'Phone';
  model: string;
  status: AssetStatus;
  assignedTo: string;
  location: string;
  warrantyMonths: number; // months of warranty left (negative = expired)
};

const ASSETS: Asset[] = [
  { tag: 'LT-0192', type: 'Laptop',  model: 'Dell Latitude 5440',   status: 'In use',   assignedTo: 'Lesego M.',  location: 'Finance',     warrantyMonths: 14 },
  { tag: 'LT-0188', type: 'Laptop',  model: 'HP EliteBook 840',     status: 'Repair',   assignedTo: 'Tebogo N.',  location: 'IT bench',    warrantyMonths: 3 },
  { tag: 'LT-0201', type: 'Laptop',  model: 'Lenovo ThinkPad T14',  status: 'In stock', assignedTo: '—',          location: 'IT store',    warrantyMonths: 24 },
  { tag: 'DT-0044', type: 'Desktop', model: 'Dell OptiPlex 7010',   status: 'In use',   assignedTo: 'Reception',  location: 'Front desk',  warrantyMonths: -5 },
  { tag: 'MN-0310', type: 'Monitor', model: 'Dell P2422H 24"',      status: 'In use',   assignedTo: 'Thabo R.',   location: 'Sales',       warrantyMonths: 9 },
  { tag: 'PR-0021', type: 'Printer', model: 'HP LaserJet M428',     status: 'Repair',   assignedTo: '—',          location: '2nd floor',   warrantyMonths: -2 },
  { tag: 'SW-0007', type: 'Switch',  model: 'Cisco CBS350-24P',     status: 'In use',   assignedTo: 'Network',    location: 'Comms room',  warrantyMonths: 30 },
  { tag: 'RT-0002', type: 'Router',  model: 'MikroTik CCR2004',     status: 'In use',   assignedTo: 'Network',    location: 'Comms room',  warrantyMonths: 18 },
  { tag: 'PH-0145', type: 'Phone',   model: 'Yealink T33G',         status: 'In use',   assignedTo: 'Kabo T.',    location: 'HR',          warrantyMonths: 6 },
  { tag: 'LT-0177', type: 'Laptop',  model: 'HP ProBook 450',       status: 'Retired',  assignedTo: '—',          location: 'Disposal',    warrantyMonths: -14 },
  { tag: 'MN-0288', type: 'Monitor', model: 'LG 27UP650 27"',       status: 'In stock', assignedTo: '—',          location: 'IT store',    warrantyMonths: 20 },
  { tag: 'DT-0051', type: 'Desktop', model: 'Lenovo M70q',          status: 'In use',   assignedTo: 'Gaone S.',   location: 'Operations',  warrantyMonths: 11 },
];

const ASSET_ICON: Record<Asset['type'], LucideIcon> = {
  Laptop: Laptop, Desktop: HardDrive, Monitor: Monitor, Printer: Printer,
  Switch: Network, Router: Server, Phone: Smartphone,
};

// ── Shared UI ─────────────────────────────────────────────────────────────────

const card = 'rounded-2xl border border-white/10 bg-[var(--surface)]';

const PRIORITY_COLOUR: Record<Priority, string> = {
  Urgent: '#f87171', High: '#fb923c', Medium: '#facc15', Low: '#60a5fa',
};
const SLA_COLOUR: Record<SlaState, { text: string; bg: string }> = {
  'Met':       { text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  'On track':  { text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  'Due soon':  { text: 'text-amber-400',   bg: 'bg-amber-500/15' },
  'Breached':  { text: 'text-red-400',     bg: 'bg-red-500/15' },
  'Resolved':  { text: 'text-[var(--muted)]', bg: 'bg-white/10' },
};
const STATUS_BG: Record<Status, string> = {
  New: 'bg-blue-500/15 text-blue-400',
  Open: 'bg-[var(--brand-bright)]/15 text-[var(--brand-bright)]',
  Pending: 'bg-amber-500/15 text-amber-400',
  Resolved: 'bg-emerald-500/15 text-emerald-400',
};

function Kpi({ label, value, sub, Icon, warn }: { label: string; value: string; sub: string; Icon: LucideIcon; warn?: boolean }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon size={14} className="text-[var(--brand-bright)]" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`mt-1 font-display text-2xl ${warn ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] text-[var(--muted)]/70">{sub}</p>
    </div>
  );
}

function SlaBadge({ t }: { t: TicketT }) {
  const sla = ticketSla(t);
  const c = SLA_COLOUR[sla.state];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>{sla.label}</span>;
}

// ── Dashboard tab ────────────────────────────────────────────────────────────────

function DashboardTab({ tickets }: { tickets: TicketT[] }) {
  const open = tickets.filter((t) => t.status !== 'Resolved');
  const breaching = open.filter((t) => {
    const s = ticketSla(t).state;
    return s === 'Breached' || s === 'Due soon';
  });
  const byCategory = useMemo(() => {
    const m = new Map<Category, number>();
    for (const t of open) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [open]);
  const maxCat = Math.max(1, ...byCategory.map(([, n]) => n));
  const assetsInUse = ASSETS.filter((a) => a.status === 'In use').length;

  const byStatus = STATUSES.map((s) => ({ status: s, count: tickets.filter((t) => t.status === s).length }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open tickets" value={String(open.length)} sub={`${tickets.length} total`} Icon={Ticket} />
        <Kpi label="SLA at risk" value={String(breaching.length)} sub="breached or due soon" Icon={Timer} warn={breaching.length > 0} />
        <Kpi label="Assets in use" value={`${assetsInUse}/${ASSETS.length}`} sub="tracked in CMDB" Icon={Boxes} />
        <Kpi label="Resolved today" value={String(tickets.filter((t) => t.status === 'Resolved').length)} sub="closed tickets" Icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className={card}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <Gauge size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">Queue by status</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 p-5">
            {byStatus.map((s) => (
              <div key={s.status} className="rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3 text-center">
                <p className="font-display text-2xl text-white">{s.count}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BG[s.status]}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By category */}
        <div className={card}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <LifeBuoy size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">Open tickets by category</h3>
          </div>
          <div className="space-y-3 p-5">
            {byCategory.map(([cat, n]) => (
              <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-white">{cat}</span>
                  <span className="text-[var(--muted)]">{n}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--brand-bright)]/70" style={{ width: `${(n / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-risk list */}
      {breaching.length > 0 && (
        <div className={card}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <AlertTriangle size={15} className="text-red-400" />
            <h3 className="text-sm font-semibold text-white">SLA at risk</h3>
          </div>
          <div className="divide-y divide-white/5">
            {breaching.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLOUR[t.priority] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white">{t.subject}</p>
                  <p className="text-[10px] text-[var(--muted)]">{t.id} · {t.requester} · {t.priority}</p>
                </div>
                <span className="text-[10px] text-[var(--muted)]">{ticketSla(t).detail}</span>
                <SlaBadge t={t} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tickets tab (interactive) ─────────────────────────────────────────────────────

function TicketsTab({ tickets, setTickets }: { tickets: TicketT[]; setTickets: React.Dispatch<React.SetStateAction<TicketT[]>> }) {
  const [selectedId, setSelectedId] = useState(tickets[0]?.id ?? '');
  const [reply, setReply] = useState('');
  const selected = tickets.find((t) => t.id === selectedId) ?? tickets[0];

  const update = (patch: Partial<TicketT>) =>
    setTickets((ts) => ts.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)));

  const sendReply = () => {
    if (!reply.trim()) return;
    setTickets((ts) =>
      ts.map((t) =>
        t.id === selected.id
          ? {
              ...t,
              firstResponseMinAgo: t.firstResponseMinAgo ?? 0, // first agent reply starts the response clock
              status: t.status === 'New' ? 'Open' : t.status,
              assignee: t.assignee === 'Unassigned' ? 'Andrew L.' : t.assignee,
              thread: [...t.thread, { author: 'Andrew L.', role: 'agent', body: reply.trim(), agoMin: 0 }],
            }
          : t
      )
    );
    setReply('');
  };

  // Sort queue: unresolved first, then by priority, then newest.
  const queue = [...tickets].sort((a, b) => {
    const ar = a.status === 'Resolved' ? 1 : 0;
    const br = b.status === 'Resolved' ? 1 : 0;
    if (ar !== br) return ar - br;
    const pd = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    if (pd !== 0) return pd;
    return a.createdMinAgo - b.createdMinAgo;
  });

  const selInput = 'rounded-lg border border-white/10 bg-[var(--bg-soft)] px-2 py-1 text-xs text-white focus:border-[var(--brand-bright)] focus:outline-none';

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Queue */}
      <div className={`${card} lg:col-span-2`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Ticket size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Queue</h3>
          <span className="ml-auto text-[10px] text-[var(--muted)]">{queue.filter((t) => t.status !== 'Resolved').length} open</span>
        </div>
        <div className="max-h-[560px] divide-y divide-white/5 overflow-y-auto">
          {queue.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`flex w-full items-start gap-2.5 px-5 py-3 text-left transition-colors ${selected.id === t.id ? 'bg-[var(--brand-bright)]/10' : 'hover:bg-white/5'}`}
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLOUR[t.priority] }} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs ${t.status === 'Resolved' ? 'text-[var(--muted)] line-through' : 'text-white'}`}>{t.subject}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">{t.id} · {t.requester} · {t.category}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_BG[t.status]}`}>{t.status}</span>
                  <SlaBadge t={t} />
                </div>
              </div>
              <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--muted)]/40" />
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className={`${card} lg:col-span-3`}>
        {selected && (
          <>
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] text-[var(--brand-bright)]">{selected.id}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-white">{selected.subject}</h3>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    <UserCircle2 size={11} className="mr-1 inline" />
                    {selected.requester} · {selected.dept} · opened {fmtMin(selected.createdMinAgo)} ago
                  </p>
                </div>
                <div className="text-right">
                  <SlaBadge t={selected} />
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{ticketSla(selected).detail}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                  Status
                  <select className={selInput} value={selected.status} onChange={(e) => update({ status: e.target.value as Status, resolvedMinAgo: e.target.value === 'Resolved' ? 0 : null })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                  Priority
                  <select className={selInput} value={selected.priority} onChange={(e) => update({ priority: e.target.value as Priority })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                  Assignee
                  <select className={selInput} value={selected.assignee} onChange={(e) => update({ assignee: e.target.value })}>
                    {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {/* Thread */}
            <div className="max-h-[300px] space-y-3 overflow-y-auto p-5">
              {selected.thread.map((e, i) => (
                <div key={i} className={`flex ${e.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${e.role === 'agent' ? 'bg-[var(--brand-bright)]/10' : 'bg-[var(--bg-soft)] border border-white/10'}`}>
                    <p className="mb-0.5 text-[10px] text-[var(--muted)]">{e.author} · {e.role === 'agent' ? 'Agent' : 'Requester'} · {e.agoMin === 0 ? 'just now' : `${fmtMin(e.agoMin)} ago`}</p>
                    <p className="text-xs text-white">{e.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply */}
            {selected.status !== 'Resolved' ? (
              <div className="border-t border-white/10 p-4">
                <div className="flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    placeholder="Reply to the requester…"
                    className="flex-1 resize-none rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-xs text-white placeholder:text-[var(--muted)]/50 focus:border-[var(--brand-bright)] focus:outline-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-bright)] px-3.5 py-2 text-xs font-medium text-[#0b0d10] transition-colors hover:bg-white disabled:opacity-40"
                  >
                    <Send size={13} /> Send
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-[var(--muted)]/60">
                  The first agent reply stops the response-SLA clock and moves the ticket to Open.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4 text-xs text-emerald-400">
                <CheckCircle2 size={15} /> Resolved — reopen by changing the status above.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Assets tab ────────────────────────────────────────────────────────────────────

const ASSET_STATUS_BG: Record<AssetStatus, string> = {
  'In use': 'bg-emerald-500/15 text-emerald-400',
  'In stock': 'bg-blue-500/15 text-blue-400',
  'Repair': 'bg-amber-500/15 text-amber-400',
  'Retired': 'bg-white/10 text-[var(--muted)]',
};

function AssetsTab() {
  const [filter, setFilter] = useState<AssetStatus | 'All'>('All');
  const shown = filter === 'All' ? ASSETS : ASSETS.filter((a) => a.status === filter);
  const counts = (['In use', 'In stock', 'Repair', 'Retired'] as AssetStatus[]).map((s) => ({ s, n: ASSETS.filter((a) => a.status === s).length }));
  const warrExpired = ASSETS.filter((a) => a.warrantyMonths < 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((c) => (
          <button key={c.s} onClick={() => setFilter(filter === c.s ? 'All' : c.s)} className={`${card} p-4 text-left transition-colors hover:border-white/25`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">{c.s}</span>
              {filter === c.s && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-bright)]" />}
            </div>
            <p className="mt-1 font-display text-2xl text-white">{c.n}</p>
          </button>
        ))}
      </div>

      {warrExpired > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 text-xs text-amber-300">
          <AlertTriangle size={16} className="shrink-0" />
          {warrExpired} asset{warrExpired > 1 ? 's are' : ' is'} out of warranty — flagged for the refresh/replacement budget.
        </div>
      )}

      <div className={card}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Boxes size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Asset register (CMDB)</h3>
          {filter !== 'All' && (
            <button onClick={() => setFilter('All')} className="ml-auto text-[10px] text-[var(--brand-bright)] hover:underline">clear filter</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-[var(--muted)]">
                <th className="px-5 py-2 font-medium">Tag</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Model</th>
                <th className="px-2 py-2 font-medium">Assigned</th>
                <th className="px-2 py-2 font-medium">Location</th>
                <th className="px-2 py-2 font-medium">Warranty</th>
                <th className="px-5 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const Icon = ASSET_ICON[a.type];
                const expired = a.warrantyMonths < 0;
                return (
                  <tr key={a.tag} className="border-b border-white/5">
                    <td className="px-5 py-2 font-mono text-white">{a.tag}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1.5 text-[var(--muted)]"><Icon size={13} /> {a.type}</span>
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">{a.model}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">{a.assignedTo}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">{a.location}</td>
                    <td className="px-2 py-2">
                      <span className={expired ? 'text-amber-400' : 'text-[var(--muted)]'}>
                        {expired ? `expired ${-a.warrantyMonths}mo` : `${a.warrantyMonths}mo left`}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ASSET_STATUS_BG[a.status]}`}>{a.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── SLA policy tab ────────────────────────────────────────────────────────────────

function SlaTab({ tickets }: { tickets: TicketT[] }) {
  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Timer size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">SLA policy</h3>
          <span className="ml-auto text-[10px] text-[var(--muted)]">business targets by priority</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-[var(--muted)]">
                <th className="px-5 py-2 font-medium">Priority</th>
                <th className="px-2 py-2 font-medium">First response</th>
                <th className="px-2 py-2 font-medium">Resolution</th>
                <th className="px-5 py-2 text-right font-medium">Open now</th>
              </tr>
            </thead>
            <tbody>
              {PRIORITIES.map((p) => {
                const tgt = SLA_TARGET[p];
                const openNow = tickets.filter((t) => t.priority === p && t.status !== 'Resolved').length;
                return (
                  <tr key={p} className="border-b border-white/5">
                    <td className="px-5 py-2">
                      <span className="inline-flex items-center gap-2 text-white">
                        <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLOUR[p] }} /> {p}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-[var(--muted)]">{fmtMin(tgt.response)}</td>
                    <td className="px-2 py-2 font-mono text-[var(--muted)]">{fmtMin(tgt.resolution)}</td>
                    <td className="px-5 py-2 text-right font-mono text-white">{openNow}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Clock size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Live SLA clocks</h3>
          <span className="ml-auto text-[10px] text-[var(--muted)]">open tickets</span>
        </div>
        <div className="divide-y divide-white/5">
          {tickets.filter((t) => t.status !== 'Resolved').map((t) => {
            const sla = ticketSla(t);
            const c = SLA_COLOUR[sla.state];
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLOUR[t.priority] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white">{t.subject}</p>
                  <p className="text-[10px] text-[var(--muted)]">{t.id} · {t.priority} · {t.firstResponseMinAgo == null ? 'awaiting first response' : 'responded'}</p>
                </div>
                <span className={`text-[10px] ${c.text}`}>{sla.detail}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>{sla.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'tickets' | 'assets' | 'sla';

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: Gauge },
  { key: 'tickets',   label: 'Tickets',   Icon: Ticket },
  { key: 'assets',    label: 'Assets',    Icon: Boxes },
  { key: 'sla',       label: 'SLA',       Icon: Timer },
];

export default function HelpdeskPage() {
  usePageTitle('IT Helpdesk & Asset Console');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [tickets, setTickets] = useState<TicketT[]>(SEED_TICKETS);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
              Andrew<span className="text-[var(--brand-bright)]">.</span>DESK
            </Link>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs text-[var(--muted)] sm:block">IT Helpdesk &amp; Asset Console</span>
          </div>
          <Link to="/#work" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-white">
            <ArrowLeft size={15} /> Portfolio
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Simulated service desk · live SLA clocks
        </span>
        <h1 className="mt-5 font-display text-4xl font-light text-white sm:text-5xl">
          IT Helpdesk <span className="text-[var(--brand-bright)]">& Asset Console</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          A service-desk cockpit for an IT support &amp; networking officer — triage a ticket queue with
          live SLA tracking, work a ticket end-to-end (reassign, reprioritise, reply, resolve — and watch
          the SLA recompute), and keep an IT asset register with warranty flags. Tickets are stateful, so
          the workflow is real.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
          <LifeBuoy size={13} className="text-[var(--brand-bright)]" />
          <span>UX studied from GLPI &amp; osTicket — all logic and data here are original.</span>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-20">
        {/* Tab bar */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-[var(--surface)] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white/10 text-white' : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && <DashboardTab tickets={tickets} />}
        {tab === 'tickets' && <TicketsTab tickets={tickets} setTickets={setTickets} />}
        {tab === 'assets' && <AssetsTab />}
        {tab === 'sla' && <SlaTab tickets={tickets} />}

        <p className="mt-8 text-center text-xs text-[var(--muted)]/60">
          Ticket queue · SLA policy engine · stateful ticket workflow · asset register — simulated client-side
        </p>
      </main>

      <Footer />
    </div>
  );
}
