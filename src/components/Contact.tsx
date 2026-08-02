import { Mail, MapPin, Phone, Github, Linkedin, ArrowUpRight } from 'lucide-react';
import { profile } from '@/data/cv';

const socialIcon: Record<string, React.ReactNode> = {
  github: <Github size={18} />,
  linkedin: <Linkedin size={18} />,
};

export default function Contact() {
  const details = [
    {
      icon: <Mail size={22} className="text-[var(--brand-bright)]" />,
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
    },
    {
      icon: <Phone size={22} className="text-[var(--brand-bright)]" />,
      label: 'Phone',
      value: profile.phone,
      href: `tel:${profile.phone.replace(/\s+/g, '')}`,
    },
    {
      icon: <MapPin size={22} className="text-[var(--brand-bright)]" />,
      label: 'Location',
      value: profile.location,
      href: null as string | null,
    },
  ];

  return (
    <section id="contact" className="relative py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="reveal mb-14 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-bright)]">06</span>
          <span className="h-px w-12 bg-white/15" />
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Contact</span>
        </div>

        <h2 className="reveal max-w-2xl font-display text-4xl font-light leading-tight text-white sm:text-5xl">
          Let’s build something{' '}
          <span className="text-[var(--brand-bright)]">that works.</span>
        </h2>
        <p className="reveal mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
          Have a role or project in mind? Email is the quickest way to reach me, and I reply within
          two business days.
        </p>

        {/* Contact details, front and centre */}
        <div className="reveal mt-12 grid gap-4 sm:grid-cols-3">
          {details.map((d) => {
            const inner = (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[var(--bg-soft)] transition-colors group-hover:border-[var(--brand-bright)]/40">
                  {d.icon}
                </span>
                <span className="mt-4 block text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {d.label}
                </span>
                <span className="mt-1 block break-words text-lg font-medium text-white">
                  {d.value}
                </span>
              </>
            );
            return d.href ? (
              <a
                key={d.label}
                href={d.href}
                className="group rounded-2xl border border-white/10 bg-[var(--surface)] p-6 transition-colors hover:border-[var(--brand)]/40"
              >
                {inner}
              </a>
            ) : (
              <div
                key={d.label}
                className="group rounded-2xl border border-white/10 bg-[var(--surface)] p-6"
              >
                {inner}
              </div>
            );
          })}
        </div>

        {/* Primary email action + socials */}
        <div className="reveal mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={`mailto:${profile.email}`}
            className="group inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-bright)] px-6 py-3 text-sm font-medium text-[#0b0d10] transition-all hover:bg-white"
          >
            <Mail size={16} />
            Email me
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
          <div className="flex flex-wrap items-center gap-3">
            {profile.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:border-white/40 hover:text-white"
              >
                {socialIcon[s.icon]}
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
