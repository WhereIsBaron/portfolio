import { Link } from 'react-router-dom';

/**
 * Hero — a confident masthead (name set in the site's display face, the
 * same Fraunces used by the logo) over a band of facts: what Andrew
 * builds, availability, services, credentials and the ways to reach him.
 * The work itself lives in the Projects section below.
 */

const services = [
  'Full-stack web',
  'Mobile apps',
  'Databases & APIs',
  'Game development',
  'Automation & scripting',
  'UI / UX design',
];

const credentials = [
  'UN Coding4Integrity — Top 13 of 547',
  'BSc (Hons) Software Engineering',
  'MBA, Project Management (in progress)',
  '5+ languages shipped to production',
];

export default function Hero() {
  return (
    <section id="top" className="relative px-4 pt-28 pb-16 sm:px-5">
      {/* ── Masthead ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1600px]">
        <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.02em] text-[var(--ink)]">
          Andrew Langeveldt
        </h1>
        <p className="mt-4 max-w-[46ch] text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-snug text-[var(--muted)]">
          Junior Software Engineer &amp; Full-Stack Web / Mobile Developer.
        </p>
      </div>

      {/* ── Facts band ────────────────────────────────────────────── */}
      <div className="mx-auto mt-10 grid max-w-[1600px] grid-cols-2 gap-x-6 gap-y-8 border-t border-[var(--border)] pt-6 text-[15px] leading-snug sm:grid-cols-4 lg:grid-cols-12">
        <div className="col-span-2 lg:col-span-3">
          <p className="font-bold text-[var(--ink)]">What I build</p>
          <p className="mt-1 max-w-[24ch] text-[var(--muted)]">
            Production web &amp; mobile apps, end to end — shipped, not prototyped.
          </p>
        </div>

        <div className="col-span-2 lg:col-span-2">
          <p className="text-[var(--ink)]">
            <span className="mr-1.5 inline-block h-2 w-2 translate-y-[-1px] rounded-full bg-[var(--accent)]" />
            Available
          </p>
          <p className="mt-1 text-[var(--muted)]">Full-time &amp; freelance</p>
          <p className="text-[var(--muted)]">Gaborone, Botswana</p>
        </div>

        <div className="col-span-1 lg:col-span-3">
          <ul className="space-y-0.5 text-[var(--muted)]">
            {services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="col-span-1 lg:col-span-2">
          <ul className="space-y-0.5 text-[var(--muted)]">
            {credentials.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 flex flex-col items-start gap-1 lg:col-span-2 lg:items-end lg:text-right">
          <a
            href="https://github.com/WhereIsBaron"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/andrew-langeveldt-953789292/"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            LinkedIn
          </a>
          <Link
            to="/cv"
            className="text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            Curriculum vitae
          </Link>
          <a
            href="#contact"
            className="mt-1 bg-[var(--accent)] px-3 py-1.5 font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90"
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
}
