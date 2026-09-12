import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { verifyPayment, type VerifyResult } from '@/lib/dpoPay';

type State =
  | { kind: 'verifying' }
  | { kind: 'done'; result: VerifyResult }
  | { kind: 'notoken' }
  | { kind: 'error'; message: string };

// DPO appends the transaction token to the redirect URL. Field name has varied
// across integrations, so accept the known aliases.
function extractToken(params: URLSearchParams): string | null {
  return (
    params.get('TransactionToken') ||
    params.get('TransToken') ||
    params.get('ID') ||
    null
  );
}

export default function PayReturn() {
  usePageTitle('Payment Confirmation');
  const [params] = useSearchParams();
  const [state, setState] = useState<State>({ kind: 'verifying' });

  useEffect(() => {
    const token = extractToken(params);
    if (!token) {
      setState({ kind: 'notoken' });
      return;
    }
    let alive = true;
    verifyPayment(token)
      .then((result) => alive && setState({ kind: 'done', result }))
      .catch((err) =>
        alive &&
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'Verification failed.' })
      );
    return () => {
      alive = false;
    };
  }, [params]);

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

      <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
        {state.kind === 'verifying' && (
          <>
            <Loader2 size={44} className="animate-spin text-[var(--brand-bright)]" />
            <h1 className="mt-6 font-display text-2xl font-light text-white">Confirming your payment…</h1>
            <p className="mt-2 text-[var(--muted)]">This only takes a moment.</p>
          </>
        )}

        {state.kind === 'done' && state.result.paid && (
          <>
            <CheckCircle2 size={48} className="text-emerald-400" />
            <h1 className="mt-6 font-display text-2xl font-light text-white">Payment received</h1>
            <p className="mt-2 text-[var(--muted)]">
              Thank you{state.result.customerName ? `, ${state.result.customerName}` : ''} — your
              payment
              {state.result.amount
                ? ` of ${state.result.currency ?? ''} ${state.result.amount}`
                : ''}{' '}
              was successful.
            </p>
            {state.result.ref && (
              <p className="mt-4 rounded-lg border border-white/10 bg-[var(--bg-soft)] px-4 py-2 text-sm text-[var(--muted)]">
                Reference: <span className="text-white">{state.result.ref}</span>
              </p>
            )}
          </>
        )}

        {state.kind === 'done' && !state.result.paid && (
          <>
            {state.result.result === null ? (
              <XCircle size={48} className="text-red-400" />
            ) : (
              <Clock size={48} className="text-amber-400" />
            )}
            <h1 className="mt-6 font-display text-2xl font-light text-white">
              Payment not completed
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              {state.result.explanation ||
                'We couldn’t confirm this payment. If money left your account, please get in touch and we’ll sort it out.'}
            </p>
            <Link
              to="/pay"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-bright)] px-5 py-2.5 font-medium text-black transition-opacity hover:opacity-90"
            >
              Try again
            </Link>
          </>
        )}

        {state.kind === 'notoken' && (
          <>
            <XCircle size={48} className="text-red-400" />
            <h1 className="mt-6 font-display text-2xl font-light text-white">No payment to confirm</h1>
            <p className="mt-2 text-[var(--muted)]">
              This page confirms a payment after checkout. Start one from the payment page.
            </p>
            <Link
              to="/pay"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-bright)] px-5 py-2.5 font-medium text-black transition-opacity hover:opacity-90"
            >
              Go to payments
            </Link>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <XCircle size={48} className="text-red-400" />
            <h1 className="mt-6 font-display text-2xl font-light text-white">
              Couldn’t confirm payment
            </h1>
            <p className="mt-2 text-[var(--muted)]">{state.message}</p>
          </>
        )}
      </main>
    </div>
  );
}
