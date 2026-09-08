import { useMemo, useState } from 'react';
import {
  BarChart3, X, Loader2, RefreshCw, Users, Radio, Globe, TrendingUp,
  ArrowUpRight, ArrowDownRight, Minus, Tag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// One raw visit event (owner-only read via RLS). The dashboard aggregates these
// entirely client-side — no third-party analytics, data never leaves Supabase.
type VisitEvent = {
  ts: string;
  ip: string | null;
  user_agent: string | null;
  referrer: string | null;
  path: string | null;
  country: string | null;
  campaign: string | null;
};

const DAY = 86_400_000;
const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
] as const;

// ── Classifiers ──────────────────────────────────────────────────────────────
function sourceOf(referrer: string | null): string {
  if (!referrer) return 'Direct';
  let host = referrer;
  try {
    host = new URL(referrer).hostname;
  } catch {
    /* not a full URL — use as-is */
  }
  host = host.replace(/^www\./, '').toLowerCase();
  if (!host) return 'Direct';
  const map: [RegExp, string][] = [
    [/google\./, 'Google'],
    [/bing\./, 'Bing'],
    [/duckduckgo\./, 'DuckDuckGo'],
    [/yahoo\./, 'Yahoo'],
    [/linkedin\.|lnkd\.in/, 'LinkedIn'],
    [/github\./, 'GitHub'],
    [/(twitter\.|x\.com|t\.co)/, 'X / Twitter'],
    [/facebook\.|fb\./, 'Facebook'],
    [/instagram\./, 'Instagram'],
    [/reddit\./, 'Reddit'],
    [/netlify\.app/, 'Netlify'],
  ];
  for (const [re, name] of map) if (re.test(host)) return name;
  return host;
}

function deviceOf(ua: string | null): 'Mobile' | 'Tablet' | 'Desktop' {
  if (!ua) return 'Desktop';
  if (/iPad|Tablet/.test(ua)) return 'Tablet';
  if (/Mobi|Android|iPhone|iPod/.test(ua)) return 'Mobile';
  return 'Desktop';
}

function browserOf(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

// A 2-letter country code → flag emoji (regional indicators). Zero data table.
function flag(code: string | null): string {
  if (!code || code.length !== 2) return '🌐';
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function when(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

const fmtDay = (ms: number, long = false) =>
  new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...(long ? { weekday: 'short' } : {}) });

// Round a max up to a friendly axis ceiling (5, 10, 20, 50, …).
function niceCeil(v: number): number {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

// ── Trend chart: visits (area+line) + unique visitors (line), axes, hover ──────
type TrendPoint = { day: number; visits: number; uniques: number };
function TrendChart({ series }: { series: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 190;
  const PL = 34, PR = 12, PT = 12, PB = 22;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const n = series.length;
  const max = niceCeil(Math.max(1, ...series.map((d) => d.visits)));
  const x = (i: number) => PL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PT + plotH - (v / max) * plotH;

  const linePts = (key: 'visits' | 'uniques') => series.map((d, i) => `${x(i)},${y(d[key])}`).join(' ');
  const area = `M ${x(0)},${PT + plotH} L ${series.map((d, i) => `${x(i)},${y(d.visits)}`).join(' L ')} L ${x(n - 1)},${PT + plotH} Z`;

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  // ~6 evenly spaced x-axis date ticks.
  const tickEvery = Math.max(1, Math.round(n / 6));
  const xTicks = series.map((_, i) => i).filter((i) => i % tickEvery === 0 || i === n - 1);
  const hp = hover != null ? series[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="vi-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-bright)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--brand-bright)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y gridlines + labels */}
        {gridVals.map((v, gi) => {
          const gy = y(v);
          return (
            <g key={gi}>
              <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
              <text x={PL - 6} y={gy + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">{v}</text>
            </g>
          );
        })}

        {/* X date labels */}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45">
            {fmtDay(series[i].day)}
          </text>
        ))}

        {/* Visits area + line */}
        <path d={area} fill="url(#vi-fill)" />
        <polyline points={linePts('visits')} fill="none" stroke="var(--brand-bright)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {/* Unique visitors line (dashed, muted) */}
        <polyline points={linePts('uniques')} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4"
          strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

        {/* Hover guide + markers */}
        {hp && (
          <g>
            <line x1={x(hover!)} y1={PT} x2={x(hover!)} y2={PT + plotH} stroke="var(--brand-bright)" strokeOpacity="0.4" strokeWidth="1" />
            <circle cx={x(hover!)} cy={y(hp.visits)} r="3.5" fill="var(--brand-bright)" />
            <circle cx={x(hover!)} cy={y(hp.uniques)} r="3" fill="var(--surface)" stroke="currentColor" strokeWidth="1.4" />
          </g>
        )}

        {/* Invisible hit targets */}
        {series.map((d, i) => (
          <rect key={d.day} x={x(i) - plotW / (2 * Math.max(1, n - 1))} y={PT}
            width={plotW / Math.max(1, n - 1)} height={plotH} fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))} />
        ))}
      </svg>

      {/* Tooltip */}
      {hp && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-white/10 bg-[var(--bg)]/95 px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `${(x(hover!) / W) * 100}%`, top: 0 }}
        >
          <div className="mb-0.5 font-medium text-white">{fmtDay(hp.day, true)}</div>
          <div className="flex items-center gap-1.5 text-[var(--muted)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand-bright)' }} />
            {hp.visits} visit{hp.visits === 1 ? '' : 's'}
          </div>
          <div className="flex items-center gap-1.5 text-[var(--muted)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full border border-current opacity-60" />
            {hp.uniques} unique
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-[var(--muted)]">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: 'var(--brand-bright)' }} /> Visits</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-3 border-t border-dashed border-current opacity-60" /> Unique visitors</span>
      </div>
    </div>
  );
}

function BarList({ rows, empty }: { rows: { label: string; value: number; lead?: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  if (!rows.length) return <div className="py-6 text-center text-xs text-[var(--muted)]">{empty}</div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              {r.lead && <span className="shrink-0">{r.lead}</span>}
              <span className="truncate text-[var(--text)]">{r.label}</span>
            </span>
            <span className="ml-2 shrink-0 tabular-nums text-[var(--muted)]">
              {r.value} · {Math.round((r.value / total) * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-[var(--brand-bright)]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Aggregation ────────────────────────────────────────────────────────────--
function topCounts<T>(items: T[], keyOf: (t: T) => string, limit = 6, lead?: (k: string) => string) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = keyOf(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value, lead: lead?.(label) }));
}

// Percentage change vs the previous equal-length window. null when there's no
// prior data to compare against (so we don't show a misleading "+100%").
function delta(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export default function VisitorInsights() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<VisitEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]['days']>(30);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const cutoff = new Date(Date.now() - 90 * DAY).toISOString();
    const { data, error } = await supabase
      .from('visit_events')
      .select('ts,ip,user_agent,referrer,path,country,campaign')
      .gte('ts', cutoff)
      .order('ts', { ascending: false })
      .limit(10000);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((data as VisitEvent[]) ?? []);
  };

  const openPanel = () => {
    setOpen(true);
    load();
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const from = now - range * DAY;
    const prevFrom = from - range * DAY;
    const inRange = rows.filter((r) => new Date(r.ts).getTime() >= from);
    const prevRange = rows.filter((r) => {
      const t = new Date(r.ts).getTime();
      return t >= prevFrom && t < from;
    });

    // First time each IP was EVER seen in the dataset — for new vs returning.
    const firstSeen = new Map<string, number>();
    for (const r of rows) {
      const ip = r.ip ?? 'unknown';
      const t = new Date(r.ts).getTime();
      const cur = firstSeen.get(ip);
      if (cur == null || t < cur) firstSeen.set(ip, t);
    }

    // Daily series across the whole range (zero-filled), with per-day uniques.
    const startDay = new Date(from);
    startDay.setHours(0, 0, 0, 0);
    const days: TrendPoint[] = [];
    const dayIps: Set<string>[] = [];
    const idx = new Map<number, number>();
    for (let t = startDay.getTime(); t <= now; t += DAY) {
      idx.set(t, days.length);
      days.push({ day: t, visits: 0, uniques: 0 });
      dayIps.push(new Set());
    }
    for (const r of inRange) {
      const d = new Date(r.ts);
      d.setHours(0, 0, 0, 0);
      const i = idx.get(d.getTime());
      if (i != null) {
        days[i].visits += 1;
        dayIps[i].add(r.ip ?? 'unknown');
      }
    }
    days.forEach((d, i) => { d.uniques = dayIps[i].size; });

    // Peak day by visits.
    const peak = days.reduce((p, d) => (d.visits > p.visits ? d : p), days[0] ?? { day: now, visits: 0, uniques: 0 });

    const uniqueIps = new Set(inRange.map((r) => r.ip ?? 'unknown'));
    const uniques = uniqueIps.size;
    let returning = 0;
    for (const ip of uniqueIps) {
      const fs = firstSeen.get(ip);
      if (fs != null && fs < from) returning += 1;
    }
    const fresh = uniques - returning;

    const prevUniques = new Set(prevRange.map((r) => r.ip ?? 'unknown')).size;
    const activeNow = new Set(
      rows.filter((r) => now - new Date(r.ts).getTime() < 5 * 60_000).map((r) => r.ip ?? 'unknown')
    ).size;
    const perDay = days.length ? Math.round((inRange.length / days.length) * 10) / 10 : 0;

    // Campaign / referral tags — which shared link actually got opened. One row
    // per tag: visits, unique visitors, and when it was last seen.
    const campMap = new Map<string, { visits: number; ips: Set<string>; last: number }>();
    for (const r of inRange) {
      const tag = (r.campaign || '').trim();
      if (!tag) continue;
      const e = campMap.get(tag) ?? { visits: 0, ips: new Set<string>(), last: 0 };
      e.visits += 1;
      e.ips.add(r.ip ?? 'unknown');
      e.last = Math.max(e.last, new Date(r.ts).getTime());
      campMap.set(tag, e);
    }
    const campaigns = [...campMap.entries()]
      .map(([tag, e]) => ({ tag, visits: e.visits, uniques: e.ips.size, last: e.last }))
      .sort((a, b) => b.last - a.last);

    return {
      days,
      total: inRange.length,
      uniques,
      activeNow,
      perDay,
      peak,
      visitsDelta: delta(inRange.length, prevRange.length),
      uniquesDelta: delta(uniques, prevUniques),
      newReturning: [
        { label: 'New visitors', value: fresh },
        { label: 'Returning', value: returning },
      ].filter((r) => r.value > 0),
      pages: topCounts(inRange, (r) => r.path || '/'),
      sources: topCounts(inRange, (r) => sourceOf(r.referrer)),
      devices: topCounts(inRange, (r) => deviceOf(r.user_agent), 3),
      browsers: topCounts(inRange, (r) => browserOf(r.user_agent), 5),
      countries: topCounts(inRange, (r) => r.country || 'Unknown', 6, (k) => flag(k === 'Unknown' ? null : k)),
      campaigns,
      recent: inRange.slice(0, 12),
    };
  }, [rows, range]);

  const kpis = [
    { label: 'Visits', value: stats.total.toLocaleString(), icon: BarChart3, delta: stats.visitsDelta },
    { label: 'Unique visitors', value: stats.uniques.toLocaleString(), icon: Users, delta: stats.uniquesDelta },
    { label: 'Active now', value: stats.activeNow.toLocaleString(), icon: Radio, live: stats.activeNow > 0 },
    { label: 'Avg / day', value: stats.perDay.toLocaleString(), icon: TrendingUp },
  ];

  return (
    <>
      <button
        onClick={openPanel}
        className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-sm text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-white"
        title="View visitor analytics"
      >
        <BarChart3 size={14} /> Visitors
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-white/10 bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <BarChart3 size={18} /> Visitor analytics
              </h2>
              <div className="flex items-center gap-2">
                <div className="mr-1 flex rounded-lg border border-white/10 p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r.days}
                      onClick={() => setRange(r.days)}
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${range === r.days ? 'bg-[var(--brand-bright)] text-[#0b0d10]' : 'text-[var(--muted)] hover:text-white'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button onClick={load} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" title="Refresh" aria-label="Refresh">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-auto p-6">
              {loading && rows.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-[var(--muted)]">
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </div>
              ) : error ? (
                <div className="py-24 text-center text-sm text-red-300">Couldn’t load analytics: {error}</div>
              ) : rows.length === 0 ? (
                <div className="py-24 text-center text-sm text-[var(--muted)]">
                  No visits recorded yet. Events appear here as people browse the site.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {kpis.map((k) => (
                      <div key={k.label} className="rounded-xl border border-white/10 bg-[var(--bg-soft)] p-4">
                        <div className="flex items-center gap-1.5 text-[var(--muted)]">
                          {k.live ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> : <k.icon size={14} />}
                          <span className="text-xs">{k.label}</span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="font-display text-2xl text-white">{k.value}</span>
                          {k.delta != null && <DeltaChip pct={k.delta} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Trend */}
                  <div className="rounded-xl border border-white/10 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Traffic — last {range} days</h3>
                      {stats.peak.visits > 0 && (
                        <span className="text-xs text-[var(--muted)]">Peak {fmtDay(stats.peak.day)} · {stats.peak.visits} visits</span>
                      )}
                    </div>
                    <TrendChart series={stats.days} />
                  </div>

                  {/* Campaign tags — which shared link actually got opened */}
                  <div className="rounded-xl border border-white/10 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 text-sm font-medium text-white">
                        <Tag size={14} /> Visits by campaign
                      </h3>
                      <span className="text-xs text-[var(--muted)]">Tag a link with <code className="text-[var(--brand-bright)]">?ref=name</code></span>
                    </div>
                    {stats.campaigns.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[var(--muted)]">
                        No tagged links opened yet. Share <code className="text-[var(--brand-bright)]">?ref=acme</code> on an application to see it here.
                      </p>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {stats.campaigns.map((c) => (
                          <div key={c.tag} className="flex items-center justify-between gap-3 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="rounded-md bg-[var(--brand-bright)]/12 px-2 py-0.5 font-mono text-xs text-[var(--brand-bright)]">{c.tag}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-3 text-xs text-[var(--muted)]">
                              <span className="tabular-nums text-[var(--text)]">{c.visits} visit{c.visits === 1 ? '' : 's'}</span>
                              <span className="tabular-nums">{c.uniques} unique</span>
                              <span className="hidden sm:inline">last {when(new Date(c.last).toISOString())}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Breakdowns */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <Panel title="Top pages"><BarList rows={stats.pages} empty="No pages yet." /></Panel>
                    <Panel title="Sources"><BarList rows={stats.sources} empty="No referrers yet." /></Panel>
                    <Panel title="New vs returning"><BarList rows={stats.newReturning} empty="No visitors yet." /></Panel>
                    <Panel title="Devices"><BarList rows={stats.devices} empty="No device data." /></Panel>
                    <Panel title="Browsers"><BarList rows={stats.browsers} empty="No browser data." /></Panel>
                    <Panel title={<span className="flex items-center gap-1.5"><Globe size={14} /> Countries</span>}>
                      <BarList rows={stats.countries} empty="No geo data yet." />
                    </Panel>
                    <Panel title="Recent activity">
                      <div className="divide-y divide-white/5">
                        {stats.recent.map((r, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span>{flag(r.country)}</span>
                              <span className="truncate text-[var(--text)]">{r.path || '/'}</span>
                            </span>
                            <span className="shrink-0 text-[var(--muted)]">{sourceOf(r.referrer)} · {when(r.ts)}</span>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>

                  <p className="text-center text-[11px] text-[var(--muted)]/70">
                    Self-hosted analytics — aggregated in your browser from your own Supabase log. No third-party trackers, and your own visits aren’t counted.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// A GA-style ↑/↓ change chip vs the previous equal period.
function DeltaChip({ pct }: { pct: number }) {
  const up = pct > 0, flat = pct === 0;
  const cls = flat ? 'text-[var(--muted)]' : up ? 'text-emerald-400' : 'text-red-300';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${cls}`} title="vs previous period">
      <Icon size={13} />{Math.abs(pct)}%
    </span>
  );
}

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <h3 className="mb-3 text-sm font-medium text-white">{title}</h3>
      {children}
    </div>
  );
}
