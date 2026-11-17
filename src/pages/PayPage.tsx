import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Lock,
  ShieldCheck,
  Loader2,
  ChevronDown,
  Smartphone,
  Wallet,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { createPayment } from '@/lib/dpoPay';
import { DemoShell, Masthead, fieldLabel, cx } from '@/components/demo/kit';

// Card checkout (DPO Pay) is offline for now. Flip this back to true to
// re-enable the hosted card redirect below.
const CARD_ENABLED = false;

// The cell number that receives mobile money (FNB Pay2Cell, Orange Money,
// and eWallet). Shown grouped for readability; copied as raw digits.
const CELL_RAW = '76541693';
const CELL_PRETTY = '76 541 693';

// Currencies the DPO account is set up to charge in. Keep in sync with the
// allow-list in netlify/functions/dpo.ts.
const CURRENCIES = ['USD', 'ZAR', 'BWP', 'KES', 'GBP', 'EUR'] as const;
const PRESETS = [50, 100, 250, 500];

const input =
  'w-full  border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-[var(--ink)] placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';
const label = 'block text-sm font-medium text-[var(--muted)] mb-1.5';

type MobileMethod = {
  icon: typeof Smartphone;
  name: string;
  how: string;
};

const MOBILE_METHODS: MobileMethod[] = [
  {
    icon: Smartphone,
    name: 'FNB Pay2Cell',
    how: `Send from your FNB app to ${CELL_PRETTY}.`,
  },
  {
    icon: Smartphone,
    name: 'Orange Money',
    how: `Send to the same number, ${CELL_PRETTY}.`,
  },
  {
    icon: Wallet,
    name: 'eWallet (any bank)',
    how: `Send an eWallet to ${CELL_PRETTY}. Amounts must be multiples of P50 (the smallest note an ATM pays out), e.g. P50, P100, P150.`,
  },
];

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
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(CELL_RAW);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — the number is on screen to copy by hand */
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!CARD_ENABLED) return;
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
        eyebrow="Payments · Botswana"
        title={
          <>
            Pay or tip<span className="text-[var(--accent)]">.</span>
          </>
        }
        lede="Pay for a service, settle an invoice, or leave a tip. Mobile money works right now — FNB Pay2Cell, Orange Money, or an eWallet from any bank. Card checkout is temporarily offline."
        facts={[
          { label: 'Pay to', value: CELL_PRETTY },
          { label: 'Methods', value: 'Mobile money' },
          { label: 'eWallet min', value: 'P50' },
          { label: 'Card', value: 'Offline' },
        ]}
      />

      <section className="pt-8">
        <div className="mx-auto max-w-xl space-y-10">
          {cancelled && (
            <div className="  border border-[var(--warn)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn)]">
              Payment was cancelled. You can use mobile money below.
            </div>
          )}

          {/* ── Mobile money — the active way to pay ──────────────────── */}
          <div className="border border-[var(--border)] bg-[var(--surface)]">
            <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3">
              <div>
                <p className={fieldLabel}>Pay by mobile · available now</p>
                <h2 className="mt-1 font-display text-xl font-medium leading-tight text-[var(--ink)]">
                  Send to this number
                </h2>
              </div>
              <Smartphone size={20} className="shrink-0 text-[var(--accent)]" />
            </header>

            <div className="p-5">
              {/* number + copy */}
              <div className="flex items-stretch overflow-hidden border border-[var(--border)] bg-[var(--bg-soft)]">
                <div className="flex flex-1 flex-col justify-center px-4 py-3">
                  <span className={fieldLabel}>Cell number</span>
                  <span className="mt-0.5 font-display text-2xl font-medium tracking-tight text-[var(--ink)]">
                    {CELL_PRETTY}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyNumber}
                  className="flex items-center gap-2 border-l border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  aria-label="Copy number"
                >
                  {copied ? (
                    <>
                      <Check size={16} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> Copy
                    </>
                  )}
                </button>
              </div>

              {/* methods */}
              <ul className="mt-5 space-y-px overflow-hidden border border-[var(--border)] bg-[var(--border)]">
                {MOBILE_METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <li
                      key={m.name}
                      className="flex items-start gap-3 bg-[var(--surface)] px-4 py-3.5"
                    >
                      <Icon size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                      <div>
                        <p className="font-medium text-[var(--ink)]">{m.name}</p>
                        <p className="mt-0.5 text-sm leading-snug text-[var(--muted)]">{m.how}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
                After sending, pop me a WhatsApp on {CELL_PRETTY} with what it&apos;s for and I&apos;ll
                confirm. eWallet cash is collected at an ATM, so stick to multiples of P50.
              </p>
            </div>
          </div>

          {/* ── Card checkout — temporarily offline ───────────────────── */}
          <div>
            <div className="mb-4 flex items-start gap-2.5 border border-[var(--warn)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-semibold">Card checkout is temporarily offline.</strong>{' '}
                The DPO Pay card option isn&apos;t working at the moment. Please use mobile money
                above.
              </span>
            </div>

            <div
              className={cx(CARD_ENABLED ? '' : 'select-none opacity-45')}
              aria-hidden={!CARD_ENABLED}
            >
              <div className="mb-3 flex items-center gap-2">
                <p className={fieldLabel}>Card · DPO Pay</p>
                <span className="inline-flex items-center gap-1.5 bg-[var(--bg-soft)] px-2 py-0.5 text-[11px] font-medium tracking-wide text-[var(--muted)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  Unavailable
                </span>
              </div>

              <form onSubmit={onSubmit}>
                <fieldset disabled={!CARD_ENABLED} className="m-0 min-w-0 space-y-5 border-0 p-0">
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
                    disabled={busy || !CARD_ENABLED}
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
                    <ShieldCheck size={14} /> Card details are handled by DPO Pay. This site never sees
                    them.
                  </p>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </section>
    </DemoShell>
  );
}
