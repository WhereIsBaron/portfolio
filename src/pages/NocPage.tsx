import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Activity, AlertTriangle, CheckCircle2, Play, Pause, RefreshCw,
  Router, Server, ShieldAlert, Network, Wifi, Globe, Database, Radio, Gauge,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import Footer from '@/components/Footer';

// ─────────────────────────────────────────────────────────────────────────
// Network Operations Dashboard (NOC) — focused single-page demo.
//
// A simulated monitoring wall of the kind a network operations team watches:
// a live status wall that polls monitors on a timer (each check re-samples
// latency and can flap Up → Degraded → Down and recover), Uptime-Kuma-style
// heartbeat bars, per-monitor latency analytics, and an incident log that
// opens and resolves itself as monitors change state — plus manual acknowledge
// / resolve. The simulation is live in-session; the seed state is fixed.
//
// Reference systems (UX/feature study only — no code reused): Uptime Kuma,
// Zabbix. All logic, data and UI here are original.
// ─────────────────────────────────────────────────────────────────────────

// ── Seeded PRNG (deterministic initial state) ────────────────────────────────
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_BEATS = 40;
const TICK_MS = 2600;

type MonStatus = 'Up' | 'Degraded' | 'Down';
type MonType = 'Router' | 'Switch' | 'Firewall' | 'WAN' | 'VPN' | 'Wireless' | 'DNS' | 'Web' | 'Mail' | 'Database';

type Beat = { status: MonStatus; latency: number | null };
type MonitorT = {
  id: string; name: string; host: string; type: MonType; site: string;
  baseline: number; uptime30: number; flap: number;
  status: MonStatus; latency: number | null; beats: Beat[];
};

type MonDef = Omit<MonitorT, 'status' | 'latency' | 'beats'> & { initStatus: MonStatus };

const DEFS: MonDef[] = [
  { id: 'core-rtr', name: 'Core Router', host: 'CoreRTR-01', type: 'Router', site: 'Gaborone DC', baseline: 4, uptime30: 99.98, flap: 0.05, initStatus: 'Up' },
  { id: 'core-sw', name: 'Core Switch', host: 'CoreSW-01', type: 'Switch', site: 'Gaborone DC', baseline: 2, uptime30: 99.99, flap: 0.04, initStatus: 'Up' },
  { id: 'dist-sw', name: 'Distribution Switch', host: 'DistSW-02', type: 'Switch', site: 'Gaborone DC', baseline: 3, uptime30: 99.95, flap: 0.05, initStatus: 'Up' },
  { id: 'fw', name: 'Edge Firewall', host: 'FW-Edge-01', type: 'Firewall', site: 'Gaborone DC', baseline: 6, uptime30: 99.9, flap: 0.06, initStatus: 'Up' },
  { id: 'wan-mpls', name: 'MPLS Link GAB↔FRA', host: 'wan-mpls', type: 'WAN', site: 'WAN', baseline: 18, uptime30: 99.7, flap: 0.1, initStatus: 'Up' },
  { id: 'wan-isp', name: 'Internet Breakout (ISP-A)', host: 'isp-a', type: 'WAN', site: 'WAN', baseline: 22, uptime30: 99.4, flap: 0.14, initStatus: 'Degraded' },
  { id: 'vpn', name: 'VPN Concentrator', host: 'vpn.gw', type: 'VPN', site: 'Edge', baseline: 9, uptime30: 99.8, flap: 0.07, initStatus: 'Up' },
  { id: 'wlc', name: 'Wireless Controller', host: 'WLC-01', type: 'Wireless', site: 'Gaborone DC', baseline: 5, uptime30: 99.85, flap: 0.06, initStatus: 'Up' },
  { id: 'dns', name: 'DNS Resolver', host: 'dns01.internal', type: 'DNS', site: 'Gaborone DC', baseline: 2, uptime30: 99.97, flap: 0.05, initStatus: 'Up' },
  { id: 'portal', name: 'Customer Portal', host: 'portal.example', type: 'Web', site: 'Services', baseline: 140, uptime30: 99.6, flap: 0.09, initStatus: 'Up' },
  { id: 'mail', name: 'Mail Gateway', host: 'smtp-relay', type: 'Mail', site: 'Services', baseline: 40, uptime30: 99.5, flap: 0.1, initStatus: 'Down' },
  { id: 'db', name: 'Database Cluster', host: 'db-prod:5432', type: 'Database', site: 'Services', baseline: 3, uptime30: 99.95, flap: 0.05, initStatus: 'Up' },
];

const TYPE_ICON: Record<MonType, LucideIcon> = {
  Router, Switch: Network, Firewall: ShieldAlert, WAN: Globe, VPN: ShieldAlert,
  Wireless: Wifi, DNS: Radio, Web: Globe, Mail: Server, Database: Database,
};

function sampleLatency(status: MonStatus, baseline: number, rng: () => number): number | null {
  if (status === 'Down') return null;
  if (status === 'Degraded') return Math.round(baseline * (2 + rng() * 2));
  return Math.round(baseline * (0.7 + rng() * 0.6));
}

function buildMonitors(): MonitorT[] {
  const rng = mulberry32(20260421);
  return DEFS.map((d) => {
    const beats: Beat[] = [];
    for (let i = 0; i < MAX_BEATS; i++) {
      const bad = rng() > d.uptime30 / 100;
      const st: MonStatus = bad ? (rng() < 0.5 ? 'Degraded' : 'Down') : 'Up';
      beats.push({ status: st, latency: sampleLatency(st, d.baseline, rng) });
    }
    const initLat = sampleLatency(d.initStatus, d.baseline, rng);
    beats[beats.length - 1] = { status: d.initStatus, latency: initLat };
    return { ...d, status: d.initStatus, latency: initLat, beats };
  });
}

// Live check: Markov-ish state transition + fresh latency sample.
function stepMonitor(m: MonitorT): MonitorT {
  const r = Math.random();
  let status: MonStatus = m.status;
  if (m.status === 'Up') {
    if (r < m.flap * 0.35) status = 'Down';
    else if (r < m.flap) status = 'Degraded';
    else status = 'Up';
  } else if (m.status === 'Degraded') {
    if (r < 0.5) status = 'Up';
    else if (r < 0.62) status = 'Down';
    else status = 'Degraded';
  } else {
    if (r < 0.55) status = 'Up';
    else if (r < 0.7) status = 'Degraded';
    else status = 'Down';
  }
  const latency = sampleLatency(status, m.baseline, Math.random);
  const beats = [...m.beats, { status, latency }].slice(-MAX_BEATS);
  return { ...m, status, latency, beats };
}

// ── Incidents ────────────────────────────────────────────────────────────────
type Severity = 'Critical' | 'Major' | 'Minor';
type IncStatus = 'Active' | 'Acknowledged' | 'Resolved';
type IncidentT = {
  id: string; monitorId: string; monitorName: string; severity: Severity;
  status: IncStatus; startedAt: number; resolvedAt?: number; note: string;
};

const SEV_BY_TYPE: Record<MonType, Severity> = {
  Router: 'Critical', Switch: 'Critical', Firewall: 'Critical', Database: 'Critical',
  WAN: 'Major', VPN: 'Major', DNS: 'Major', Web: 'Major', Mail: 'Major',
  Wireless: 'Minor',
};

function buildIncidents(): IncidentT[] {
  const now = Date.now();
  return [
    { id: 'INC-2043', monitorId: 'mail', monitorName: 'Mail Gateway', severity: 'Major', status: 'Active', startedAt: now - 8 * 60000, note: 'No response on SMTP relay — mail queue backing up.' },
    { id: 'INC-2041', monitorId: 'wan-isp', monitorName: 'Internet Breakout (ISP-A)', severity: 'Minor', status: 'Acknowledged', startedAt: now - 23 * 60000, note: 'Elevated latency and intermittent packet loss on ISP-A; failover to MPLS healthy.' },
    { id: 'INC-2038', monitorId: 'wan-mpls', monitorName: 'MPLS Link GAB↔FRA', severity: 'Major', status: 'Resolved', startedAt: now - 180 * 60000, resolvedAt: now - 150 * 60000, note: 'MPLS flap during carrier maintenance window.' },
  ];
}

function applyIncidents(prev: IncidentT[], downed: MonitorT[], recovered: MonitorT[]): IncidentT[] {
  let next = [...prev];
  for (const m of downed) {
    const active = next.find((i) => i.monitorId === m.id && i.status !== 'Resolved');
    if (!active) {
      const maxNum = next.reduce((mx, i) => Math.max(mx, parseInt(i.id.split('-')[1], 10) || 0), 2043);
      next = [{
        id: `INC-${maxNum + 1}`, monitorId: m.id, monitorName: m.name, severity: SEV_BY_TYPE[m.type],
        status: 'Active', startedAt: Date.now(), note: `Monitor stopped responding — ${m.host}.`,
      }, ...next];
    }
  }
  for (const m of recovered) {
    next = next.map((i) => (i.monitorId === m.id && i.status !== 'Resolved') ? { ...i, status: 'Resolved', resolvedAt: Date.now() } : i);
  }
  return next;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
const card = 'rounded-2xl border border-white/10 bg-[var(--surface)]';

const MON_DOT: Record<MonStatus, string> = { Up: 'bg-emerald-400', Degraded: 'bg-amber-400', Down: 'bg-red-400' };
const MON_CHIP: Record<MonStatus, string> = {
  Up: 'bg-emerald-500/15 text-emerald-400', Degraded: 'bg-amber-500/15 text-amber-400', Down: 'bg-red-500/15 text-red-400',
};
const BEAT_BG: Record<MonStatus, string> = { Up: 'bg-emerald-500/80', Degraded: 'bg-amber-500/80', Down: 'bg-red-500/90' };
const SEV_BG: Record<Severity, string> = {
  Critical: 'bg-red-500/15 text-red-400', Major: 'bg-amber-500/15 text-amber-400', Minor: 'bg-blue-500/15 text-blue-400',
};
const INC_BG: Record<IncStatus, string> = {
  Active: 'bg-red-500/15 text-red-400', Acknowledged: 'bg-amber-500/15 text-amber-400', Resolved: 'bg-emerald-500/15 text-emerald-400',
};

function latColour(lat: number | null, baseline: number) {
  if (lat == null) return 'text-red-400';
  if (lat <= baseline * 1.6) return 'text-emerald-400';
  if (lat <= baseline * 3) return 'text-amber-400';
  return 'text-amber-400';
}
const agoMin = (ms: number) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
function durStr(i: IncidentT) {
  const end = i.resolvedAt ?? Date.now();
  const m = Math.max(0, Math.round((end - i.startedAt) / 60000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Kpi({ label, value, sub, Icon, tone }: { label: string; value: string; sub: string; Icon: LucideIcon; tone?: string }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon size={14} className="text-[var(--brand-bright)]" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`mt-1 font-display text-2xl ${tone ?? 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] text-[var(--muted)]/70">{sub}</p>
    </div>
  );
}

function Heartbeat({ beats }: { beats: Beat[] }) {
  return (
    <div className="flex h-6 items-stretch gap-[2px]" title="recent checks">
      {beats.map((b, i) => (
        <span key={i} className={`w-[3px] shrink-0 rounded-sm ${BEAT_BG[b.status]}`} />
      ))}
    </div>
  );
}

// ── Status wall tab ───────────────────────────────────────────────────────────
function WallTab({ monitors, incidents, live, onToggle, onRun }: {
  monitors: MonitorT[]; incidents: IncidentT[]; live: boolean; onToggle: () => void; onRun: () => void;
}) {
  const up = monitors.filter((m) => m.status === 'Up').length;
  const degraded = monitors.filter((m) => m.status === 'Degraded').length;
  const down = monitors.filter((m) => m.status === 'Down').length;
  const avail = (monitors.reduce((a, m) => a + m.uptime30, 0) / monitors.length).toFixed(2);
  const activeInc = incidents.filter((i) => i.status !== 'Resolved').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Monitors up" value={String(up)} sub={`of ${monitors.length} polled`} Icon={CheckCircle2} tone="text-emerald-400" />
        <Kpi label="Degraded" value={String(degraded)} sub="elevated latency" Icon={Activity} tone={degraded ? 'text-amber-400' : 'text-white'} />
        <Kpi label="Down" value={String(down)} sub="not responding" Icon={AlertTriangle} tone={down ? 'text-red-400' : 'text-white'} />
        <Kpi label="Availability" value={`${avail}%`} sub="30-day mean" Icon={Gauge} />
        <Kpi label="Open incidents" value={String(activeInc)} sub="active + acknowledged" Icon={ShieldAlert} tone={activeInc ? 'text-amber-400' : 'text-white'} />
      </div>

      {/* Live controls */}
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-5 py-3`}>
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${live ? 'animate-pulse bg-emerald-400' : 'bg-[var(--muted)]'}`} />
          <span className="text-white">{live ? 'Live — polling every 2.6s' : 'Polling paused'}</span>
          <span className="hidden text-xs text-[var(--muted)] sm:inline">· checks re-sample latency and can flap monitors up/down</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRun} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white">
            <RefreshCw size={13} /> Run checks now
          </button>
          <button onClick={onToggle} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-bright)]/90 px-3 py-1.5 text-xs font-medium text-black hover:opacity-90">
            {live ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}
          </button>
        </div>
      </div>

      {/* Monitor grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {monitors.map((m) => {
          const Icon = TYPE_ICON[m.type];
          return (
            <div key={m.id} className={`${card} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon size={16} className="shrink-0 text-[var(--brand-bright)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{m.name}</p>
                    <p className="truncate font-mono text-[10px] text-[var(--muted)]">{m.host} · {m.type}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${MON_CHIP[m.status]}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${MON_DOT[m.status]}`} /> {m.status}
                </span>
              </div>
              <div className="mt-3"><Heartbeat beats={m.beats} /></div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={latColour(m.latency, m.baseline)}>
                  {m.latency == null ? 'timeout' : `${m.latency} ms`}
                </span>
                <span className="text-[var(--muted)]">{m.uptime30}% · 30d</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Latency tab ───────────────────────────────────────────────────────────────
function pctl(arr: number[], p: number) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

function LatencyTab({ monitors }: { monitors: MonitorT[] }) {
  const [sel, setSel] = useState(monitors[0].id);
  const m = monitors.find((x) => x.id === sel) ?? monitors[0];
  const lats = m.beats.map((b) => b.latency).filter((x): x is number => x != null);
  const maxLat = Math.max(1, ...lats);
  const p50 = pctl(lats, 50), p95 = pctl(lats, 95), mx = Math.max(0, ...lats);
  const downBeats = m.beats.filter((b) => b.status === 'Down').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--muted)]">Monitor</span>
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-lg border border-white/10 bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none">
          {monitors.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.host}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Current" value={m.latency == null ? 'timeout' : `${m.latency} ms`} sub={`baseline ${m.baseline} ms`} Icon={Activity} tone={latColour(m.latency, m.baseline)} />
        <Kpi label="p50 latency" value={`${p50} ms`} sub="recent checks" Icon={Gauge} />
        <Kpi label="p95 latency" value={`${p95} ms`} sub="recent checks" Icon={Gauge} />
        <Kpi label="Max / timeouts" value={`${mx} ms`} sub={`${downBeats} timeout(s) in window`} Icon={AlertTriangle} tone={downBeats ? 'text-red-400' : 'text-white'} />
      </div>

      <div className={`${card} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-sm text-white">Response time — last {m.beats.length} checks</h3>
          <span className="text-[10px] text-[var(--muted)]">red = timeout (no response)</span>
        </div>
        <div className="flex h-40 items-end gap-[3px]">
          {m.beats.map((b, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${b.status === 'Down' ? 'bg-red-500/80' : b.status === 'Degraded' ? 'bg-amber-500/70' : 'bg-[var(--brand-bright)]/60'}`}
              style={{ height: b.latency == null ? '100%' : `${Math.max(4, (b.latency / maxLat) * 100)}%` }}
              title={b.latency == null ? 'timeout' : `${b.latency} ms`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]/70">
          <span>older</span><span>now</span>
        </div>
      </div>
    </div>
  );
}

// ── Incidents tab ─────────────────────────────────────────────────────────────
const INC_FILTERS: (IncStatus | 'All')[] = ['All', 'Active', 'Acknowledged', 'Resolved'];

function IncidentsTab({ incidents, setIncidents }: { incidents: IncidentT[]; setIncidents: React.Dispatch<React.SetStateAction<IncidentT[]>> }) {
  const [filter, setFilter] = useState<IncStatus | 'All'>('All');
  const order: Record<IncStatus, number> = { Active: 0, Acknowledged: 1, Resolved: 2 };
  const rows = incidents
    .filter((i) => filter === 'All' || i.status === filter)
    .sort((a, b) => order[a.status] - order[b.status] || b.startedAt - a.startedAt);

  const set = (id: string, status: IncStatus) =>
    setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status, resolvedAt: status === 'Resolved' ? Date.now() : i.resolvedAt } : i));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {INC_FILTERS.map((f) => {
          const n = f === 'All' ? incidents.length : incidents.filter((i) => i.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                filter === f ? 'border-[var(--brand-bright)]/40 bg-[var(--brand-bright)]/10 text-white' : 'border-white/10 text-[var(--muted)] hover:text-white'
              }`}
            >
              {f} <span className="text-[var(--muted)]">· {n}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className={`${card} p-8 text-center text-sm text-[var(--muted)]`}>No {filter !== 'All' ? filter.toLowerCase() : ''} incidents.</div>
        )}
        {rows.map((i) => (
          <div key={i.id} className={`${card} p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-white">{i.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SEV_BG[i.severity]}`}>{i.severity}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${INC_BG[i.status]}`}>{i.status}</span>
                </div>
                <p className="mt-1.5 text-sm text-white">{i.monitorName}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{i.note}</p>
                <p className="mt-1 text-[10px] text-[var(--muted)]/70">
                  started {agoMin(i.startedAt)} ago · {i.status === 'Resolved' ? `resolved · duration ${durStr(i)}` : `ongoing ${durStr(i)}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {i.status === 'Active' && (
                  <button onClick={() => set(i.id, 'Acknowledged')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white">
                    Acknowledge
                  </button>
                )}
                {i.status !== 'Resolved' && (
                  <button onClick={() => set(i.id, 'Resolved')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25">
                    <CheckCircle2 size={13} /> Resolve
                  </button>
                )}
                {i.status === 'Resolved' && (
                  <button onClick={() => set(i.id, 'Active')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white">
                    Re-open
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--muted)]/60">
        Incidents open automatically when a monitor on the live wall stops responding, and resolve when it recovers — acknowledge or resolve them manually here.
      </p>
    </div>
  );
}

// ── Topology tab ──────────────────────────────────────────────────────────────
const TIERS: { key: string; label: string; types: MonType[]; desc: string }[] = [
  { key: 'core', label: 'Core', types: ['Router', 'Switch', 'Firewall'], desc: 'Gaborone data-centre core' },
  { key: 'edge', label: 'Edge & WAN', types: ['WAN', 'VPN', 'Wireless'], desc: 'Carrier links and remote access' },
  { key: 'svc', label: 'Services', types: ['DNS', 'Web', 'Mail', 'Database'], desc: 'Application and platform services' },
];

function TopologyTab({ monitors }: { monitors: MonitorT[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TIERS.map((tier) => {
        const members = monitors.filter((m) => tier.types.includes(m.type));
        const upNow = members.filter((m) => m.status === 'Up').length;
        const avail = (members.reduce((a, m) => a + m.uptime30, 0) / Math.max(1, members.length)).toFixed(2);
        const worst = members.some((m) => m.status === 'Down') ? 'Down' : members.some((m) => m.status === 'Degraded') ? 'Degraded' : 'Up';
        return (
          <div key={tier.key} className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm text-white">{tier.label}</h3>
                <p className="text-[10px] text-[var(--muted)]">{tier.desc}</p>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${MON_DOT[worst as MonStatus]}`} title={`tier: ${worst}`} />
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--muted)]">
              <span>{upNow}/{members.length} up now</span>
              <span>·</span>
              <span>{avail}% · 30d</span>
            </div>
            <div className="mt-4 space-y-2">
              {members.map((m) => {
                const Icon = TYPE_ICON[m.type];
                return (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon size={14} className="shrink-0 text-[var(--muted)]" />
                      <span className="truncate text-xs text-white">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${latColour(m.latency, m.baseline)}`}>{m.latency == null ? 'timeout' : `${m.latency}ms`}</span>
                      <span className={`h-2 w-2 rounded-full ${MON_DOT[m.status]}`} title={m.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
type Tab = 'wall' | 'latency' | 'incidents' | 'topology';
const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'wall', label: 'Status wall', Icon: Activity },
  { key: 'latency', label: 'Latency', Icon: Gauge },
  { key: 'incidents', label: 'Incidents', Icon: ShieldAlert },
  { key: 'topology', label: 'Topology', Icon: Network },
];

export default function NocPage() {
  usePageTitle('Network Operations Dashboard');
  const [tab, setTab] = useState<Tab>('wall');
  const [monitors, setMonitors] = useState<MonitorT[]>(buildMonitors);
  const [incidents, setIncidents] = useState<IncidentT[]>(buildIncidents);
  const [live, setLive] = useState(true);
  const monitorsRef = useRef(monitors);
  useEffect(() => { monitorsRef.current = monitors; }, [monitors]);

  const tick = useCallback(() => {
    const prev = monitorsRef.current;
    const next = prev.map(stepMonitor);
    const downed: MonitorT[] = [];
    const recovered: MonitorT[] = [];
    prev.forEach((m, i) => {
      if (m.status !== 'Down' && next[i].status === 'Down') downed.push(next[i]);
      if (m.status === 'Down' && next[i].status !== 'Down') recovered.push(next[i]);
    });
    monitorsRef.current = next;
    setMonitors(next);
    if (downed.length || recovered.length) setIncidents((prevI) => applyIncidents(prevI, downed, recovered));
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [live, tick]);

  const activeInc = useMemo(() => incidents.filter((i) => i.status !== 'Resolved').length, [incidents]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
              Andrew<span className="text-[var(--brand-bright)]">.</span>NOC
            </Link>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs text-[var(--muted)] sm:block">Network Operations Dashboard</span>
          </div>
          <Link to="/#work" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-white">
            <ArrowLeft size={15} /> Portfolio
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Simulated NOC · live polling
        </span>
        <h1 className="mt-5 font-display text-4xl font-light text-white sm:text-5xl">
          Network Operations <span className="text-[var(--brand-bright)]">Dashboard</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          A live monitoring wall for a network operations team — routers, switches, firewalls, WAN links and
          services polled on a timer, with heartbeat history, latency analytics by monitor, and an incident
          log that opens and clears itself as monitors flap and recover. Pause the poll or run a check on
          demand; acknowledge and resolve incidents as they land.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
          <Activity size={13} className="text-[var(--brand-bright)]" />
          <span>UX studied from Uptime Kuma &amp; Zabbix — all logic, data and UI are original.</span>
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
              {t.key === 'incidents' && activeInc > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-400">{activeInc}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'wall' && <WallTab monitors={monitors} incidents={incidents} live={live} onToggle={() => setLive((v) => !v)} onRun={tick} />}
        {tab === 'latency' && <LatencyTab monitors={monitors} />}
        {tab === 'incidents' && <IncidentsTab incidents={incidents} setIncidents={setIncidents} />}
        {tab === 'topology' && <TopologyTab monitors={monitors} />}

        <p className="mt-8 text-center text-xs text-[var(--muted)]/60">
          Live status wall · heartbeat history · latency percentiles · self-updating incident log — simulated client-side
        </p>
      </main>

      <Footer />
    </div>
  );
}
