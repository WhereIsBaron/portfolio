import { useState } from 'react';
import { BarChart3, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type VisitRow = {
  ip: string;
  hits: number;
  first_seen: string;
  last_seen: string;
  last_user_agent: string | null;
  last_referrer: string | null;
  last_path: string | null;
};

// Compress a user-agent string into a rough browser/OS label for the table.
function shortAgent(ua: string | null): string {
  if (!ua) return '—';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iOS/.test(ua)
    ? 'iOS'
    : /Mac OS X/.test(ua)
    ? 'macOS'
    : /Linux/.test(ua)
    ? 'Linux'
    : '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
    ? 'Opera'
    : /Chrome\//.test(ua)
    ? 'Chrome'
    : /Firefox\//.test(ua)
    ? 'Firefox'
    : /Safari\//.test(ua)
    ? 'Safari'
    : 'Browser';
  return [browser, os].filter(Boolean).join(' · ');
}

function when(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB');
}

export default function VisitorInsights() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('visit_log')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(300);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((data as VisitRow[]) ?? []);
  };

  const openPanel = () => {
    setOpen(true);
    load();
  };

  const totalVisits = rows.reduce((sum, r) => sum + Number(r.hits || 0), 0);
  const uniqueIps = rows.length;

  return (
    <>
      <button
        onClick={openPanel}
        className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-sm text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-white"
        title="View visitors"
      >
        <BarChart3 size={14} /> Visitors
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <BarChart3 size={18} /> Visitors
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={load}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white"
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="flex gap-4 border-b border-white/10 px-6 py-4">
              <div>
                <div className="font-display text-2xl text-white">{totalVisits.toLocaleString()}</div>
                <div className="text-xs text-[var(--muted)]">total visits</div>
              </div>
              <div>
                <div className="font-display text-2xl text-white">{uniqueIps.toLocaleString()}</div>
                <div className="text-xs text-[var(--muted)]">unique IPs</div>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
              {loading && rows.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--muted)]">
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </div>
              ) : error ? (
                <div className="px-4 py-16 text-center text-sm text-red-300">
                  Couldn’t load visitors: {error}
                </div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-16 text-center text-sm text-[var(--muted)]">
                  No visits recorded yet.
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">IP</th>
                      <th className="px-3 py-2 font-medium">Visits</th>
                      <th className="px-3 py-2 font-medium">Last seen</th>
                      <th className="px-3 py-2 font-medium">Device</th>
                      <th className="px-3 py-2 font-medium">From / page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.ip} className="border-t border-white/5 text-[var(--text)]">
                        <td className="px-3 py-2 font-mono text-xs">{r.ip}</td>
                        <td className="px-3 py-2">{Number(r.hits).toLocaleString()}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{when(r.last_seen)}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{shortAgent(r.last_user_agent)}</td>
                        <td className="px-3 py-2 text-xs text-[var(--muted)]">
                          <div className="max-w-[220px] truncate">
                            {r.last_referrer ? r.last_referrer : 'direct'}
                          </div>
                          <div className="max-w-[220px] truncate opacity-70">{r.last_path || '/'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
