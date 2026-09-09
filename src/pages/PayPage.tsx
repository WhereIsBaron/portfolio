import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { createPayment } from '@/lib/dpoPay';

// Currencies the DPO account is set up to charge in. Keep in sync with the
// allow-list in netlify/functions/dpo.ts.
const CURRENCIES = ['USD', 'ZAR', 'BWP', 'KES', 'GBP', 'EUR'] as const;
const PRESETS = [50, 100, 250, 500];

const input =
  'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-4 py-2.5 text-white placeholder:text-[var(--muted)]/50 focus:border-[var(--brand-bright)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bright)]';
const label = 'block text-sm font-medium text-[var(--muted)] mb-1.5';

export default function PayPage() {
  const [params] = useSearchParams();
  const cancelled = params.get('cancelled') === '1';

  const [amount, setAmount] = useState('100');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USD');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setBusy(true);
    try {
      const { paymentUrl } = await createPayment({
        amount: value,
        currency,
        description: description.trim() || 'Portfolio payment',
        name: name.trim(),
        email: email.trim(),
      });
      // Hand off to DPO's secure hosted payment page.
      window.location.href = paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            Andrew<span className="text-[var(--brand-bright)]">.</span>Langeveldt
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> Back to portfolio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-14">
        <h1 className="font-display text-3xl font-light leading-tight text-white">Make a payment</h1>
        <p className="mt-3 text-[var(--muted)]">
          Securely pay for a service, deposit, or invoice. Payments are processed by{' '}
          <span className="text-white">DPO Pay</span> — your card details are entered on their
          secure page and never touch this site.
        </p>

        {cancelled && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Payment was cancelled. You can try again below.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <span className={label}>Amount</span>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as (typeof CURRENCIES)[number])}
                className={`${input} w-28 shrink-0`}
                aria-label="Currency"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={input}
                placeholder="0.00"
                required
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm text-[var(--muted)] transition-colors hover:border-[var(--brand-bright)] hover:text-white"
                >
                  {currency} {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="desc" className={label}>
              What&apos;s this for? <span className="text-[var(--muted)]/50">(optional)</span>
            </label>
            <input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={input}
              placeholder="e.g. Website deposit, consulting hours"
              maxLength={200}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={label}>
                Your name <span className="text-[var(--muted)]/50">(optional)</span>
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
                placeholder="Full name"
                maxLength={200}
              />
            </div>
            <div>
              <label htmlFor="email" className={label}>
                Email <span className="text-[var(--muted)]/50">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                placeholder="you@example.com"
                maxLength={200}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bright)] px-5 py-3 font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Redirecting to secure checkout…
              </>
            ) : (
              <>
                <Lock size={16} /> Continue to secure payment
              </>
            )}
          </button>

          <p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]/70">
            <ShieldCheck size={14} /> Card details are handled by DPO Pay. This site never sees them.
          </p>
        </form>
      </main>
    </div>
  );
}
