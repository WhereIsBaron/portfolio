import { ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { profile } from '@/data/cv';
import { useVisitCount } from '@/lib/useVisitCount';

export default function Footer({ compact = false }: { compact?: boolean }) {
  const visits = useVisitCount();
  return (
    <footer className={`border-t border-[var(--border)] px-4 sm:px-5 ${compact ? 'py-3' : 'py-12'}`}>
      <div className={`mx-auto flex max-w-[1600px] flex-col items-center justify-between sm:flex-row ${compact ? 'gap-3' : 'gap-6'}`}>
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-[var(--ink)]"
        >
          Andrew<span className="text-[var(--accent)]">.</span>Langeveldt
        </a>

        <div className="flex items-center gap-6">
          {profile.socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              {s.label}
            </a>
          ))}
          <Link
            to="/privacy"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            Privacy
          </Link>
        </div>

        <a
          href="#top"
          className="group inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
        >
          Back to top
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] transition-colors group-hover:border-[var(--accent)]">
            <ArrowUp size={14} />
          </span>
        </a>
      </div>
      {compact ? (
        <p className="mt-3 text-center text-[11px] text-[var(--muted)]" aria-live="polite">
          © {new Date().getFullYear()} {profile.name}.
          {visits !== null && (
            <>
              {' · '}
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] align-middle" />
              {visits.toLocaleString()} visits
            </>
          )}
        </p>
      ) : (
        <>
          <p className="mt-8 text-center text-xs text-[var(--muted)]">
            © {new Date().getFullYear()} {profile.name}. Built and maintained by Andrew.
          </p>
          {visits !== null && (
            <p
              className="mt-2 text-center text-xs text-[var(--muted)]"
              aria-live="polite"
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] align-middle" />
              {visits.toLocaleString()} site visits
            </p>
          )}
        </>
      )}
    </footer>
  );
}
