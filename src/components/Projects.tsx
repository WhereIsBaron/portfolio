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

const fieldLabel = 'font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]/70';
const STEPS_PREVIEW = 3;

// Issue / Steps taken / Resolution blocks of a project "ticket".
function TicketFields({ ticket, isOwner }: { ticket: Ticket; isOwner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const steps = expanded ? ticket.steps : ticket.steps.slice(0, STEPS_PREVIEW);
  const hidden = ticket.steps.length - STEPS_PREVIEW;

  return (
    <>
      {ticket.issue ? (
        <div className="mt-4">
          <p className={fieldLabel}>Issue</p>
          <p className="mt-1.5 text-sm text-[var(--muted)]">{ticket.issue}</p>
        </div>
      ) : (
        isOwner && (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--accent)]/50 p-3">
            <p className={fieldLabel}>Issue</p>
            <p className="mt-1.5 text-xs text-[var(--accent)]">
              TODO: write the problem this project solved (<code>issue</code> in src/data/cv.ts).
              Hidden from visitors until filled in.
            </p>
          </div>
        )
      )}

      {ticket.steps.length > 0 && (
        <div className="mt-4">
          <p className={fieldLabel}>Steps taken</p>
          <ol className="mt-1.5 space-y-1.5">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2 text-xs text-[var(--muted)]">
                <span className="w-4 shrink-0 font-mono text-[var(--brand-bright)]">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--brand-bright)] hover:underline"
            >
              {expanded ? 'Show fewer steps' : `Show ${hidden} more step${hidden > 1 ? 's' : ''}`}
              <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      <div className="mt-4">
        <p className={fieldLabel}>Resolution</p>
        <p className="mt-1.5 text-sm text-[var(--muted)]">{ticket.resolution}</p>
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
    <section id="work" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal mb-14 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-bright)]">03</span>
          <span className="h-px w-12 bg-white/15" />
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            Projects & Practical Experience
          </span>
        </div>

        <div className="reveal mb-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-xl font-display text-4xl font-light leading-tight text-white sm:text-5xl">
            Things I’ve{' '}
            <span className="text-[var(--brand-bright)]">built & shipped.</span>
          </h2>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active === c
                    ? 'bg-white text-[#0b0d10]'
                    : 'border border-white/10 text-[var(--muted)] hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {user && (
          <div className="reveal mb-8 flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-bright)] px-3 py-1.5 font-medium text-[#0b0d10]">
              <Pencil size={14} /> Owner edit mode
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
              <GripVertical size={14} />
              Drag cards to reorder{active !== 'All' ? ' (switch to “All” first)' : ''}. Open a
              project to reorder its screenshots.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                  <div className="absolute -left-2 -top-2 z-20 rounded-full bg-[var(--brand-bright)] p-1.5 text-[#0b0d10] shadow-lg">
                    <GripVertical size={15} />
                  </div>
                )}

                <article className="reveal group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)] transition-colors hover:border-[var(--brand)]/40">
                  {hasGallery && (
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="relative aspect-video overflow-hidden border-b border-white/10 bg-black/30 text-left"
                      aria-label={`Open ${p.name} gallery`}
                    >
                      <img
                        src={imgs[0]}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium" style={{ color: 'white' }}>
                        <Images size={14} />
                        {imgs.length} photos
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#0b0d10] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          <Images size={15} /> View gallery
                        </span>
                      </span>
                    </button>
                  )}

                  {!hasGallery && hasRoute && (
                    <button
                      type="button"
                      onClick={() => navigate(p.route!)}
                      className="relative flex aspect-video items-center justify-center overflow-hidden border-b border-white/10 bg-gradient-to-br from-[var(--brand)]/25 to-[var(--accent)]/10 text-left"
                      aria-label={`Open ${p.name} demo`}
                    >
                      {p.wordmark ? (
                        <span className="font-display text-4xl font-semibold tracking-tight text-white transition-transform duration-500 group-hover:scale-110 sm:text-5xl">
                          Andrew<span className="text-[var(--brand-bright)]">.</span>
                          {p.wordmark}
                        </span>
                      ) : (
                        <CalendarCheck
                          size={44}
                          className="text-[var(--brand-bright)] transition-transform duration-500 group-hover:scale-110"
                        />
                      )}
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium" style={{ color: 'white' }}>
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Live demo
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#0b0d10] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          Open the demo <ArrowUpRight size={15} />
                        </span>
                      </span>
                    </button>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-3 font-mono text-xs">
                      <span className="text-[var(--muted)]">#{ticket.id}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${
                          ticket.status === 'Resolved'
                            ? 'ticket-resolved bg-emerald-500/15 text-emerald-400'
                            : 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        }`}
                      >
                        {ticket.status === 'Resolved' ? <CheckCircle2 size={13} /> : <CircleDot size={13} />}
                        {ticket.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[var(--brand-bright)]">
                        {categoryIcon[p.category]}
                        {p.category}
                      </span>
                      <span className="text-xs text-[var(--muted)]/70">{p.year}</span>
                    </div>

                    <h3 className="mt-3 font-display text-lg text-white">{p.name}</h3>

                    <TicketFields ticket={ticket} isOwner={Boolean(user)} />

                    <p className={`${fieldLabel} mt-auto pt-4`}>Stack</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {ticket.stack.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--muted)]"
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
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white transition-all hover:border-white/40 hover:bg-white hover:text-[#0b0d10]"
                            >
                              Visit site <ArrowUpRight size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelected(p)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white transition-all group-hover:border-white/40 group-hover:bg-white group-hover:text-[#0b0d10]"
                          >
                            <Images size={14} /> {imgs.length} images
                          </button>
                        </div>
                      ) : hasRoute ? (
                        <button
                          type="button"
                          onClick={() => navigate(p.route!)}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white transition-all group-hover:border-white/40 group-hover:bg-white group-hover:text-[#0b0d10]"
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
                            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white transition-all duration-300 group-hover:border-white/40 group-hover:bg-white group-hover:text-[#0b0d10]"
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
