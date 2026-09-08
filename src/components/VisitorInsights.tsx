import { useMemo, useState } from 'react';
import {
  BarChart3, X, Loader2, RefreshCw, Users, Radio, Globe, TrendingUp,
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

// ── Small inline charts (no dependency) ───────────────────────────────────────
function TrendChart({ series }: { series: { day: number; visits: number }[] }) {
  const W = 680;
  const H = 150;
  const P = 10;
  const max = Math.max(1, ...series.map((d) => d.visits));
  const n = series.length;
  const x = (i: number) => P + (n <= 1 ? 0 : (i / (n - 1)) * (W - 2 * P));
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = series.map((d, i) => `${x(i)},${y(d.visits)}`).join(' ');
  const area = `M ${P},${H - P} L ${series.map((d, i) => `${x(i)},${y(d.visits)}`).join(' L ')} L ${x(n - 1)},${H - P} Z`;
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 150 }}>
      <defs>
        <linearGradient id="vi-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-bright)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand-bright)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#vi-fill)" />
      <polyline points={line} fill="none" stroke="var(--brand-bright)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((d, i) => (
        <circle key={d.day} cx={x(i)} cy={y(d.visits)} r="6" fill="transparent">
          <title>{`${fmt(d.day)} — ${d.visits} visit${d.visits === 1 ? '' : 's'}`}</title>
        </circle>
      ))}
    </svg>
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
      .select('ts,ip,user_agent,referrer,path,country')
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
    const inRange = rows.filter((r) => new Date(r.ts).getTime() >= from);

    // Daily series across the whole range (zero-filled).
    const startDay = new Date(from);
    startDay.setHours(0, 0, 0, 0);
    const days: { day: number; visits: number }[] = [];
    const idx = new Map<number, number>();
    for (let t = startDay.getTime(); t <= now; t += DAY) {
      idx.set(t, days.length);
      days.push({ day: t, visits: 0 });
    }
    for (const r of inRange) {
      const d = new Date(r.ts);
      d.setHours(0, 0, 0, 0);
      const i = idx.get(d.getTime());
      if (i != null) days[i].visits += 1;
    }

    const uniques = new Set(inRange.map((r) => r.ip ?? 'unknown')).size;
    const activeNow = new Set(
      rows.filter((r) => now - new Date(r.ts).getTime() < 5 * 60_000).map((r) => r.ip ?? 'unknown')
    ).size;
    const perDay = days.length ? Math.round(inRange.length / days.length) : 0;

    return {
      inRange,
      days,
      total: inRange.length,
      uniques,
      activeNow,
      perDay,
      pages: topCounts(inRange, (r) => r.path || '/'),
      sources: topCounts(inRange, (r) => sourceOf(r.referrer)),
      devices: topCounts(inRange, (r) => deviceOf(r.user_agent), 3),
      browsers: topCounts(inRange, (r) => browserOf(r.user_agent), 5),
      countries: topCounts(inRange, (r) => r.country || 'Unknown', 6, (k) => flag(k === 'Unknown' ? null : k)),
      recent: inRange.slice(0, 12),
    };
  }, [rows, range]);

  const kpis = [
    { label: 'Visits', value: stats.total.toLocaleString(), icon: BarChart3 },
    { label: 'Unique visitors', value: stats.uniques.toLocaleString(), icon: Users },
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
                        <div className="mt-2 font-display text-2xl text-white">{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Trend */}
                  <div className="rounded-xl border border-white/10 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Visits — last {range} days</h3>
                      <span className="text-xs text-[var(--muted)]">hover a point for the daily count</span>
                    </div>
                    <TrendChart series={stats.days} />
                    <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
                      <span>{new Date(stats.days[0]?.day ?? Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      <span>{new Date(stats.days[stats.days.length - 1]?.day ?? Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>

                  {/* Breakdowns */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <Panel title="Top pages"><BarList rows={stats.pages} empty="No pages yet." /></Panel>
                    <Panel title="Sources"><BarList rows={stats.sources} empty="No referrers yet." /></Panel>
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

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <h3 className="mb-3 text-sm font-medium text-white">{title}</h3>
      {children}
    </div>
  );
}
