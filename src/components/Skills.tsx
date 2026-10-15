import { skillGroups } from '@/data/cv';

export default function Skills() {
  return (
    <section id="skills" className="relative px-4 py-24 sm:px-5">
      <div className="mx-auto max-w-[1600px] border-t border-[var(--border)] pt-6">
        <p className="reveal mb-12 text-[13px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Capabilities
        </p>

        <h2 className="reveal mb-14 max-w-2xl font-display text-4xl font-medium leading-tight text-[var(--ink)] sm:text-5xl">
          A toolkit spanning the whole build, idea to production.
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {skillGroups.map((group) => (
            <div
              key={group.category}
              className="reveal border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]"
            >
              <h3 className="font-display text-base text-[var(--ink)]">
                {group.category}
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {group.items.map((skill) => (
                  <span
                    key={skill}
                    className="border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="reveal mt-10 max-w-2xl text-sm text-[var(--muted)]">
          These are the languages, frameworks, and tools I’ve worked with so
          far — the list keeps growing with each new project.
        </p>
      </div>
    </section>
  );
}
