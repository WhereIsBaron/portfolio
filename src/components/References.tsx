import { UserCheck, Phone } from 'lucide-react';
import { references } from '@/data/cv';

export default function References() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal mb-10 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-bright)]">
            05
          </span>
          <span className="h-px w-12 bg-white/15" />
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            References
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {references.map((r) => (
            <div
              key={r.name}
              className="reveal rounded-3xl border border-white/10 bg-[var(--surface)] p-7"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand)]/15 text-[var(--brand-bright)]">
                <UserCheck size={20} />
              </span>
              <h3 className="mt-5 font-display text-xl text-white">{r.name}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{r.role}</p>
              <a
                href={`tel:${r.contact.replace(/\s/g, '')}`}
                className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--brand-bright)]"
              >
                <Phone size={14} />
                {r.contact}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
