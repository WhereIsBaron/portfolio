import { ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { profile } from '@/data/cv';
import { useVisitCount } from '@/lib/useVisitCount';

export default function Footer() {
  const visits = useVisitCount();
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-white"
        >
          Andrew<span className="text-[var(--brand-bright)]">.</span>Langeveldt
        </a>

        <div className="flex items-center gap-6">
          {profile.socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--muted)] transition-colors hover:text-white"
            >
              {s.label}
            </a>
          ))}
          <Link
            to="/privacy"
            className="text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            Privacy
          </Link>
        </div>

        <a
          href="#top"
          className="group inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
        >
          Back to top
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 transition-colors group-hover:border-white/40">
            <ArrowUp size={14} />
          </span>
        </a>
      </div>
      <p className="mt-8 text-center text-xs text-[var(--muted)]/60">
        © {new Date().getFullYear()} {profile.name}. Designed & built with care.
      </p>
      {visits !== null && (
        <p
          className="mt-2 text-center text-xs text-[var(--muted)]/50"
          aria-live="polite"
        >
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand-bright)] align-middle" />
          {visits.toLocaleString()} site visits
        </p>
      )}
    </footer>
  );
}
