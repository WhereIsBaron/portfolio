import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import type { Project } from '@/data/cv';
import { useLayout } from '@/context/LayoutContext';
import { useAuth } from '@/context/AuthContext';
import { applyStringOrder, reorder } from '@/lib/reorder';

interface Props {
  project: Project;
  onClose: () => void;
}

export default function ProjectGallery({ project, onClose }: Props) {
  const { user } = useAuth();
  const { imageOrder, saveImageOrder } = useLayout();
  const canEdit = Boolean(user);
  const slug = project.slug ?? project.name;

  const ordered = useMemo(
    () => applyStringOrder(project.images ?? [], imageOrder[slug]),
    [project.images, slug, imageOrder]
  );

  const [items, setItems] = useState<string[]>(ordered);
  useEffect(() => setItems(ordered), [ordered]);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const dragIndex = useRef<number | null>(null);
  const didDrag = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox !== null) setLightbox(null);
        else onClose();
      }
      if (lightbox !== null) {
        if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? i : (i + 1) % items.length));
        if (e.key === 'ArrowLeft')
          setLightbox((i) => (i === null ? i : (i - 1 + items.length) % items.length));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, items.length, onClose]);

  const handleDrop = (to: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === to) return;
    const next = reorder(items, from, to);
    setItems(next);
    saveImageOrder(slug, next);
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex min-h-full items-start justify-center p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="my-4 w-full max-w-6xl rounded-3xl border border-white/10 bg-[var(--surface)] shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-3xl border-b border-white/10 bg-[var(--surface)] p-5">
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl text-white">{project.name}</h2>
              <p className="text-sm text-[var(--muted)]">
                {items.length} {items.length === 1 ? 'image' : 'images'}
                {canEdit ? ' • drag to re-arrange' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Close gallery"
            >
              <X size={22} />
            </button>
          </div>

          {canEdit && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-2 text-sm text-[var(--brand-bright)]">
              <GripVertical size={16} />
              Edit mode: drag any image to reorder. Your order is saved for everyone.
            </div>
          )}

          {/* Thumbnail grid */}
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((src, index) => (
              <button
                key={src}
                type="button"
                draggable={canEdit}
                onDragStart={() => {
                  dragIndex.current = index;
                  didDrag.current = true;
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => setTimeout(() => (didDrag.current = false), 0)}
                onClick={() => {
                  if (didDrag.current) return;
                  setLightbox(index);
                }}
                className={`group relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-bright)] ${
                  canEdit ? 'cursor-move' : 'cursor-zoom-in'
                }`}
                title={canEdit ? 'Drag to reorder, click to view' : 'Click to view'}
              >
                <img
                  src={src}
                  alt={`${project.name} screenshot ${index + 1}`}
                  loading="lazy"
                  className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {canEdit && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/70 p-1 text-white/90 shadow">
                    <GripVertical size={14} />
                  </span>
                )}
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(null);
          }}
        >
          <button
            className="absolute right-4 top-4 p-2 text-white/80 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            aria-label="Close image"
          >
            <X size={28} />
          </button>
          <button
            className="absolute left-3 p-2 text-white/80 hover:text-white sm:left-6"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => (i === null ? i : (i - 1 + items.length) % items.length));
            }}
            aria-label="Previous image"
          >
            <ChevronLeft size={40} />
          </button>

          <figure
            className="flex max-h-[88vh] max-w-[92vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={items[lightbox]}
              alt={`${project.name} screenshot ${lightbox + 1}`}
              className="max-h-[80vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            />
            <figcaption className="mt-3 text-sm text-white/70">
              {lightbox + 1} / {items.length}
            </figcaption>
          </figure>

          <button
            className="absolute right-3 p-2 text-white/80 hover:text-white sm:right-6"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => (i === null ? i : (i + 1) % items.length));
            }}
            aria-label="Next image"
          >
            <ChevronRight size={40} />
          </button>
        </div>
      )}
    </div>
  );
}
