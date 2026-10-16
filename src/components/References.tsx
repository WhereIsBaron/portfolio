import { UserCheck, Phone } from 'lucide-react';
import { references } from '@/data/cv';

export default function References() {
  return (
    <section className="relative px-4 py-20 sm:px-5">
      <div className="mx-auto max-w-[1600px] border-t border-[var(--border)] pt-6">
        <p className="reveal mb-10 text-[13px] uppercase tracking-[0.18em] text-[var(--muted)]">
          References
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {references.map((r) => (
            <div
              key={r.name}
              className="reveal border border-[var(--border)] bg-[var(--surface)] p-7"
            >
              <span className="flex h-11 w-11 items-center justify-center bg-[var(--bg)] text-[var(--accent)]">
                <UserCheck size={20} />
              </span>
              <h3 className="mt-5 font-display text-xl text-[var(--ink)]">{r.name}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{r.role}</p>
              <a
                href={`tel:${r.contact.replace(/\s/g, '')}`}
                className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
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
