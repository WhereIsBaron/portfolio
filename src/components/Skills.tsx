import { skillGroups } from '@/data/cv';

export default function Skills() {
  return (
    <section id="skills" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal mb-14 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-bright)]">
            02
          </span>
          <span className="h-px w-12 bg-white/15" />
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            Capabilities
          </span>
        </div>

        <h2 className="reveal mb-14 max-w-2xl font-display text-4xl font-light leading-tight text-white sm:text-5xl">
          A toolkit spanning the whole build,{' '}
          <span className="text-[var(--brand-bright)]">idea to production.</span>
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skillGroups.map((group) => (
            <div
              key={group.category}
              className="reveal rounded-xl border border-white/10 bg-[var(--surface)] p-4 transition-colors hover:border-white/20"
            >
              <h3 className="font-display text-base text-white">
                {group.category}
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {group.items.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:border-white/25 hover:text-white"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="reveal mt-10 max-w-2xl text-sm text-[var(--muted)]">
          These are the languages, frameworks, and tools I’ve worked with so far — the
          list keeps growing as I take on new projects and expand my skillset.
        </p>
      </div>
    </section>
  );
}
