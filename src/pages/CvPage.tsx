import { Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { profile, education, skillGroups, projects, coursework, references } from '@/data/cv';
import { usePageTitle } from '@/hooks/usePageTitle';

// A printable one-document CV generated from src/data/cv.ts, so it never
// drifts from the site. "Download PDF" uses the browser's Save as PDF.
// The sheet is styled as paper (fixed neutral colours) in both themes; print
// rules in index.css hide everything except `.cv-sheet`.

const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 border-b border-neutral-300 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800">
      {children}
    </h2>
  );
}

export default function CvPage() {
  usePageTitle('CV');
  const linkedin = profile.socials.find((s) => s.icon === 'linkedin');
  const github = profile.socials.find((s) => s.icon === 'github');
  const strip = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> Back to portfolio
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-bright)] px-4 py-2 text-sm font-medium text-[#0b0d10] transition-all hover:bg-white"
          >
            <Download size={15} /> Download PDF
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="cv-sheet rounded-lg bg-white px-5 py-7 text-[13px] leading-relaxed text-neutral-800 shadow-2xl sm:px-12 sm:py-12">
          <header>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-neutral-900">{profile.name}</h1>
            <p className="mt-1 font-medium text-teal-800">{profile.title}</p>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600">
              <span>{profile.location}</span>
              <a href={`mailto:${profile.email}`} className="hover:underline">{profile.email}</a>
              <span>{profile.phone}</span>
              {linkedin && <a href={linkedin.href} className="hover:underline">{strip(linkedin.href)}</a>}
              {github && <a href={github.href} className="hover:underline">{strip(github.href)}</a>}
              <span>{profile.license}</span>
            </p>
          </header>

          <section className="mt-6">
            <Heading>Profile</Heading>
            <p>{profile.tagline}</p>
          </section>

          <section className="mt-6">
            <Heading>Education</Heading>
            <div className="space-y-2">
              {education.map((e) => (
                <div key={e.degree} className="flex flex-col sm:flex-row sm:justify-between sm:gap-4">
                  <div>
                    <p className="font-semibold text-neutral-900">{e.degree}</p>
                    <p className="text-neutral-600">
                      {e.institution}, {e.location}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-neutral-500 sm:text-right">
                    {e.period} · {e.status}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              <span className="font-medium text-neutral-800">Coursework:</span> {coursework.join(' · ')}
            </p>
          </section>

          <section className="mt-6 cv-avoid-break">
            <Heading>Skills</Heading>
            <div className="space-y-1">
              {skillGroups.map((g) => (
                <p key={g.category}>
                  <span className="font-semibold text-neutral-900">{g.category}:</span> {g.items.join(', ')}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <Heading>Projects & Experience</Heading>
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.name} className="cv-avoid-break">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:gap-4">
                    <p className="font-semibold text-neutral-900">{p.name}</p>
                    <p className="shrink-0 text-xs text-neutral-500">
                      {p.category} · {p.year}
                    </p>
                  </div>
                  <p>{firstSentence(p.description)}</p>
                  <p className="text-xs text-neutral-500">{p.tags.join(' · ')}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 cv-avoid-break">
            <Heading>References</Heading>
            <div className="grid gap-2 sm:grid-cols-2">
              {references.map((r) => (
                <div key={r.name}>
                  <p className="font-semibold text-neutral-900">{r.name}</p>
                  <p className="text-neutral-600">{r.role}</p>
                  <p className="text-neutral-600">{r.contact}</p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
