import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { verifyPayment, type VerifyResult } from '@/lib/dpoPay';
import { DemoShell } from '@/components/demo/kit';

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
    <DemoShell title="Payment Confirmation" wordmark="Pay">
      <section className="mx-auto flex max-w-xl flex-col items-center py-16 text-center">
        {state.kind === 'verifying' && (
          <>
            <Loader2 size={44} className="animate-spin text-[var(--accent)]" />
            <h1 className="mt-6 font-display text-2xl font-light text-[var(--ink)]">Confirming your payment…</h1>
            <p className="mt-2 text-[var(--muted)]">This only takes a moment.</p>
          </>
        )}

        {state.kind === 'done' && state.result.paid && (
          <>
            <CheckCircle2 size={48} className="text-[var(--ok)]" />
            <h1 className="mt-6 font-display text-2xl font-light text-[var(--ink)]">Payment received</h1>
            <p className="mt-2 text-[var(--muted)]">
              Thank you{state.result.customerName ? `, ${state.result.customerName}` : ''} — your
              payment
              {state.result.amount
                ? ` of ${state.result.currency ?? ''} ${state.result.amount}`
                : ''}{' '}
              was successful.
            </p>
            {state.result.ref && (
              <p className="mt-4  border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm text-[var(--muted)]">
                Reference: <span className="text-[var(--ink)]">{state.result.ref}</span>
              </p>
            )}
          </>
        )}

        {state.kind === 'done' && !state.result.paid && (
          <>
            {state.result.result === null ? (
              <XCircle size={48} className="text-[var(--danger)]" />
            ) : (
              <Clock size={48} className="text-[var(--warn)]" />
            )}
            <h1 className="mt-6 font-display text-2xl font-light text-[var(--ink)]">
              Payment not completed
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              {state.result.explanation ||
                'We couldn’t confirm this payment. If money left your account, please get in touch and we’ll sort it out.'}
            </p>
            <Link
              to="/pay"
              className="mt-6 inline-flex items-center gap-2  bg-[var(--accent)] px-5 py-2.5 font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90"
            >
              Try again
            </Link>
          </>
        )}

        {state.kind === 'notoken' && (
          <>
            <XCircle size={48} className="text-[var(--danger)]" />
            <h1 className="mt-6 font-display text-2xl font-light text-[var(--ink)]">No payment to confirm</h1>
            <p className="mt-2 text-[var(--muted)]">
              This page confirms a payment after checkout. Start one from the payment page.
            </p>
            <Link
              to="/pay"
              className="mt-6 inline-flex items-center gap-2  bg-[var(--accent)] px-5 py-2.5 font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90"
            >
              Go to payments
            </Link>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <XCircle size={48} className="text-[var(--danger)]" />
            <h1 className="mt-6 font-display text-2xl font-light text-[var(--ink)]">
              Couldn’t confirm payment
            </h1>
            <p className="mt-2 text-[var(--muted)]">{state.message}</p>
          </>
        )}
      </section>
    </DemoShell>
  );
}
