import { profile, stats, focusAreas } from '@/data/cv';

export default function About() {
  return (
    <section id="about" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal mb-14 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-bright)]">
            01
          </span>
          <span className="h-px w-12 bg-white/15" />
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            About
          </span>
        </div>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="reveal font-display text-4xl font-light leading-tight text-white sm:text-5xl">
              I turn complex challenges into
              <span className="text-[var(--brand-bright)]">
                {' '}
                clean, functional solutions.
              </span>
            </h2>

            <div className="reveal mt-7 space-y-5 text-lg leading-relaxed text-[var(--muted)]">
              <p>
                I’m a Software Engineering honours graduate and full-stack
                developer. I design, build, and maintain websites, databases,
                mobile apps and platforms, custom scripts, games, and automation
                solutions, and I care as much about clean UI and UX as I do about
                the logic underneath.
              </p>
              <p>
                I’m just as comfortable with the production details: optimising
                for SEO, wiring up and securing API keys, integrating payment
                gateways, and connecting Firebase, analytics, and other data
                sources. I work well on my own, bring a problem-solving mindset to
                whatever lands on my desk, and pay close attention to the small
                details that make software feel finished.
              </p>
              <p>
                I also thrive in fast-paced, hands-on environments like national
                and international hackathons, including a Top 13 finish out of 547
                teams at the United Nations Coding4Integrity Hackathon.
              </p>
            </div>

            <div className="reveal mt-8 flex flex-wrap gap-3">
              {focusAreas.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-[var(--muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="reveal mb-6 flex justify-center">
              <img
                src={profile.photo}
                alt={profile.name}
                className="h-40 w-40 rounded-full border border-white/10 object-cover shadow-lg"
              />
            </div>
            <div className="reveal grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="group rounded-2xl border border-white/10 bg-[var(--surface)] p-6 transition-colors hover:border-[var(--brand)]/40"
                >
                  <p className="font-display text-3xl font-light text-white transition-colors group-hover:text-[var(--brand-bright)]">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="reveal mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--surface)] to-transparent p-6">
              <p className="text-sm text-[var(--muted)]">Currently</p>
              <p className="mt-2 text-lg text-white">
                BSc (Hons) Software Engineering graduate
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Reach me at{' '}
                <a
                  href={`mailto:${profile.email}`}
                  className="text-[var(--brand-bright)] underline-offset-4 hover:underline"
                >
                  {profile.email}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
