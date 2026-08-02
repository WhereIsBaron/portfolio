import { useState, FormEvent } from 'react';
import { Lock, LogOut, Pencil, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';

export default function OwnerBar() {
  const { user, configured, signIn, signOut } = useAuth();
  const { status } = useLayout();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setOpen(false);
    setPassword('');
  };

  const isError = status?.startsWith('Could not') || status?.startsWith('Supabase');

  return (
    <>
      {status && (
        <div
          className={`fixed bottom-20 right-4 z-[80] flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
            isError ? 'bg-red-600' : 'bg-[var(--brand)]'
          }`}
        >
          {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {status}
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[80]">
        {user ? (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)] py-1.5 pl-3 pr-2 shadow-lg">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-bright)]">
              <Pencil size={14} /> Edit mode
            </span>
            <span className="hidden max-w-[160px] truncate text-xs text-[var(--muted)] sm:inline">
              {user.email}
            </span>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-sm text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] shadow-lg transition-all hover:text-white"
            title="Owner login"
            aria-label="Owner login"
          >
            <Lock size={15} />
            <span className="hidden sm:inline">Owner</span>
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg text-white">
                <Lock size={18} /> Owner login
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Sign in to rearrange projects and screenshots. Visitors always see your saved
              arrangement, view-only.
            </p>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Email</label>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-white focus:border-[var(--brand-bright)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bright)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-white focus:border-[var(--brand-bright)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bright)]"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bright)] py-2.5 font-medium text-[#0b0d10] transition-colors hover:bg-white disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {busy ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
