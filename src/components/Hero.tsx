import { useState } from 'react';
import { Link } from 'react-router-dom';
import { projects } from '@/data/cv';

/**
 * Contact-sheet hero (direction: "The contact sheet", seed 929611170).
 * A plain text band at one small size, then a wall of the real interfaces
 * Andrew has shipped, grouped into runs by project. Pointing at a run
 * focuses it and dims the rest — the work is the navigation.
 */

// One-line descriptions shown when a run is focused.
const blurb: Record<string, string> = {
  limkonnect: 'University community platform — React + Firebase, trust-based access, moderated forums.',
  'bhc-mobile-app': 'Flutter + Laravel mobile app, built at the Botswana Housing Corporation hackathon.',
  scripts: 'Torn userscripts (BUSTR, FLIPR, MUGSHOT) — rate-limited API tooling, single-key security.',
  'the-dying-forge': 'Blacksmith crafting & management game, built in Godot 4 with C#.',
};

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

const sheet = projects.filter((p) => p.images && p.images.length > 0);

export default function Hero() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section id="top" className="relative px-4 pt-24 pb-16 sm:px-5">
      {/* ── Text band ─────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-6 gap-y-8 border-t border-[var(--border)] pt-6 text-[15px] leading-snug sm:grid-cols-4 lg:grid-cols-12">
        <div className="col-span-2 lg:col-span-3">
          <p className="font-bold text-[var(--ink)]">Andrew Langeveldt</p>
          <p className="mt-1 max-w-[22ch] text-[var(--muted)]">
            Junior software engineer &amp; full-stack web / mobile developer.
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

      {/* ── The sheet ─────────────────────────────────────────────── */}
      <div className="mx-auto mt-12 max-w-[1600px] text-[13px]">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[var(--muted)]">Selected work — {sheet.length} projects, {sheet.reduce((n, p) => n + (p.images?.length ?? 0), 0)} frames</p>
          <p className="h-4 text-[var(--ink)] transition-opacity">
            {active ? blurb[active] : <span className="text-[var(--muted)]">Point at a project to read what it is.</span>}
          </p>
        </div>

        <div className="space-y-6">
          {sheet.map((p) => {
            const slug = p.slug!;
            const dim = active && active !== slug;
            return (
              <div
                key={slug}
                onMouseEnter={() => setActive(slug)}
                onMouseLeave={() => setActive(null)}
                className={`transition-opacity duration-200 ${dim ? 'opacity-30' : 'opacity-100'}`}
              >
                <p className="mb-1.5 font-medium text-[var(--ink)]">
                  {p.name} <span className="text-[var(--muted)]">· {p.year}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {p.images!.map((src, i) => (
                    <a
                      key={src}
                      href={p.link && p.link !== '#' ? p.link : undefined}
                      target={p.link && p.link !== '#' ? '_blank' : undefined}
                      rel="noreferrer"
                      className="block h-[132px] overflow-hidden bg-[var(--surface)]"
                    >
                      <img
                        src={src}
                        alt={`${p.name} screenshot ${i + 1}`}
                        loading="lazy"
                        className="h-[132px] w-auto max-w-none object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
