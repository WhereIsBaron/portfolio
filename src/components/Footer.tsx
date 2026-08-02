import { ArrowUp } from 'lucide-react';
import { profile } from '@/data/cv';

export default function Footer() {
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
    </footer>
  );
}
