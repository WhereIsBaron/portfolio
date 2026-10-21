import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  Cpu,
  Code2,
  Blocks,
  Terminal,
  Gamepad2,
  Users,
  Images,
  GripVertical,
  Pencil,
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projects as allProjects, type Project } from '@/data/cv';
import { toTicket, type Ticket } from '@/lib/ticket';
import { useReveal } from '@/hooks/useReveal';
import { useAuth } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';
import { applyOrder, reorder } from '@/lib/reorder';
import ProjectGallery from '@/components/ProjectGallery';

const categories = ['All', ...Array.from(new Set(allProjects.map((p) => p.category)))];

const categoryIcon: Record<string, React.ReactNode> = {
  'Final Year Project': <Code2 size={16} />,
  Hackathon: <Award size={16} />,
  Hardware: <Cpu size={16} />,
  Web3: <Blocks size={16} />,
  Tooling: <Terminal size={16} />,
  'Game Dev': <Gamepad2 size={16} />,
  Product: <CalendarCheck size={16} />,
  'Community Platform': <Users size={16} />,
};

const fieldLabel = 'font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]';
const STEPS_PREVIEW = 2;

// Issue / Steps taken / Resolution blocks of a project "ticket".
function TicketFields({ ticket, isOwner }: { ticket: Ticket; isOwner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const steps = expanded ? ticket.steps : ticket.steps.slice(0, STEPS_PREVIEW);
  const hidden = ticket.steps.length - STEPS_PREVIEW;

  // Resolution starts clamped to a few lines; the toggle only shows when the
  // text is actually long enough to overflow, measured once after first paint.
  const [resOpen, setResOpen] = useState(false);
  const [resClamped, setResClamped] = useState(false);
  const resRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = resRef.current;
    if (el) setResClamped(el.scrollHeight > el.clientHeight + 1);
  }, [ticket.resolution]);

  return (
    <>
      {ticket.issue ? (
        <div className="mt-3">
          <p className={fieldLabel}>Issue</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{ticket.issue}</p>
        </div>
      ) : (
        isOwner && (
          <div className="mt-4 border border-dashed border-[var(--accent)] p-3">
            <p className={fieldLabel}>Issue</p>
            <p className="mt-1.5 text-xs text-[var(--accent)]">
              TODO: write the problem this project solved (<code>issue</code> in src/data/cv.ts).
              Hidden from visitors until filled in.
            </p>
          </div>
        )
      )}

      {ticket.steps.length > 0 && (
        <div className="mt-3">
          <p className={fieldLabel}>Steps taken</p>
          <ol className="mt-1 space-y-1">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2 text-xs text-[var(--muted)]">
                <span className="w-4 shrink-0 font-mono text-[var(--accent)]">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
            >
              {expanded ? 'Show fewer steps' : `Show ${hidden} more step${hidden > 1 ? 's' : ''}`}
              <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      <div className="mt-3">
        <p className={fieldLabel}>Resolution</p>
        <p
          ref={resRef}
          className={`mt-1 text-sm text-[var(--muted)] ${resOpen ? '' : 'line-clamp-3'}`}
        >
          {ticket.resolution}
        </p>
        {resClamped && (
          <button
            type="button"
            onClick={() => setResOpen((v) => !v)}
            aria-expanded={resOpen}
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            {resOpen ? 'Show less' : 'Show more'}
            <ChevronDown size={14} className={`transition-transform ${resOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </>
  );
}

export default function Projects() {
  const [active, setActive] = useState('All');
  const [selected, setSelected] = useState<Project | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();
  const { projectOrder, saveProjectOrder } = useLayout();

  const ordered = useMemo(
    () => applyOrder(allProjects, projectOrder, (p) => p.name),
    [projectOrder]
  );
  const [items, setItems] = useState<Project[]>(ordered);
  useEffect(() => setItems(ordered), [ordered]);

  const dragIndex = useRef<number | null>(null);
  const canReorder = Boolean(user) && active === 'All';

  const filtered = useMemo(
    () => (active === 'All' ? items : items.filter((p) => p.category === active)),
    [active, items]
  );

  useReveal([active, items.length]);

  const handleDrop = (to: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === to) return;
    const next = reorder(items, from, to);
    setItems(next);
    saveProjectOrder(next.map((p) => p.name));
  };

  return (
    <section id="work" className="relative px-4 py-24 sm:px-5">
      <div className="mx-auto max-w-6xl border-t border-[var(--border)] pt-6">
        <p className="reveal mb-12 text-[13px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Projects &amp; Practical Experience
        </p>

        <div className="reveal mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-xl font-display text-4xl font-medium leading-tight text-[var(--ink)] sm:text-5xl">
            Things I’ve built &amp; shipped.
          </h2>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`px-4 py-1.5 text-sm transition-colors ${
                  active === c
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {user && (
          <div className="reveal mb-8 flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
            <span className="inline-flex w-fit items-center gap-2 bg-[var(--accent)] px-3 py-1.5 font-medium text-[var(--accent-ink)]">
              <Pencil size={14} /> Owner edit mode
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
              <GripVertical size={14} />
              Drag cards to reorder{active !== 'All' ? ' (switch to “All” first)' : ''}. Open a
              project to reorder its screenshots.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, index) => {
            const imgs = p.images ?? [];
            const hasGallery = imgs.length > 0;
            const hasRoute = Boolean(p.route);
            const ticket = toTicket(p);
            return (
              <div
                key={p.name}
                draggable={canReorder}
                onDragStart={() => (dragIndex.current = index)}
                onDragOver={(e) => canReorder && e.preventDefault()}
                onDrop={() => canReorder && handleDrop(index)}
                className={`relative ${canReorder ? 'cursor-move' : ''}`}
              >
                {canReorder && (
                  <div className="absolute -left-2 -top-2 z-20 bg-[var(--accent)] p-1.5 text-[var(--accent-ink)]">
                    <GripVertical size={15} />
                  </div>
                )}

                <article className="reveal group flex h-full flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]">
                  {hasGallery && (
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="relative aspect-[2/1] overflow-hidden border-b border-[var(--border)] bg-black/20 text-left"
                      aria-label={`Open ${p.name} gallery`}
                    >
                      <img
                        src={imgs[0]}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
                        <Images size={14} />
                        {imgs.length} photos
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <span className="inline-flex items-center gap-2 bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] opacity-0 transition-opacity group-hover:opacity-100">
                          <Images size={15} /> View gallery
                        </span>
                      </span>
                    </button>
                  )}

                  {!hasGallery && hasRoute && (
                    <button
                      type="button"
                      onClick={() => navigate(p.route!)}
                      className="relative flex aspect-[2/1] items-center justify-center overflow-hidden border-b border-[var(--border)] bg-[var(--bg)] text-left"
                      aria-label={`Open ${p.name} demo`}
                    >
                      {p.wordmark ? (
                        <span className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] transition-transform duration-500 group-hover:scale-110 sm:text-5xl">
                          Andrew<span className="text-[var(--accent)]">.</span>
                          {p.wordmark}
                        </span>
                      ) : (
                        <CalendarCheck
                          size={44}
                          className="text-[var(--accent)] transition-transform duration-500 group-hover:scale-110"
                        />
                      )}
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-ink)]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-ink)]" /> Live demo
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                        <span className="inline-flex items-center gap-2 bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] opacity-0 transition-opacity group-hover:opacity-100">
                          Open the demo <ArrowUpRight size={15} />
                        </span>
                      </span>
                    </button>
                  )}

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-3 font-mono text-xs">
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
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--accent)]">
                        {categoryIcon[p.category]}
                        {p.category}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{p.year}</span>
                    </div>

                    <h3 className="mt-2.5 font-display text-base text-[var(--ink)]">{p.name}</h3>

                    <TicketFields ticket={ticket} isOwner={Boolean(user)} />

                    <p className={`${fieldLabel} mt-auto pt-3`}>Stack</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {ticket.stack.map((t) => (
                        <span
                          key={t}
                          className="border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]"
                        >
                          {t}
                        </span>
                      ))}
                      {hasGallery ? (
                        <div className="ml-auto flex items-center gap-2">
                          {p.link && p.link !== '#' && (
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                            >
                              Visit site <ArrowUpRight size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelected(p)}
                            className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink)] transition-all group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)]"
                          >
                            <Images size={14} /> {imgs.length} images
                          </button>
                        </div>
                      ) : hasRoute ? (
                        <button
                          type="button"
                          onClick={() => navigate(p.route!)}
                          className="ml-auto inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink)] transition-all group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)]"
                        >
                          Open the demo <ArrowUpRight size={14} />
                        </button>
                      ) : (
                        p.link &&
                        p.link !== '#' && (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] text-[var(--ink)] transition-all duration-300 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)]"
                            aria-label={`View ${p.name}`}
                          >
                            <ArrowUpRight size={15} />
                          </a>
                        )
                      )}
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {selected && <ProjectGallery project={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
