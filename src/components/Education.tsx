import { GraduationCap, BookOpen } from 'lucide-react';
import { education, coursework } from '@/data/cv';

export default function Education() {
  return (
    <section id="education" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal mb-14 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-bright)]">04</span>
          <span className="h-px w-12 bg-white/15" />
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            Education
          </span>
        </div>

        <h2 className="reveal mb-14 max-w-2xl font-display text-4xl font-light leading-tight text-white sm:text-5xl">
          Formal training in software engineering, multimedia,{' '}
          <span className="text-[var(--brand-bright)]">and project management.</span>
        </h2>

        {/* Degrees */}
        <div className="grid gap-6 sm:grid-cols-2">
          {education.map((ed) => {
            const inProgress = ed.status.toLowerCase().includes('progress');
            return (
              <div
                key={ed.degree}
                className="reveal rounded-3xl border border-white/10 bg-[var(--surface)] p-8"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)]/15 text-[var(--brand-bright)]">
                    <GraduationCap size={22} />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                      inProgress
                        ? 'border-[var(--brand-bright)]/30 bg-[var(--brand)]/10 text-[var(--brand-bright)]'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        inProgress ? 'animate-pulse bg-[var(--brand-bright)]' : 'bg-emerald-400'
                      }`}
                    />
                    {ed.status}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl leading-snug text-white">
                  {ed.degree}
                </h3>
                <p className="mt-3 text-[var(--muted)]">{ed.institution}</p>
                <p className="mt-1 text-sm text-[var(--muted)]/80">{ed.location}</p>
                <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-[var(--brand-bright)]">
                  {ed.period}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coursework */}
        <div className="reveal mt-6 rounded-3xl border border-white/10 bg-[var(--surface)] p-8">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-[var(--brand-bright)]" />
            <h3 className="font-display text-xl text-white">Academic & Technical Training</h3>
          </div>
          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {coursework.map((c) => (
              <li key={c} className="flex gap-3 text-sm text-[var(--muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-bright)]" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
