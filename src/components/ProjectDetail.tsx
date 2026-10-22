import { useEffect } from 'react';
import { X, Images, ArrowUpRight, CheckCircle2, CircleDot } from 'lucide-react';
import type { Project } from '@/data/cv';
import { toTicket } from '@/lib/ticket';

const fieldLabel = 'font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]';

interface Props {
  project: Project;
  isOwner: boolean;
  onClose: () => void;
  /** Open the full image gallery (multi-image grid + lightbox). */
  onOpenGallery?: () => void;
}

/**
 * Scrolling popup holding a project's full "ticket": issue, every step,
 * the complete resolution and stack. Cards stay compact; this is where the
 * long-form detail lives.
 */
export default function ProjectDetail({ project, isOwner, onClose, onOpenGallery }: Props) {
  const ticket = toTicket(project);
  const images = project.images ?? [];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div
          className="my-4 w-full max-w-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[var(--muted)]">#{ticket.id}</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 font-medium ${
                    ticket.status === 'Resolved'
                      ? 'ticket-resolved bg-emerald-500/15 text-emerald-600'
                      : 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  }`}
                >
                  {ticket.status === 'Resolved' ? <CheckCircle2 size={13} /> : <CircleDot size={13} />}
                  {ticket.status}
                </span>
                <span className="text-[var(--muted)]">{project.year}</span>
              </div>
              <h2 className="mt-2 font-display text-xl text-[var(--ink)]">{project.name}</h2>
              <p className={`${fieldLabel} mt-1`}>{project.category}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 text-[var(--muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--ink)]"
              aria-label="Close details"
            >
              <X size={22} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 p-5">
            {images.length > 0 && (
              <button
                type="button"
                onClick={onOpenGallery}
                className="group relative block w-full overflow-hidden border border-[var(--border)] bg-black/20"
                aria-label={`Open ${project.name} gallery`}
              >
                <img
                  src={images[0]}
                  alt={project.name}
                  className="max-h-[60vh] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)] opacity-0 transition-opacity group-hover:opacity-100">
                  <Images size={14} /> {images.length} {images.length === 1 ? 'image' : 'images'}
                </span>
              </button>
            )}

            {ticket.issue ? (
              <div>
                <p className={fieldLabel}>Issue</p>
                <p className="mt-1.5 text-sm text-[var(--muted)]">{ticket.issue}</p>
              </div>
            ) : (
              isOwner && (
                <div className="border border-dashed border-[var(--accent)] p-3">
                  <p className={fieldLabel}>Issue</p>
                  <p className="mt-1.5 text-xs text-[var(--accent)]">
                    TODO: write the problem this project solved (<code>issue</code> in src/data/cv.ts).
                    Hidden from visitors until filled in.
                  </p>
                </div>
              )
            )}

            {ticket.steps.length > 0 && (
              <div>
                <p className={fieldLabel}>Steps taken</p>
                <ol className="mt-1.5 space-y-1.5">
                  {ticket.steps.map((s, i) => (
                    <li key={s} className="flex gap-2 text-sm text-[var(--muted)]">
                      <span className="w-4 shrink-0 font-mono text-[var(--accent)]">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div>
              <p className={fieldLabel}>Resolution</p>
              <p className="mt-1.5 text-sm text-[var(--muted)]">{ticket.resolution}</p>
            </div>

            <div>
              <p className={fieldLabel}>Stack</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {ticket.stack.map((t) => (
                  <span
                    key={t}
                    className="border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {project.link && project.link !== '#' && (
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
              >
                Visit site <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
