import { profile, stats, focusAreas } from '@/data/cv';
import AgeOrbit from '@/components/AgeOrbit';

export default function About() {
  return (
    <section id="about" className="relative px-4 py-24 sm:px-5">
      <div className="mx-auto max-w-[1600px] border-t border-[var(--border)] pt-6">
        <p className="reveal mb-12 text-[13px] uppercase tracking-[0.18em] text-[var(--muted)]">
          About
        </p>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="reveal font-display text-4xl font-medium leading-tight text-[var(--ink)] sm:text-5xl">
              I design, build, and ship software that goes into production.
            </h2>

            <div className="reveal mt-7 space-y-5 text-lg leading-relaxed text-[var(--muted)]">
              <p>
                I’m a Software Engineering honours graduate and full-stack
                developer. I design, build, and maintain websites, databases,
                mobile apps, custom scripts, games, and automation — and I care
                as much about clean UI and UX as about the logic underneath.
              </p>
              <p>
                On the production side I handle SEO, secure API keys,
                payment-gateway integration, and wiring up Firebase, analytics,
                and other data sources. I work well independently and pay close
                attention to the details that separate a demo from a finished
                product.
              </p>
              <p>
                I do some of my best work under pressure — at national and
                international hackathons, including a Top 13 finish out of 547
                teams at the United Nations Coding4Integrity Hackathon.
              </p>
            </div>

            <div className="reveal mt-8 flex flex-wrap gap-2">
              {focusAreas.map((t) => (
                <span
                  key={t}
                  className="border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--muted)]"
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
                className="h-40 w-40 rounded-full border border-[var(--border)] object-cover"
              />
            </div>
            <div className="reveal grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--accent)]"
                >
                  <p className="font-display text-3xl font-medium text-[var(--ink)]">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="reveal mt-3 border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="text-sm text-[var(--muted)]">Currently</p>
              <p className="mt-2 text-lg text-[var(--ink)]">
                BSc (Hons) Software Engineering graduate
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Reach me at{' '}
                <a
                  href={`mailto:${profile.email}`}
                  className="text-[var(--accent)] underline-offset-4 hover:underline"
                >
                  {profile.email}
                </a>
              </p>
            </div>

            <AgeOrbit />
          </div>
        </div>
      </div>
    </section>
  );
}
