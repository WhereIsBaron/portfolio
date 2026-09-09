// Client-side helpers for the DPO Pay flow. These call our own Netlify
// function (netlify/functions/dpo.ts) — the DPO company token stays server-side.

const ENDPOINT = '/.netlify/functions/dpo';

export type CreateArgs = {
  amount: number;
  currency?: string;
  description?: string;
  name?: string;
  email?: string;
};

export type CreateResult = {
  token: string;
  ref: string;
  amount: string;
  currency: string;
  paymentUrl: string;
};

export type VerifyResult = {
  paid: boolean;
  result: string | null;
  explanation: string | null;
  amount: string | null;
  currency: string | null;
  ref: string | null;
  customerName: string | null;
  paymentMethod: string | null;
};

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || 'Payment request failed.');
  }
  return data as T;
}

// Register a transaction with DPO and get back the hosted payment-page URL.
export function createPayment(args: CreateArgs): Promise<CreateResult> {
  return post<CreateResult>({ action: 'create', ...args });
}

// After DPO redirects the payer back, confirm the transaction was paid.
export function verifyPayment(token: string): Promise<VerifyResult> {
  return post<VerifyResult>({ action: 'verify', token });
}
