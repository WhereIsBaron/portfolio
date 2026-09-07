// Client-side brute-force deterrent for the owner login.
//
// This slows down and then temporarily blocks repeated failed sign-in attempts
// from the same browser. It is defense-in-depth on top of Supabase's own
// server-side auth rate limiting (which is what actually stops an attacker who
// bypasses this UI and hits the API directly). Keep a strong password too.

const KEY = 'al-login-guard';
const MAX_FAILS_BEFORE_LOCK = 5;
// Lockout length grows each time the fail count crosses another multiple of 5.
const LOCK_LADDER_MS = [
  5 * 60_000, //  5 min  (after 5 fails)
  15 * 60_000, // 15 min (after 10)
  30 * 60_000, // 30 min (after 15)
  60 * 60_000, //  1 hr  (after 20)
];

type GuardState = { fails: number; lockUntil: number };

function read(): GuardState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { fails: 0, lockUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      fails: Number(parsed.fails) || 0,
      lockUntil: Number(parsed.lockUntil) || 0,
    };
  } catch {
    return { fails: 0, lockUntil: 0 };
  }
}

function write(state: GuardState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked → guard is best-effort */
  }
}

/** Milliseconds until the login is unlocked, or 0 if not locked. */
export function lockRemainingMs(): number {
  const { lockUntil } = read();
  return Math.max(0, lockUntil - Date.now());
}

/** A small artificial delay that grows with the number of recent failures. */
export function throttleDelayMs(): number {
  const { fails } = read();
  return Math.min(fails * 400, 3000);
}

/** Record a failed attempt; returns how long (ms) the login is now locked. */
export function recordFailure(): number {
  const { fails } = read();
  const next = fails + 1;
  let lockUntil = 0;
  if (next % MAX_FAILS_BEFORE_LOCK === 0) {
    const level = Math.min(next / MAX_FAILS_BEFORE_LOCK, LOCK_LADDER_MS.length) - 1;
    lockUntil = Date.now() + LOCK_LADDER_MS[level];
  }
  write({ fails: next, lockUntil });
  return Math.max(0, lockUntil - Date.now());
}

/** Clear all failure/lock state after a successful sign-in. */
export function recordSuccess() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Human-readable countdown like "4m 12s". */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
