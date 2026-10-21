import { useMemo, useState } from 'react';
import {
  LifeBuoy, Ticket, Send, Clock, AlertTriangle, CheckCircle2,
  Laptop, Monitor, Printer, Network, Smartphone, HardDrive, Server,
  Boxes, Timer, UserCircle2, ChevronRight, type LucideIcon,
} from 'lucide-react';
import {
  DemoShell, Masthead, TabNav, Panel, Section, Stat, StatusTag, Meter,
  AccentButton, fieldLabel, cx, type TabDef, type Tone,
} from '@/components/demo/kit';

// ─────────────────────────────────────────────────────────────────────────
// IT Helpdesk & Asset Console (/helpdesk) — Andrew.DESK
//
// A service-desk console for an IT support & networking team: a ticket queue
// with live SLA tracking, an interactive ticket detail (change status, assign,
// reply — and watch the SLA recompute), an IT asset register (CMDB-lite), and
// an SLA policy board. Tickets are stateful in-session so the workflow is
// real; the seed data is fixed.
//
// UX patterns studied from GLPI & osTicket — all logic, data and UI here are
// original.
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
  firstResponseMinAgo: number | null;
  resolvedMinAgo: number | null;
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
  if (t.firstResponseMinAgo == null) {
    const remaining = tgt.response - t.createdMinAgo;
    return slaFromRemaining(remaining, 'first response');
  }
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
  warrantyMonths: number;
};

const ASSETS: Asset[] = [
  { tag: 'LT-0192', type: 'Laptop',  model: 'Dell Latitude 5440',  status: 'In use',   assignedTo: 'Lesego M.', location: 'Finance',    warrantyMonths: 14 },
  { tag: 'LT-0188', type: 'Laptop',  model: 'HP EliteBook 840',    status: 'Repair',   assignedTo: 'Tebogo N.', location: 'IT bench',   warrantyMonths: 3 },
  { tag: 'LT-0201', type: 'Laptop',  model: 'Lenovo ThinkPad T14', status: 'In stock', assignedTo: '—',         location: 'IT store',   warrantyMonths: 24 },
  { tag: 'DT-0044', type: 'Desktop', model: 'Dell OptiPlex 7010',  status: 'In use',   assignedTo: 'Reception', location: 'Front desk', warrantyMonths: -5 },
  { tag: 'MN-0310', type: 'Monitor', model: 'Dell P2422H 24"',     status: 'In use',   assignedTo: 'Thabo R.',  location: 'Sales',      warrantyMonths: 9 },
  { tag: 'PR-0021', type: 'Printer', model: 'HP LaserJet M428',    status: 'Repair',   assignedTo: '—',         location: '2nd floor',  warrantyMonths: -2 },
  { tag: 'SW-0007', type: 'Switch',  model: 'Cisco CBS350-24P',    status: 'In use',   assignedTo: 'Network',   location: 'Comms room', warrantyMonths: 30 },
  { tag: 'RT-0002', type: 'Router',  model: 'MikroTik CCR2004',    status: 'In use',   assignedTo: 'Network',   location: 'Comms room', warrantyMonths: 18 },
  { tag: 'PH-0145', type: 'Phone',   model: 'Yealink T33G',        status: 'In use',   assignedTo: 'Kabo T.',   location: 'HR',         warrantyMonths: 6 },
  { tag: 'LT-0177', type: 'Laptop',  model: 'HP ProBook 450',      status: 'Retired',  assignedTo: '—',         location: 'Disposal',   warrantyMonths: -14 },
  { tag: 'MN-0288', type: 'Monitor', model: 'LG 27UP650 27"',      status: 'In stock', assignedTo: '—',         location: 'IT store',   warrantyMonths: 20 },
  { tag: 'DT-0051', type: 'Desktop', model: 'Lenovo M70q',         status: 'In use',   assignedTo: 'Gaone S.',  location: 'Operations', warrantyMonths: 11 },
];

const ASSET_ICON: Record<Asset['type'], LucideIcon> = {
  Laptop, Desktop: HardDrive, Monitor, Printer, Switch: Network, Router: Server, Phone: Smartphone,
};

// ── Tone maps ───────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<Priority, string> = {
  Urgent: 'var(--danger)', High: 'var(--warn)', Medium: 'var(--accent)', Low: 'var(--muted)',
};
const SLA_TONE: Record<SlaState, Tone> = {
  Met: 'ok', 'On track': 'ok', 'Due soon': 'warn', Breached: 'danger', Resolved: 'neutral',
};
const STATUS_TONE: Record<Status, Tone> = {
  New: 'accent', Open: 'ok', Pending: 'warn', Resolved: 'neutral',
};
const ASSET_TONE: Record<AssetStatus, Tone> = {
  'In use': 'ok', 'In stock': 'accent', Repair: 'warn', Retired: 'neutral',
};
const TONE_VAR: Record<Tone, string> = {
  ok: 'text-[var(--ok)]', warn: 'text-[var(--warn)]', danger: 'text-[var(--danger)]',
  accent: 'text-[var(--accent)]', neutral: 'text-[var(--muted)]',
};

function SlaBadge({ t }: { t: TicketT }) {
  const sla = ticketSla(t);
  return <StatusTag tone={SLA_TONE[sla.state]} dot={false}>{sla.label}</StatusTag>;
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
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        <Stat label="Open tickets" value={String(open.length)} sub={`${tickets.length} total`} />
        <Stat
          label="SLA at risk"
          value={String(breaching.length)}
          sub="breached or due soon"
          tone={breaching.length > 0 ? 'danger' : 'ok'}
        />
        <Stat label="Assets in use" value={`${assetsInUse}/${ASSETS.length}`} sub="tracked in CMDB" />
        <Stat
          label="Resolved"
          value={String(tickets.filter((t) => t.status === 'Resolved').length)}
          sub="closed tickets"
          tone="ok"
        />
      </div>

      <Section label="Queue health" title="Where the desk stands">
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel label="By status" title="Queue breakdown">
            <div className="grid grid-cols-4 gap-px bg-[var(--border)]">
              {byStatus.map((s) => (
                <div key={s.status} className="bg-[var(--surface)] p-3 text-center">
                  <p className="font-display text-2xl font-medium text-[var(--ink)]">{s.count}</p>
                  <div className="mt-1.5 flex justify-center">
                    <StatusTag tone={STATUS_TONE[s.status]} dot={false}>{s.status}</StatusTag>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Demand" title="Open by category">
            <div className="space-y-3.5">
              {byCategory.map(([cat, n]) => (
                <div key={cat}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{cat}</span>
                    <span className="font-mono tabular-nums text-[var(--muted)]">{n}</span>
                  </div>
                  <Meter value={n} max={maxCat} tone="accent" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Section>

      {breaching.length > 0 && (
        <Panel bodyClassName="p-0" label="Act now" title="SLA at risk">
          <div className="divide-y divide-[var(--border)]">
            {breaching.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[t.priority] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--ink)]">{t.subject}</p>
                  <p className="text-[11px] text-[var(--muted)]">{t.id} · {t.requester} · {t.priority}</p>
                </div>
                <span className="hidden text-[11px] text-[var(--muted)] sm:block">{ticketSla(t).detail}</span>
                <SlaBadge t={t} />
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── Tickets tab (interactive) ─────────────────────────────────────────────────────

const field =
  'border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';

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
              firstResponseMinAgo: t.firstResponseMinAgo ?? 0,
              status: t.status === 'New' ? 'Open' : t.status,
              assignee: t.assignee === 'Unassigned' ? 'Andrew L.' : t.assignee,
              thread: [...t.thread, { author: 'Andrew L.', role: 'agent', body: reply.trim(), agoMin: 0 }],
            }
          : t
      )
    );
    setReply('');
  };

  const queue = [...tickets].sort((a, b) => {
    const ar = a.status === 'Resolved' ? 1 : 0;
    const br = b.status === 'Resolved' ? 1 : 0;
    if (ar !== br) return ar - br;
    const pd = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    if (pd !== 0) return pd;
    return a.createdMinAgo - b.createdMinAgo;
  });

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Queue */}
      <div className="border border-[var(--border)] bg-[var(--surface)] lg:col-span-2">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className={fieldLabel}>Service desk</p>
            <h2 className="mt-1 font-display text-xl font-medium text-[var(--ink)]">Queue</h2>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            {queue.filter((t) => t.status !== 'Resolved').length} open
          </span>
        </header>
        <div className="max-h-[560px] divide-y divide-[var(--border)] overflow-y-auto">
          {queue.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cx(
                'flex w-full items-start gap-2.5 px-5 py-3.5 text-left transition-colors',
                selected.id === t.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-soft)]'
              )}
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[t.priority] }} />
              <div className="min-w-0 flex-1">
                <p className={cx('truncate text-sm', t.status === 'Resolved' ? 'text-[var(--muted)] line-through' : 'text-[var(--ink)]')}>
                  {t.subject}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.id} · {t.requester} · {t.category}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <StatusTag tone={STATUS_TONE[t.status]} dot={false}>{t.status}</StatusTag>
                  <SlaBadge t={t} />
                </div>
              </div>
              <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--muted)]" />
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="border border-[var(--border)] bg-[var(--surface)] lg:col-span-3">
        {selected && (
          <>
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]">{selected.id}</p>
                  <h3 className="mt-1 font-display text-lg font-medium leading-tight text-[var(--ink)]">{selected.subject}</h3>
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                    <UserCircle2 size={11} className="mr-1 inline" />
                    {selected.requester} · {selected.dept} · opened {fmtMin(selected.createdMinAgo)} ago
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <SlaBadge t={selected} />
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">{ticketSla(selected).detail}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Status
                  <select
                    className={field}
                    value={selected.status}
                    onChange={(e) => update({ status: e.target.value as Status, resolvedMinAgo: e.target.value === 'Resolved' ? 0 : null })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Priority
                  <select className={field} value={selected.priority} onChange={(e) => update({ priority: e.target.value as Priority })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Assignee
                  <select className={field} value={selected.assignee} onChange={(e) => update({ assignee: e.target.value })}>
                    {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="max-h-[300px] space-y-3 overflow-y-auto p-5">
              {selected.thread.map((e, i) => (
                <div key={i} className={cx('flex', e.role === 'agent' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cx(
                      'max-w-[80%] px-3.5 py-2.5',
                      e.role === 'agent'
                        ? 'bg-[var(--accent-soft)]'
                        : 'border border-[var(--border)] bg-[var(--bg)]'
                    )}
                  >
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
                      {e.author} · {e.role === 'agent' ? 'Agent' : 'Requester'} · {e.agoMin === 0 ? 'just now' : `${fmtMin(e.agoMin)} ago`}
                    </p>
                    <p className="text-sm text-[var(--ink)]">{e.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {selected.status !== 'Resolved' ? (
              <div className="border-t border-[var(--border)] p-4">
                <div className="flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    placeholder="Reply to the requester…"
                    className="flex-1 resize-none border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <AccentButton onClick={sendReply} disabled={!reply.trim()} className="py-2">
                    <Send size={13} /> Send
                  </AccentButton>
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  The first agent reply stops the response-SLA clock and moves the ticket to Open.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-t border-[var(--border)] px-5 py-4 text-sm text-[var(--ok)]">
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

function AssetsTab() {
  const [filter, setFilter] = useState<AssetStatus | 'All'>('All');
  const shown = filter === 'All' ? ASSETS : ASSETS.filter((a) => a.status === filter);
  const counts = (['In use', 'In stock', 'Repair', 'Retired'] as AssetStatus[]).map((s) => ({
    s, n: ASSETS.filter((a) => a.status === s).length,
  }));
  const warrExpired = ASSETS.filter((a) => a.warrantyMonths < 0).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        {counts.map((c) => {
          const on = filter === c.s;
          return (
            <button
              key={c.s}
              onClick={() => setFilter(on ? 'All' : c.s)}
              className={cx(
                'bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--bg-soft)]',
                on && 'ring-1 ring-inset ring-[var(--accent)]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={fieldLabel}>{c.s}</span>
                {on && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
              </div>
              <p className="mt-2 font-display text-3xl font-medium text-[var(--ink)]">{c.n}</p>
            </button>
          );
        })}
      </div>

      {warrExpired > 0 && (
        <div className="flex items-center gap-3 border border-[var(--warn)] bg-[var(--warn-bg)] px-5 py-3 text-sm text-[var(--warn)]">
          <AlertTriangle size={16} className="shrink-0" />
          {warrExpired} asset{warrExpired > 1 ? 's are' : ' is'} out of warranty — flagged for the refresh/replacement budget.
        </div>
      )}

      <Panel
        bodyClassName="p-0"
        label="CMDB"
        title="Asset register"
        actions={
          filter !== 'All' && (
            <button onClick={() => setFilter('All')} className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--accent)] hover:underline">
              Clear filter
            </button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                {['Tag', 'Type', 'Model', 'Assigned', 'Location', 'Warranty'].map((h) => (
                  <th key={h} className={cx('px-2 py-3 font-medium first:pl-5', fieldLabel)}>{h}</th>
                ))}
                <th className={cx('px-5 py-3 text-right font-medium', fieldLabel)}>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const Icon = ASSET_ICON[a.type];
                const expired = a.warrantyMonths < 0;
                return (
                  <tr key={a.tag} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-2 py-3 pl-5 font-mono text-[var(--ink)]">{a.tag}</td>
                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[var(--muted)]"><Icon size={13} /> {a.type}</span>
                    </td>
                    <td className="px-2 py-3 text-[var(--muted)]">{a.model}</td>
                    <td className="px-2 py-3 text-[var(--muted)]">{a.assignedTo}</td>
                    <td className="px-2 py-3 text-[var(--muted)]">{a.location}</td>
                    <td className="px-2 py-3">
                      <span className={expired ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}>
                        {expired ? `expired ${-a.warrantyMonths}mo` : `${a.warrantyMonths}mo left`}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StatusTag tone={ASSET_TONE[a.status]} dot={false}>{a.status}</StatusTag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ── SLA policy tab ────────────────────────────────────────────────────────────────

function SlaTab({ tickets }: { tickets: TicketT[] }) {
  const openTickets = tickets.filter((t) => t.status !== 'Resolved');
  return (
    <div className="space-y-8">
      <Panel bodyClassName="p-0" label="Policy" title="SLA targets by priority">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className={cx('px-5 py-3 font-medium', fieldLabel)}>Priority</th>
                <th className={cx('px-2 py-3 font-medium', fieldLabel)}>First response</th>
                <th className={cx('px-2 py-3 font-medium', fieldLabel)}>Resolution</th>
                <th className={cx('px-5 py-3 text-right font-medium', fieldLabel)}>Open now</th>
              </tr>
            </thead>
            <tbody>
              {PRIORITIES.map((p) => {
                const tgt = SLA_TARGET[p];
                const openNow = tickets.filter((t) => t.priority === p && t.status !== 'Resolved').length;
                return (
                  <tr key={p} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-[var(--ink)]">
                        <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_DOT[p] }} /> {p}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-mono tabular-nums text-[var(--muted)]">{fmtMin(tgt.response)}</td>
                    <td className="px-2 py-3 font-mono tabular-nums text-[var(--muted)]">{fmtMin(tgt.resolution)}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-[var(--ink)]">{openNow}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel bodyClassName="p-0" label="Running" title="Live SLA clocks">
        <div className="divide-y divide-[var(--border)]">
          {openTickets.map((t) => {
            const sla = ticketSla(t);
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[t.priority] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--ink)]">{t.subject}</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {t.id} · {t.priority} · {t.firstResponseMinAgo == null ? 'awaiting first response' : 'responded'}
                  </p>
                </div>
                <span className={cx('hidden text-[11px] sm:block', TONE_VAR[SLA_TONE[sla.state]])}>
                  {sla.detail}
                </span>
                <SlaBadge t={t} />
              </div>
            );
          })}
          {openTickets.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-[var(--muted)]">No open tickets — every clock is stopped.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'tickets' | 'assets' | 'sla';

export default function HelpdeskPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [tickets, setTickets] = useState<TicketT[]>(SEED_TICKETS);

  const openCount = tickets.filter((t) => t.status !== 'Resolved').length;
  const atRisk = tickets.filter((t) => {
    const s = ticketSla(t).state;
    return s === 'Breached' || s === 'Due soon';
  }).length;

  const TABS: TabDef<Tab>[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tickets', label: 'Tickets', count: openCount },
    { id: 'assets', label: 'Assets' },
    { id: 'sla', label: 'SLA', count: atRisk || undefined },
  ];

  return (
    <DemoShell title="IT Helpdesk & Asset Console" wordmark="DESK" revealKey={tab}>
      <Masthead
        eyebrow="IT service management · Botswana"
        live="Live SLA clocks"
        title="Every ticket, on the clock."
        lede="A service-desk console for an IT support & networking team: triage a queue with live SLA clocks, work a ticket end to end — reassign, reprioritise, reply and resolve while the SLA recomputes — and keep an asset register with warranty flags. Tickets are stateful, so the workflow is real."
        facts={[
          { label: 'Queue', value: `${SEED_TICKETS.length} tickets · stateful` },
          { label: 'SLA engine', value: 'Per-priority clocks' },
          { label: 'Assets', value: `${ASSETS.length} in CMDB` },
          { label: 'Reference', value: 'GLPI · osTicket (UX)' },
        ]}
      />

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      <div className="pt-10">
        {tab === 'dashboard' && <DashboardTab tickets={tickets} />}
        {tab === 'tickets' && <TicketsTab tickets={tickets} setTickets={setTickets} />}
        {tab === 'assets' && <AssetsTab />}
        {tab === 'sla' && <SlaTab tickets={tickets} />}
      </div>

      <p className="mt-12 flex items-center gap-2 border-t border-[var(--border)] pt-6 text-[11px] leading-relaxed text-[var(--muted)]">
        <LifeBuoy size={13} className="shrink-0 text-[var(--accent)]" />
        Stateful ticket workflow, a per-priority SLA policy engine and a CMDB-lite asset register — UX patterns
        studied from GLPI &amp; osTicket; all logic, data and UI are original.
      </p>
    </DemoShell>
  );
}
