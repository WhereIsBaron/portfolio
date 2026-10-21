import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useReveal } from '@/hooks/useReveal';

/* ──────────────────────────────────────────────────────────────────
   Demo design kit — the shared, on-brand chrome for the five job-
   targeted demo consoles (/retail, /helpdesk, /edc, /noc, /dba).

   Every demo wraps in <DemoShell>, which applies the `.paper`
   "Stone & blueprint" theme so the consoles read as one system with
   the public homepage: Fraunces display type, Schibsted Grotesk body,
   square flat surfaces, hairline borders, a single blueprint-blue
   accent, and mono micro-labels. Status colour comes from the
   semantic tokens defined on `.paper` in index.css (--ok / --warn /
   --danger), so it stays legible in both Stone (light) and Slate
   (dark).
   ──────────────────────────────────────────────────────────────── */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Mono micro-label — the recurring editorial field caption. */
export const fieldLabel =
  'font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]';

export type Tone = 'ok' | 'warn' | 'danger' | 'accent' | 'neutral';

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-[var(--ok)]',
  warn: 'text-[var(--warn)]',
  danger: 'text-[var(--danger)]',
  accent: 'text-[var(--accent)]',
  neutral: 'text-[var(--muted)]',
};

const TONE_FILL: Record<Tone, string> = {
  ok: 'bg-[var(--ok-bg)] text-[var(--ok)]',
  warn: 'bg-[var(--warn-bg)] text-[var(--warn)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  neutral: 'bg-[var(--bg-soft)] text-[var(--muted)]',
};

const TONE_BAR: Record<Tone, string> = {
  ok: 'bg-[var(--ok)]',
  warn: 'bg-[var(--warn)]',
  danger: 'bg-[var(--danger)]',
  accent: 'bg-[var(--accent)]',
  neutral: 'bg-[var(--muted)]',
};

export const toneText = (t: Tone) => TONE_TEXT[t];
export const toneBar = (t: Tone) => TONE_BAR[t];

/* ── Shell ───────────────────────────────────────────────────────── */

export function DemoShell({
  title,
  wordmark,
  revealKey,
  children,
}: {
  /** Document title (sans the "— Andrew Langeveldt" suffix). */
  title: string;
  /** Trailing word of the Andrew.XXX lockup, e.g. "POS". */
  wordmark: string;
  /** Changing this re-arms scroll-reveal when tab content swaps. */
  revealKey?: unknown;
  children: ReactNode;
}) {
  usePageTitle(title);
  useReveal([revealKey]);
  return (
    <div className="paper min-h-screen bg-[var(--bg)] font-grotesk text-[var(--text)] antialiased">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="font-display text-lg font-semibold tracking-tight text-[var(--ink)]"
          >
            Andrew<span className="text-[var(--accent)]">.</span>
            {wordmark}
          </Link>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowLeft
              size={13}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Portfolio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6">{children}</main>

      <Footer />
    </div>
  );
}

/* ── Masthead ────────────────────────────────────────────────────── */

export type Fact = { label: string; value: ReactNode };

export function Masthead({
  eyebrow,
  title,
  lede,
  facts,
  live,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  facts: Fact[];
  /** Shows the "Interactive · seeded data" live marker. */
  live?: string;
}) {
  return (
    <section className="border-b border-[var(--border)] pb-10 pt-12 sm:pt-16">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={fieldLabel}>{eyebrow}</span>
        {live && (
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--accent)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            </span>
            {live}
          </span>
        )}
      </div>

      <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.25rem,5.5vw,4rem)] font-medium leading-[0.98] tracking-[-0.02em] text-[var(--ink)]">
        {title}
      </h1>

      <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-[var(--muted)] sm:text-lg">
        {lede}
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-[var(--bg)] px-4 py-4">
            <dt className={fieldLabel}>{f.label}</dt>
            <dd className="mt-1.5 font-display text-lg font-medium leading-tight text-[var(--ink)]">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── Tabs ────────────────────────────────────────────────────────── */

export type TabDef<T extends string> = { id: T; label: string; count?: number };

export function TabNav<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav className="sticky top-[57px] z-30 -mx-4 overflow-x-auto border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex min-w-max gap-7">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={on ? 'page' : undefined}
              className={cx(
                '-mb-px flex items-center gap-2 border-b-2 py-4 font-mono text-[11px] uppercase tracking-[0.13em] transition-colors',
                on
                  ? 'border-[var(--accent)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              )}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span
                  className={cx(
                    'inline-flex min-w-[1.25rem] justify-center px-1 py-0.5 text-[10px] tabular-nums',
                    on
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'bg-[var(--bg-soft)] text-[var(--muted)]'
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Surfaces ────────────────────────────────────────────────────── */

export function Panel({
  label,
  title,
  actions,
  className,
  bodyClassName,
  children,
}: {
  label?: string;
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const hasHead = label || title || actions;
  return (
    <section
      className={cx('border border-[var(--border)] bg-[var(--surface)]', className)}
    >
      {hasHead && (
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            {label && <p className={fieldLabel}>{label}</p>}
            {title && (
              <h2 className="mt-1 font-display text-xl font-medium leading-tight text-[var(--ink)]">
                {title}
              </h2>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Titled grouping with the editorial top-rule + mono label + serif head. */
export function Section({
  label,
  title,
  actions,
  className,
  children,
}: {
  label: string;
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cx('border-t border-[var(--border)] pt-8', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={fieldLabel}>{label}</p>
          <h2 className="mt-2 font-display text-[clamp(1.5rem,3vw,2rem)] font-medium leading-tight text-[var(--ink)]">
            {title}
          </h2>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/* ── Data bits ───────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className={fieldLabel}>{label}</p>
      <p className="mt-2 font-display text-3xl font-medium leading-none tracking-tight text-[var(--ink)]">
        {value}
      </p>
      {sub && (
        <p className={cx('mt-2 flex items-center gap-1.5 text-xs', TONE_TEXT[tone])}>
          {tone !== 'neutral' && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
          )}
          {sub}
        </p>
      )}
    </div>
  );
}

export function StatusTag({
  tone,
  children,
  dot = true,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium tracking-wide',
        TONE_FILL[tone]
      )}
    >
      {dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Flat bordered tag for stack items, metadata, etc. */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
      {children}
    </span>
  );
}

export function Meter({
  value,
  max = 100,
  tone = 'accent',
  className,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cx('h-1.5 w-full overflow-hidden bg-[var(--bg-soft)]', className)}>
      <div className={cx('h-full', TONE_BAR[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Controls ────────────────────────────────────────────────────── */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function AccentButton({ className, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ className, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
    >
      {children}
    </button>
  );
}
