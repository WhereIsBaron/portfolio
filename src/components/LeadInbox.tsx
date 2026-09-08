import { useState } from 'react';
import {
  Inbox, X, Loader2, RefreshCw, Mail, Building2, Tag, Check, CheckCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// A lead submitted through the public contact form (owner-only read via RLS).
type Lead = {
  id: number;
  ts: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  campaign: string | null;
  handled: boolean;
};

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

export default function LeadInbox() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('leads')
      .select('id,ts,name,email,company,message,campaign,handled')
      .order('ts', { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setRows((data as Lead[]) ?? []);
  };

  const openPanel = () => { setOpen(true); load(); };

  const toggleHandled = async (lead: Lead) => {
    if (!supabase) return;
    const next = !lead.handled;
    setRows((rs) => rs.map((r) => (r.id === lead.id ? { ...r, handled: next } : r)));
    const { error } = await supabase.from('leads').update({ handled: next }).eq('id', lead.id);
    if (error) setRows((rs) => rs.map((r) => (r.id === lead.id ? { ...r, handled: lead.handled } : r)));
  };

  const unread = rows.filter((r) => !r.handled).length;

  return (
    <>
      <button
        onClick={openPanel}
        className="relative inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-sm text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-white"
        title="View contact-form messages"
      >
        <Inbox size={14} /> Messages
        {unread > 0 && (
          <span className="ml-0.5 rounded-full bg-[var(--brand-bright)] px-1.5 text-[10px] font-semibold text-[#0b0d10]">{unread}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <Inbox size={18} /> Messages
                {rows.length > 0 && <span className="text-sm text-[var(--muted)]">· {rows.length}</span>}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={load} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" title="Refresh" aria-label="Refresh">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {loading && rows.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-[var(--muted)]">
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </div>
              ) : error ? (
                <div className="py-24 text-center text-sm text-red-300">Couldn’t load messages: {error}</div>
              ) : rows.length === 0 ? (
                <div className="py-24 text-center text-sm text-[var(--muted)]">
                  No messages yet. They’ll appear here when someone uses the contact form.
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((l) => (
                    <div
                      key={l.id}
                      className={`rounded-xl border p-4 transition-colors ${l.handled ? 'border-white/10 bg-transparent opacity-70' : 'border-[var(--brand)]/30 bg-[var(--bg-soft)]'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-white">{l.name}</span>
                            {l.company && (
                              <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                                <Building2 size={12} /> {l.company}
                              </span>
                            )}
                            {l.campaign && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-bright)]/12 px-1.5 py-0.5 font-mono text-[11px] text-[var(--brand-bright)]">
                                <Tag size={10} /> {l.campaign}
                              </span>
                            )}
                          </div>
                          <a href={`mailto:${l.email}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--brand-bright)] hover:underline">
                            <Mail size={12} /> {l.email}
                          </a>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="whitespace-nowrap text-xs text-[var(--muted)]">{when(l.ts)}</span>
                          <button
                            onClick={() => toggleHandled(l)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${l.handled ? 'text-[var(--muted)] hover:bg-white/5 hover:text-white' : 'bg-[var(--brand-bright)]/15 text-[var(--brand-bright)] hover:bg-[var(--brand-bright)]/25'}`}
                            title={l.handled ? 'Mark as unread' : 'Mark as handled'}
                          >
                            {l.handled ? <><CheckCheck size={13} /> Done</> : <><Check size={13} /> Mark done</>}
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--text)]">{l.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
