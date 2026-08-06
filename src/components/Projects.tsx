import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  Cpu,
  Code2,
  Blocks,
  Terminal,
  Gamepad2,
  Images,
  GripVertical,
  Pencil,
  CalendarCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projects as allProjects, type Project } from '@/data/cv';
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
};

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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((p, index) => {
            const imgs = p.images ?? [];
            const hasGallery = imgs.length > 0;
            const hasRoute = Boolean(p.route);
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

                <article className="reveal group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[var(--surface)] transition-colors hover:border-[var(--brand)]/40">
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
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
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
                      <CalendarCheck
                        size={44}
                        className="text-[var(--brand-bright)] transition-transform duration-500 group-hover:scale-110"
                      />
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Live demo
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#0b0d10] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          Open the demo <ArrowUpRight size={15} />
                        </span>
                      </span>
                    </button>
                  )}

                  <div className="flex flex-1 flex-col p-7">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[var(--brand-bright)]">
                        {categoryIcon[p.category]}
                        {p.category}
                      </span>
                      <span className="text-xs text-[var(--muted)]/70">{p.year}</span>
                    </div>

                    <h3 className="mt-5 font-display text-2xl text-white">{p.name}</h3>
                    <p className="mt-3 text-[var(--muted)]">{p.description}</p>

                    {p.highlights && (
                      <ul className="mt-5 space-y-2">
                        {p.highlights.map((h) => (
                          <li key={h} className="flex gap-2 text-sm text-[var(--muted)]">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-bright)]" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--muted)]"
                        >
                          {t}
                        </span>
                      ))}
                      {hasGallery ? (
                        <button
                          type="button"
                          onClick={() => setSelected(p)}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white transition-all group-hover:border-white/40 group-hover:bg-white group-hover:text-[#0b0d10]"
                        >
                          <Images size={14} /> {imgs.length} images
                        </button>
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
