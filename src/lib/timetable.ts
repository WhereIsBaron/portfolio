// Domain types and pure business logic for the timetable scheduling system.
// TypeScript port of the PHP ConflictDetector / TimeRange / Session architecture.
// No side effects — all functions are pure and suitable for synchronous UI use.

// ── Types ─────────────────────────────────────────────────────────────────────

export type TRoom = {
  id: number;
  name: string;
  type: 'lecture' | 'lab' | 'studio' | 'seminar';
  capacity: number;
  floor: string;
};

export type TCohort = {
  id: number;
  code: string;
  title: string;
  faculty: string;
  year: number;
  level: string;
};

export type TLecturer = {
  id: number;
  name: string;
  faculty: string;
  email: string;
};

export type TSession = {
  id: number;
  day_of_week: number;   // 1 = Mon … 5 = Fri
  start_min: number;     // minutes from midnight (480 = 08:00)
  duration_min: number;  // 60 | 90 | 120 | 180
  room_id: number | null;
  cohort_id: number;
  lecturer_id: number | null;
  module_code: string;
  module_title: string;
  deleted: boolean;
};

export type ConflictType = 'room' | 'lecturer' | 'cohort';

export type TConflict = {
  type: ConflictType;
  day: number;
  sharedKey: number;   // the doubled resource id
  sessionIds: number[];
};

// ── Grid constants ─────────────────────────────────────────────────────────────

export const GRID_START   = 480;   // 08:00 in minutes
export const GRID_END     = 960;   // 16:00 in minutes
export const SLOT_MIN     = 30;    // grid resolution
export const SLOT_PX      = 40;    // pixels per 30-min slot
export const GRID_H       = ((GRID_END - GRID_START) / SLOT_MIN) * SLOT_PX; // 640px

export const DAYS        = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const DAY_SHORT   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const DURATIONS   = [60, 90, 120, 180] as const;
export const ALLOWED_STARTS = Array.from(
  { length: (GRID_END - GRID_START) / SLOT_MIN },
  (_, i) => GRID_START + i * SLOT_MIN,
);

// ── Time helpers ───────────────────────────────────────────────────────────────

export function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function timeLabel(start: number, dur: number): string {
  return `${hhmm(start)} – ${hhmm(start + dur)}`;
}

export function minToTop(min: number): number {
  return ((min - GRID_START) / SLOT_MIN) * SLOT_PX;
}

export function durToHeight(dur: number): number {
  return (dur / SLOT_MIN) * SLOT_PX;
}

// ── Conflict detection ────────────────────────────────────────────────────────
// Port of ConflictDetector.php. Same sweep-cluster algorithm.
// Runs in O(n log n) per dimension; n is typically <300 so it's instant.

export function detectConflicts(sessions: TSession[]): TConflict[] {
  const active = sessions.filter(s => !s.deleted);
  const conflicts: TConflict[] = [];

  const dims: Array<{ type: ConflictType; key: (s: TSession) => number | null }> = [
    { type: 'room',     key: s => s.room_id },
    { type: 'lecturer', key: s => s.lecturer_id },
    { type: 'cohort',   key: s => s.cohort_id },
  ];

  for (const { type, key } of dims) {
    const buckets = new Map<string, TSession[]>();
    for (const s of active) {
      const k = key(s);
      if (k == null || k <= 0) continue;
      const bk = `${s.day_of_week}-${k}`;
      const arr = buckets.get(bk) ?? [];
      arr.push(s);
      buckets.set(bk, arr);
    }

    for (const [bk, bucket] of buckets) {
      const [dayStr, keyStr] = bk.split('-');
      const day = Number(dayStr);
      const sharedKey = Number(keyStr);
      const sorted = [...bucket].sort((a, b) => a.start_min - b.start_min);

      let clusterEnd = -1;
      let cluster: TSession[] = [];

      const flush = () => {
        if (cluster.length >= 2) {
          conflicts.push({
            type, day, sharedKey,
            sessionIds: [...new Set(cluster.map(s => s.id))].sort((a, b) => a - b),
          });
        }
        cluster = [];
        clusterEnd = -1;
      };

      for (const s of sorted) {
        if (s.start_min < clusterEnd) {
          cluster.push(s);
          clusterEnd = Math.max(clusterEnd, s.start_min + s.duration_min);
        } else {
          flush();
          cluster = [s];
          clusterEnd = s.start_min + s.duration_min;
        }
      }
      flush();
    }
  }

  return conflicts;
}

// Compute which conflict types a single session is involved in.
export function sessionConflictTypes(id: number, conflicts: TConflict[]): ConflictType[] {
  return [...new Set(conflicts.filter(c => c.sessionIds.includes(id)).map(c => c.type))];
}

// ── Lane packing ──────────────────────────────────────────────────────────────
// Greedy: overlapping sessions within a day get assigned to adjacent lanes
// so they render side-by-side without overlap.

export type LanedSession = TSession & { lane: number; totalLanes: number };

export function packLanes(sessions: TSession[]): LanedSession[] {
  if (!sessions.length) return [];
  const sorted = [...sessions].sort((a, b) => a.start_min - b.start_min);
  const laneEnds: number[] = [];
  const lanes: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    let lane = laneEnds.findIndex(e => e <= s.start_min);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = s.start_min + s.duration_min;
    lanes[i] = lane;
  }

  const total = laneEnds.length;
  return sorted.map((s, i) => ({ ...s, lane: lanes[i], totalLanes: total }));
}

// ── Faculty colours ────────────────────────────────────────────────────────────

export const FACULTY_COLOURS: Record<string, string> = {
  ICT:           '#38bdf8',
  Business:      '#c084fc',
  Design:        '#fb923c',
  Communication: '#34d399',
};

export function facultyColour(faculty: string): string {
  return FACULTY_COLOURS[faculty] ?? '#6b7280';
}

// ── Validation ────────────────────────────────────────────────────────────────
// Validates a candidate session's fields (not conflict-checking — that's separate).

export type SessionDraft = {
  day_of_week: number;
  start_min: number;
  duration_min: number;
  room_id: number | null;
  cohort_id: number | null;
  module_title: string;
};

export function validateDraft(d: SessionDraft): string[] {
  const errs: string[] = [];
  if (!d.module_title.trim()) errs.push('Module title is required.');
  if (d.day_of_week < 1 || d.day_of_week > 5) errs.push('Invalid day.');
  if (d.start_min < GRID_START) errs.push('Session cannot start before 08:00.');
  if (!(DURATIONS as readonly number[]).includes(d.duration_min)) errs.push('Invalid duration.');
  if (d.start_min + d.duration_min > GRID_END) errs.push('Session runs past 16:00.');
  if (!d.cohort_id) errs.push('Cohort is required.');
  return errs;
}
