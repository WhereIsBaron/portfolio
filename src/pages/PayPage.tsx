import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck, Loader2, ChevronDown } from 'lucide-react';
import { createPayment } from '@/lib/dpoPay';
import { DemoShell, Masthead } from '@/components/demo/kit';

// Currencies the DPO account is set up to charge in. Keep in sync with the
// allow-list in netlify/functions/dpo.ts.
const CURRENCIES = ['USD', 'ZAR', 'BWP', 'KES', 'GBP', 'EUR'] as const;
const PRESETS = [50, 100, 250, 500];

const input =
  'w-full  border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-[var(--ink)] placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';
const label = 'block text-sm font-medium text-[var(--muted)] mb-1.5';

export default function PayPage() {
  const [params] = useSearchParams();
  const cancelled = params.get('cancelled') === '1';

  // Prefill from the homepage mini-form (/pay?amount=…&currency=…).
  const presetAmount = params.get('amount');
  const presetCurrency = params.get('currency')?.toUpperCase();
  const [amount, setAmount] = useState(
    presetAmount && Number(presetAmount) > 0 ? presetAmount : '100'
  );
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>(
    (CURRENCIES as readonly string[]).includes(presetCurrency ?? '')
      ? (presetCurrency as (typeof CURRENCIES)[number])
      : 'USD'
  );
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
    <DemoShell title="Make a Payment" wordmark="Pay">
      <Masthead
        eyebrow="Product demo · hosted payments"
        title={
          <>
            Take a payment<span className="text-[var(--accent)]">.</span>
          </>
        }
        lede="Securely pay for a service, deposit, or invoice. Payments are processed by DPO Pay — card details are entered on their secure page and never touch this site."
        facts={[
          { label: 'Processor', value: 'DPO Pay' },
          { label: 'Currencies', value: String(CURRENCIES.length) },
          { label: 'Card data', value: 'Never stored' },
          { label: 'Checkout', value: 'Hosted redirect' },
        ]}
      />

      <section className="pt-8">
        <div className="mx-auto max-w-xl">
          {cancelled && (
            <div className="mb-6  border border-[var(--warn)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn)]">
              Payment was cancelled. You can try again below.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <span className={label}>Amount</span>
            <div className="flex items-stretch overflow-hidden  border border-[var(--border)] bg-[var(--bg-soft)] transition-colors focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]">
              <div className="relative flex items-center border-r border-[var(--border)]">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as (typeof CURRENCIES)[number])}
                  className="h-full cursor-pointer appearance-none bg-transparent py-3 pl-4 pr-9 font-medium text-[var(--ink)] focus:outline-none"
                  aria-label="Currency"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-[var(--bg-soft)] text-[var(--ink)]">
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 text-[var(--muted)]" />
              </div>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full min-w-0 bg-transparent px-4 py-3 text-lg text-[var(--ink)] placeholder:text-[var(--muted)]/50 focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
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
                  className=" border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
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
            <div className=" border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2  bg-[var(--accent)] px-5 py-3 font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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

            <p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <ShieldCheck size={14} /> Card details are handled by DPO Pay. This site never sees them.
            </p>
          </form>
        </div>
      </section>
    </DemoShell>
  );
}
