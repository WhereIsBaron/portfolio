import { GraduationCap, BookOpen } from 'lucide-react';
import { education, coursework } from '@/data/cv';

export default function Education() {
  return (
    <section id="education" className="relative px-4 py-24 sm:px-5">
      <div className="mx-auto max-w-[1600px] border-t border-[var(--border)] pt-6">
        <p className="reveal mb-12 text-[13px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Education
        </p>

        <h2 className="reveal mb-14 max-w-2xl font-display text-4xl font-medium leading-tight text-[var(--ink)] sm:text-5xl">
          Formal training in software engineering, multimedia, and project
          management.
        </h2>

        {/* Degrees */}
        <div className="grid gap-4 sm:grid-cols-2">
          {education.map((ed) => {
            const inProgress = ed.status.toLowerCase().includes('progress');
            return (
              <div
                key={ed.degree}
                className="reveal border border-[var(--border)] bg-[var(--surface)] p-8"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center bg-[var(--bg)] text-[var(--accent)]">
                    <GraduationCap size={22} />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 border px-3 py-1 text-xs ${
                      inProgress
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        inProgress ? 'animate-pulse bg-[var(--accent)]' : 'bg-emerald-500'
                      }`}
                    />
                    {ed.status}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl leading-snug text-[var(--ink)]">
                  {ed.degree}
                </h3>
                <p className="mt-3 text-[var(--muted)]">{ed.institution}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{ed.location}</p>
                <div className="mt-6 inline-flex border border-[var(--border)] bg-[var(--bg)] px-4 py-1.5 text-sm text-[var(--accent)]">
                  {ed.period}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coursework */}
        <div className="reveal mt-4 border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-[var(--accent)]" />
            <h3 className="font-display text-xl text-[var(--ink)]">Academic &amp; Technical Training</h3>
          </div>
          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {coursework.map((c) => (
              <li key={c} className="flex gap-3 text-sm text-[var(--muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
