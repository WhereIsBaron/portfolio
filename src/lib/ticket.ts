import { projects, type Project } from '@/data/cv';

export type Ticket = {
  id: string;
  status: NonNullable<Project['status']>;
  issue: string | null; // null until Andrew writes it — see the TODOs in cv.ts
  steps: string[];
  resolution: string;
  stack: string[];
};

// Ticket IDs come from the project's position in the source array (not the
// owner's drag order), so a project keeps the same ID however the grid is sorted.
const baseId = (p: Project) => {
  const index = projects.findIndex((x) => x.name === p.name);
  return `AL-${1001 + Math.max(index, 0)}`;
};

/** Maps a project onto the "resolved support ticket" shape. */
export function toTicket(p: Project): Ticket {
  return {
    id: p.ticketId ?? baseId(p),
    status: p.status ?? 'Resolved',
    issue: p.issue?.trim() ? p.issue : null,
    steps: p.highlights ?? [],
    resolution: p.resolution?.trim() ? p.resolution : p.description,
    stack: p.tags,
  };
}
