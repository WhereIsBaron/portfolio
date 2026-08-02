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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {skillGroups.map((group) => (
            <div
              key={group.category}
              className="reveal rounded-2xl border border-white/10 bg-[var(--surface)] p-6 transition-colors hover:border-white/20"
            >
              <h3 className="font-display text-xl text-white">
                {group.category}
              </h3>
              <div className="mt-6 space-y-4">
                {group.items.map((skill) => (
                  <div key={skill.name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">{skill.name}</span>
                      <span className="text-xs text-[var(--muted)]/70">
                        {skill.level}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-bright)] transition-[width] duration-1000 ease-out"
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
