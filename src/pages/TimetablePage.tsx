import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid, AlertTriangle, Plus, X, Edit2, Trash2,
  RefreshCw, Loader2, ShieldCheck, ChevronDown,
  DoorOpen, GraduationCap, UserSquare2, Eye, ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  detectConflicts, packLanes, sessionConflictTypes, validateDraft,
  hhmm, timeLabel, minToTop, durToHeight,
  DAYS, DAY_SHORT, DURATIONS, ALLOWED_STARTS, GRID_H, GRID_START,
  facultyColour, FACULTY_COLOURS,
  type TRoom, type TCohort, type TLecturer, type TSession, type TConflict, type LanedSession,
} from '@/lib/timetable';
import {
  DemoShell, Masthead, TabNav, StatusTag, cx, fieldLabel,
  type Tone, type TabDef, type Fact,
} from '@/components/demo/kit';

/* ─────────────────────────────────────────────────────────────────────────
   Class timetable — /timetable — Andrew.SCH

   A multi-role university scheduler on a live Supabase/PostgreSQL backend:
   a weekly lane-packed grid, real-time room / lecturer / cohort conflict
   detection, soft-delete, and role-based views (viewer, coordinator,
   lecturer, student) gated by row-level security. Rebuilt on the homepage
   "Stone & blueprint" editorial theme via the shared demo kit; all logic,
   data and conflict detection are original.
   ──────────────────────────────────────────────────────────────────────── */

// ── Shared styles ──────────────────────────────────────────────────────────────
const inp =
  'w-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)] focus:outline-none';
const sel =
  'w-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';
const panel = 'border border-[var(--border)] bg-[var(--surface)]';

const btn = (variant: 'primary' | 'ghost' | 'danger' = 'ghost') => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors';
  if (variant === 'primary') return `${base} bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90`;
  if (variant === 'danger') return `${base} border border-[var(--danger)]/50 text-[var(--danger)] hover:bg-[var(--danger-bg)]`;
  return `${base} border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]`;
};

// Conflict type → semantic tone (functional data encoding, not decoration).
const CONFLICT_TONE: Record<string, Tone> = { room: 'danger', lecturer: 'warn', cohort: 'accent' };

// ── Demo role system ───────────────────────────────────────────────────────────
type DemoRole = 'viewer' | 'coordinator' | 'lecturer' | 'student';

const ROLES: Record<DemoRole, {
  label: string; desc: string; Icon: LucideIcon;
  canConflicts: boolean; canDirectory: boolean; filtered: boolean;
}> = {
  viewer: { label: 'Viewer', desc: 'See the full weekly schedule', Icon: Eye, canConflicts: false, canDirectory: false, filtered: false },
  coordinator: { label: 'Timetable Coordinator', desc: 'Full schedule view + conflicts + directory', Icon: ClipboardList, canConflicts: true, canDirectory: true, filtered: false },
  lecturer: { label: 'Lecturer', desc: 'Your assigned sessions only', Icon: UserSquare2, canConflicts: false, canDirectory: false, filtered: true },
  student: { label: 'Student', desc: 'Your cohort timetable only', Icon: GraduationCap, canConflicts: false, canDirectory: false, filtered: true },
};

// ── Role switcher ──────────────────────────────────────────────────────────────
function RoleSwitcher({
  role, setRole, lecturerId, setLecturerId, cohortId, setCohortId, lecturers, cohorts,
}: {
  role: DemoRole; setRole: (r: DemoRole) => void;
  lecturerId: number | null; setLecturerId: (id: number | null) => void;
  cohortId: number | null; setCohortId: (id: number | null) => void;
  lecturers: TLecturer[]; cohorts: TCohort[];
}) {
  const [open, setOpen] = useState(false);
  const current = ROLES[role];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink)] transition-colors hover:border-[var(--accent)]"
      >
        <current.Icon size={12} className="text-[var(--accent)]" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="text-xs font-semibold text-[var(--ink)]">Switch role</p>
              <p className={cx('mt-0.5', fieldLabel)}>Demo mode — explore permissions</p>
            </div>
            <div className="space-y-1 p-2">
              {(Object.entries(ROLES) as [DemoRole, typeof ROLES[DemoRole]][]).map(([key, cfg]) => {
                const active = role === key;
                return (
                  <div key={key}>
                    <button
                      onClick={() => { setRole(key); if (!cfg.filtered) { setLecturerId(null); setCohortId(null); } }}
                      className={cx('w-full px-3 py-2.5 text-left transition-colors', active ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/40' : 'hover:bg-[var(--bg-soft)]')}
                    >
                      <div className="flex items-center gap-2">
                        <cfg.Icon size={14} className={active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
                        <div>
                          <p className={cx('text-xs font-medium', active ? 'text-[var(--ink)]' : 'text-[var(--muted)]')}>{cfg.label}</p>
                          <p className="text-[10px] text-[var(--muted)]/70">{cfg.desc}</p>
                        </div>
                        {active && <span className="ml-auto h-1.5 w-1.5 bg-[var(--accent)]" />}
                      </div>
                    </button>
                    {active && key === 'lecturer' && (
                      <div className="mx-2 mb-1 mt-1">
                        <select className={cx(sel, 'py-1.5 text-[11px]')} value={lecturerId ?? ''} onChange={(e) => setLecturerId(e.target.value ? Number(e.target.value) : null)}>
                          <option value="">— select a lecturer —</option>
                          {lecturers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                    )}
                    {active && key === 'student' && (
                      <div className="mx-2 mb-1 mt-1">
                        <select className={cx(sel, 'py-1.5 text-[11px]')} value={cohortId ?? ''} onChange={(e) => setCohortId(e.target.value ? Number(e.target.value) : null)}>
                          <option value="">— select your cohort —</option>
                          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.faculty}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[var(--border)] px-4 py-2.5">
              <p className="text-[10px] text-[var(--muted)]/60">All guest roles are read-only. Admin sign-in unlocks full management.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Delete confirm dialog ──────────────────────────────────────────────────────
function DeleteConfirm({ session, onConfirm, onCancel, loading }: {
  session: TSession; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className={cx(panel, 'w-full max-w-sm p-6 shadow-2xl')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-10 w-10 items-center justify-center bg-[var(--danger-bg)]">
          <Trash2 size={18} className="text-[var(--danger)]" />
        </div>
        <h3 className="font-display text-base font-medium text-[var(--ink)]">Delete session?</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          <span className="text-[var(--ink)]">{session.module_title}</span> will be soft-deleted and hidden from the timetable. This can be recovered from the database.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className={btn()}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={btn('danger')}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session card ───────────────────────────────────────────────────────────────
function SessionCard({ s, cohort, room, lecturer, conflictTypes, canEdit, canDelete, onEdit, onDelete }: {
  s: LanedSession; cohort: TCohort | undefined; room: TRoom | undefined; lecturer: TLecturer | undefined;
  conflictTypes: string[]; canEdit: boolean; canDelete: boolean;
  onEdit: (s: TSession) => void; onDelete: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const top = minToTop(s.start_min);
  const height = durToHeight(s.duration_min);
  const pct = 100 / s.totalLanes;
  const colour = facultyColour(cohort?.faculty ?? '');
  const short = height < 80;

  return (
    <div
      className="absolute overflow-hidden transition-all"
      style={{
        top: `${top}px`, height: `${height - 2}px`, left: `${s.lane * pct + 0.5}%`, width: `${pct - 1}%`,
        background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${colour}`,
        cursor: canEdit ? 'pointer' : 'default', zIndex: hover ? 20 : 10,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex h-full flex-col justify-between px-2 py-1">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold leading-tight text-[var(--ink)]" title={s.module_title}>{s.module_title}</p>
          {!short && (
            <>
              <p className="truncate text-[9px] text-[var(--muted)]">{cohort?.code}</p>
              {lecturer && <p className="truncate text-[9px] text-[var(--muted)]">{lecturer.name}</p>}
              {room && <p className="truncate text-[9px] text-[var(--muted)]">{room.name}</p>}
            </>
          )}
        </div>
        {conflictTypes.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-0.5">
            {conflictTypes.map((t) => <StatusTag key={t} tone={CONFLICT_TONE[t] ?? 'danger'} dot={false}>{t}</StatusTag>)}
          </div>
        )}
      </div>
      {(canEdit || canDelete) && hover && (
        <div className="absolute right-1 top-1 flex gap-0.5">
          {canEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(s); }} className="flex h-5 w-5 items-center justify-center bg-[var(--bg-soft)] text-[var(--ink)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]">
              <Edit2 size={9} />
            </button>
          )}
          {canDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="flex h-5 w-5 items-center justify-center bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-80">
              <Trash2 size={9} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Weekly grid ────────────────────────────────────────────────────────────────
function TimetableGrid({
  sessions, rooms, cohorts, lecturers, conflicts, dayFilter, canAdd, canEdit, canDelete, onEdit, onDelete, onAdd,
}: {
  sessions: TSession[]; rooms: TRoom[]; cohorts: TCohort[]; lecturers: TLecturer[]; conflicts: TConflict[];
  dayFilter: number | null; canAdd: boolean; canEdit: boolean; canDelete: boolean;
  onEdit: (s: TSession) => void; onDelete: (id: number) => void; onAdd: (day: number) => void;
}) {
  const roomIdx = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const cohortIdx = useMemo(() => new Map(cohorts.map((c) => [c.id, c])), [cohorts]);
  const lecturerIdx = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);

  const days = dayFilter != null ? [dayFilter] : [1, 2, 3, 4, 5];
  const hourLabels = Array.from({ length: 9 }, (_, i) => GRID_START + i * 60);

  return (
    <div className={cx('overflow-x-auto', panel)}>
      <div className="grid border-b border-[var(--border)]" style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(120px,1fr))` }}>
        <div className="border-r border-[var(--border)] py-2" />
        {days.map((d) => {
          const daySessions = sessions.filter((s) => s.day_of_week === d);
          const hasConflict = daySessions.some((s) => sessionConflictTypes(s.id, conflicts).length > 0);
          return (
            <div key={d} className="flex items-center justify-between border-r border-[var(--border)] px-3 py-2 last:border-r-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink)]">{DAY_SHORT[d - 1]}</span>
              <div className="flex items-center gap-1">
                {hasConflict && <AlertTriangle size={11} className="text-[var(--danger)]" />}
                {canAdd && (
                  <button onClick={() => onAdd(d)} className="flex h-5 w-5 items-center justify-center bg-[var(--bg-soft)] text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]">
                    <Plus size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(120px,1fr))` }}>
        <div className="relative border-r border-[var(--border)]" style={{ height: `${GRID_H}px` }}>
          {hourLabels.map((min) => (
            <div key={min} className="absolute right-0 w-full pr-1 text-right font-mono text-[9px] text-[var(--muted)]" style={{ top: `${minToTop(min) - 6}px` }}>{hhmm(min)}</div>
          ))}
        </div>
        {days.map((d) => {
          const daySessions = sessions.filter((s) => s.day_of_week === d);
          const laned = packLanes(daySessions);
          return (
            <div key={d} className="relative border-r border-[var(--border)] last:border-r-0" style={{ height: `${GRID_H}px` }}>
              {hourLabels.map((min) => (
                <div key={min} className="absolute left-0 w-full border-t border-[var(--border)]/50" style={{ top: `${minToTop(min)}px` }} />
              ))}
              {laned.map((s) => (
                <SessionCard
                  key={s.id} s={s}
                  cohort={cohortIdx.get(s.cohort_id)}
                  room={s.room_id != null ? roomIdx.get(s.room_id) : undefined}
                  lecturer={s.lecturer_id != null ? lecturerIdx.get(s.lecturer_id) : undefined}
                  conflictTypes={sessionConflictTypes(s.id, conflicts)}
                  canEdit={canEdit} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Conflict panel ─────────────────────────────────────────────────────────────
function ConflictPanel({ conflicts, sessions, rooms, cohorts, lecturers, onEdit, canEdit }: {
  conflicts: TConflict[]; sessions: TSession[]; rooms: TRoom[]; cohorts: TCohort[]; lecturers: TLecturer[];
  onEdit: (s: TSession) => void; canEdit: boolean;
}) {
  const sessionIdx = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);
  const roomIdx = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const cohortIdx = useMemo(() => new Map(cohorts.map((c) => [c.id, c])), [cohorts]);
  const lecturerIdx = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);

  const unassigned = sessions.filter((s) => s.lecturer_id == null || s.room_id == null);

  if (!conflicts.length && !unassigned.length) {
    return (
      <div className={cx(panel, 'px-8 py-16 text-center')}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center bg-[var(--ok-bg)]">
          <ShieldCheck className="text-[var(--ok)]" size={22} />
        </div>
        <p className="font-medium text-[var(--ink)]">No conflicts detected</p>
        <p className="mt-1 text-sm text-[var(--muted)]">All sessions are free of room, lecturer and cohort clashes.</p>
      </div>
    );
  }

  const resourceName = (c: TConflict) => {
    if (c.type === 'room') return roomIdx.get(c.sharedKey)?.name ?? `Room #${c.sharedKey}`;
    if (c.type === 'lecturer') return lecturerIdx.get(c.sharedKey)?.name ?? `Lecturer #${c.sharedKey}`;
    return cohortIdx.get(c.sharedKey)?.code ?? `Cohort #${c.sharedKey}`;
  };

  return (
    <div className="space-y-4">
      {conflicts.map((c, i) => {
        const involved = c.sessionIds.map((id) => sessionIdx.get(id)).filter(Boolean) as TSession[];
        return (
          <div key={i} className={cx(panel, 'p-5')}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusTag tone={CONFLICT_TONE[c.type] ?? 'danger'} dot={false}>{c.type}</StatusTag>
              <span className="text-sm font-medium text-[var(--ink)]">{DAYS[c.day - 1]}</span>
              <span className="text-sm text-[var(--muted)]">— {resourceName(c)} double-booked</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {involved.map((s) => {
                const cohort = cohortIdx.get(s.cohort_id);
                const room = s.room_id != null ? roomIdx.get(s.room_id) : undefined;
                const lecturer = s.lecturer_id != null ? lecturerIdx.get(s.lecturer_id) : undefined;
                return (
                  <div key={s.id} className="border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                    <p className="text-sm font-medium text-[var(--ink)]">{s.module_title}</p>
                    <p className="text-xs text-[var(--muted)]">{timeLabel(s.start_min, s.duration_min)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-[var(--muted)]">
                      {cohort && <span className="border border-[var(--border)] px-1.5 py-0.5">{cohort.code}</span>}
                      {lecturer && <span className="border border-[var(--border)] px-1.5 py-0.5">{lecturer.name}</span>}
                      {room && <span className="border border-[var(--border)] px-1.5 py-0.5">{room.name}</span>}
                    </div>
                    {canEdit && <button onClick={() => onEdit(s)} className={cx(btn(), 'mt-2 text-[10px]')}><Edit2 size={10} /> Reschedule</button>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="border border-[var(--warn)]/30 bg-[var(--warn-bg)] p-5">
          <p className="mb-3 text-sm font-medium text-[var(--warn)]">Unassigned sessions ({unassigned.length})</p>
          <div className="space-y-2">
            {unassigned.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div>
                  <p className="text-sm text-[var(--ink)]">{s.module_title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {DAYS[s.day_of_week - 1]} · {timeLabel(s.start_min, s.duration_min)}
                    {s.lecturer_id == null && ' · No lecturer'}
                    {s.room_id == null && ' · No room'}
                  </p>
                </div>
                {canEdit && <button onClick={() => onEdit(s)} className={btn()}><Edit2 size={11} /> Assign</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Session form ───────────────────────────────────────────────────────────────
type FormState = {
  day_of_week: number; start_min: number; duration_min: number;
  room_id: string; cohort_id: string; lecturer_id: string; module_code: string; module_title: string;
};

function SessionForm({ initial, rooms, cohorts, lecturers, existingSessions, onSave, onClose }: {
  initial: Partial<TSession>; rooms: TRoom[]; cohorts: TCohort[]; lecturers: TLecturer[]; existingSessions: TSession[];
  onSave: (d: Omit<TSession, 'id' | 'deleted' | 'created_at'>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    day_of_week: initial.day_of_week ?? 1,
    start_min: initial.start_min ?? 480,
    duration_min: initial.duration_min ?? 120,
    room_id: initial.room_id != null ? String(initial.room_id) : '',
    cohort_id: initial.cohort_id != null ? String(initial.cohort_id) : '',
    lecturer_id: initial.lecturer_id != null ? String(initial.lecturer_id) : '',
    module_code: initial.module_code ?? '',
    module_title: initial.module_title ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const set = (k: keyof FormState, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const previewConflicts = useMemo(() => {
    const candidate: TSession = {
      id: initial.id ?? -1,
      day_of_week: Number(form.day_of_week),
      start_min: Number(form.start_min),
      duration_min: Number(form.duration_min),
      room_id: form.room_id ? Number(form.room_id) : null,
      cohort_id: Number(form.cohort_id) || 0,
      lecturer_id: form.lecturer_id ? Number(form.lecturer_id) : null,
      module_code: form.module_code,
      module_title: form.module_title,
      deleted: false,
    };
    const others = existingSessions.filter((s) => !s.deleted && s.id !== candidate.id);
    const allConflicts = detectConflicts([...others, candidate]);
    return allConflicts.filter((c) => c.sessionIds.includes(candidate.id));
  }, [form, existingSessions, initial.id]);

  const handleSave = async () => {
    const draft = {
      day_of_week: Number(form.day_of_week),
      start_min: Number(form.start_min),
      duration_min: Number(form.duration_min),
      room_id: form.room_id ? Number(form.room_id) : null,
      cohort_id: Number(form.cohort_id) || 0,
      lecturer_id: form.lecturer_id ? Number(form.lecturer_id) : null,
      module_code: form.module_code,
      module_title: form.module_title,
    };
    const errs = validateDraft({ ...draft, room_id: draft.room_id });
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSaving(true);
    try {
      await onSave(draft);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Unknown error';
      if (msg.includes('row-level security') || msg.includes('policy')) {
        setErrors(['Admin sign-in required to save changes. This is a demo restriction.']);
      } else {
        setErrors([`Save failed: ${msg}`]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className={cx(panel, 'w-full max-w-lg p-6 shadow-2xl')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-[var(--ink)]">{initial.id ? 'Edit session' : 'Add session'}</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={cx('mb-1.5 block', fieldLabel)}>Module title</label>
            <input className={inp} value={form.module_title} onChange={(e) => set('module_title', e.target.value)} placeholder="e.g. Data Structures" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cx('mb-1.5 block', fieldLabel)}>Module code</label>
              <input className={inp} value={form.module_code} onChange={(e) => set('module_code', e.target.value)} placeholder="CS201" />
            </div>
            <div>
              <label className={cx('mb-1.5 block', fieldLabel)}>Cohort</label>
              <select className={sel} value={form.cohort_id} onChange={(e) => set('cohort_id', e.target.value)}>
                <option value="">— select —</option>
                {cohorts.map((c) => <option key={c.id} value={String(c.id)}>{c.code} – {c.faculty}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={cx('mb-1.5 block', fieldLabel)}>Day</label>
              <select className={sel} value={form.day_of_week} onChange={(e) => set('day_of_week', Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={cx('mb-1.5 block', fieldLabel)}>Start time</label>
              <select className={sel} value={form.start_min} onChange={(e) => set('start_min', Number(e.target.value))}>
                {ALLOWED_STARTS.filter((m) => m + Number(form.duration_min) <= 960).map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}
              </select>
            </div>
            <div>
              <label className={cx('mb-1.5 block', fieldLabel)}>Duration</label>
              <select className={sel} value={form.duration_min} onChange={(e) => set('duration_min', Number(e.target.value))}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d === 60 ? '1h' : d === 90 ? '1h 30m' : d === 120 ? '2h' : '3h'}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cx('mb-1.5 block', fieldLabel)}>Room</label>
              <select className={sel} value={form.room_id} onChange={(e) => set('room_id', e.target.value)}>
                <option value="">— unassigned —</option>
                {rooms.map((r) => <option key={r.id} value={String(r.id)}>{r.name} ({r.capacity})</option>)}
              </select>
            </div>
            <div>
              <label className={cx('mb-1.5 block', fieldLabel)}>Lecturer</label>
              <select className={sel} value={form.lecturer_id} onChange={(e) => set('lecturer_id', e.target.value)}>
                <option value="">— unassigned —</option>
                {lecturers.map((l) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {previewConflicts.length > 0 && (
          <div className="mt-4 border border-[var(--warn)]/30 bg-[var(--warn-bg)] px-4 py-3">
            <p className="mb-1 text-xs font-medium text-[var(--warn)]">
              <AlertTriangle size={12} className="mr-1 inline" />
              {previewConflicts.length} conflict{previewConflicts.length > 1 ? 's' : ''} detected
            </p>
            {previewConflicts.map((c, i) => (
              <p key={i} className="text-xs text-[var(--muted)]">{c.type.charAt(0).toUpperCase() + c.type.slice(1)} clash on {DAYS[c.day - 1]}</p>
            ))}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 space-y-0.5 border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger)]">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className={btn()}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={btn('primary')}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {initial.id ? 'Save changes' : 'Add session'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Directory panel ────────────────────────────────────────────────────────────
function DirectoryPanel({ rooms, cohorts, lecturers, onAddRoom, onDeleteRoom, onAddCohort, onDeleteCohort, onAddLecturer, onDeleteLecturer }: {
  rooms: TRoom[]; cohorts: TCohort[]; lecturers: TLecturer[];
  onAddRoom: (r: Omit<TRoom, 'id'>) => Promise<void>; onDeleteRoom: (id: number) => Promise<void>;
  onAddCohort: (c: Omit<TCohort, 'id'>) => Promise<void>; onDeleteCohort: (id: number) => Promise<void>;
  onAddLecturer: (l: Omit<TLecturer, 'id'>) => Promise<void>; onDeleteLecturer: (id: number) => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<'rooms' | 'cohorts' | 'lecturers'>('rooms');
  const [saving, setSaving] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', type: 'lecture', capacity: '', floor: '' });
  const [cohortForm, setCohortForm] = useState({ code: '', title: '', faculty: 'ICT', year: '1', level: 'Undergraduate' });
  const [lectForm, setLectForm] = useState({ name: '', faculty: 'ICT', email: '' });

  const tabCls = (t: typeof subTab) =>
    cx('px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors', subTab === t ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]');
  const thCls = 'pb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]';

  return (
    <div className={panel}>
      <div className="flex gap-1 border-b border-[var(--border)] p-3">
        <button className={tabCls('rooms')} onClick={() => setSubTab('rooms')}><DoorOpen size={12} className="mr-1 inline" />Rooms</button>
        <button className={tabCls('cohorts')} onClick={() => setSubTab('cohorts')}><GraduationCap size={12} className="mr-1 inline" />Cohorts</button>
        <button className={tabCls('lecturers')} onClick={() => setSubTab('lecturers')}><UserSquare2 size={12} className="mr-1 inline" />Lecturers</button>
      </div>
      <div className="p-4">
        {subTab === 'rooms' && (
          <>
            <table className="w-full text-xs text-[var(--muted)]">
              <thead><tr className="border-b border-[var(--border)] text-left"><th className={thCls}>Name</th><th className={thCls}>Type</th><th className={thCls}>Cap</th><th className={thCls}>Floor</th><th /></tr></thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]">
                    <td className="py-1.5 text-[var(--ink)]">{r.name}</td><td>{r.type}</td><td>{r.capacity}</td><td>{r.floor}</td>
                    <td className="py-1.5 text-right"><button onClick={() => onDeleteRoom(r.id)} className={btn('danger')}><Trash2 size={10} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <input className={inp} placeholder="Name" value={roomForm.name} onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))} />
              <select className={sel} value={roomForm.type} onChange={(e) => setRoomForm((f) => ({ ...f, type: e.target.value }))}>
                {['lecture', 'lab', 'studio', 'seminar'].map((t) => <option key={t}>{t}</option>)}
              </select>
              <input className={inp} placeholder="Capacity" type="number" value={roomForm.capacity} onChange={(e) => setRoomForm((f) => ({ ...f, capacity: e.target.value }))} />
              <input className={inp} placeholder="Floor" value={roomForm.floor} onChange={(e) => setRoomForm((f) => ({ ...f, floor: e.target.value }))} />
            </div>
            <button className={cx(btn('primary'), 'mt-2')} onClick={async () => {
              if (!roomForm.name) return;
              setSaving(true);
              await onAddRoom({ name: roomForm.name, type: roomForm.type as TRoom['type'], capacity: Number(roomForm.capacity) || 0, floor: roomForm.floor });
              setRoomForm({ name: '', type: 'lecture', capacity: '', floor: '' });
              setSaving(false);
            }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add room
            </button>
          </>
        )}
        {subTab === 'cohorts' && (
          <>
            <table className="w-full text-xs text-[var(--muted)]">
              <thead><tr className="border-b border-[var(--border)] text-left"><th className={thCls}>Code</th><th className={thCls}>Faculty</th><th className={thCls}>Year</th><th /></tr></thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)]">
                    <td className="py-1.5 text-[var(--ink)]">{c.code}</td><td>{c.faculty}</td><td>{c.year}</td>
                    <td className="py-1.5 text-right"><button onClick={() => onDeleteCohort(c.id)} className={btn('danger')}><Trash2 size={10} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <input className={inp} placeholder="Code (BSSE3)" value={cohortForm.code} onChange={(e) => setCohortForm((f) => ({ ...f, code: e.target.value }))} />
              <input className={inp} placeholder="Title" value={cohortForm.title} onChange={(e) => setCohortForm((f) => ({ ...f, title: e.target.value }))} />
              <select className={sel} value={cohortForm.faculty} onChange={(e) => setCohortForm((f) => ({ ...f, faculty: e.target.value }))}>
                {['ICT', 'Business', 'Design', 'Communication'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <button className={cx(btn('primary'), 'mt-2')} onClick={async () => {
              if (!cohortForm.code) return;
              setSaving(true);
              await onAddCohort({ code: cohortForm.code, title: cohortForm.title, faculty: cohortForm.faculty, year: Number(cohortForm.year) || 1, level: cohortForm.level });
              setCohortForm({ code: '', title: '', faculty: 'ICT', year: '1', level: 'Undergraduate' });
              setSaving(false);
            }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add cohort
            </button>
          </>
        )}
        {subTab === 'lecturers' && (
          <>
            <table className="w-full text-xs text-[var(--muted)]">
              <thead><tr className="border-b border-[var(--border)] text-left"><th className={thCls}>Name</th><th className={thCls}>Faculty</th><th className={thCls}>Email</th><th /></tr></thead>
              <tbody>
                {lecturers.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--border)]">
                    <td className="py-1.5 text-[var(--ink)]">{l.name}</td><td>{l.faculty}</td><td>{l.email}</td>
                    <td className="py-1.5 text-right"><button onClick={() => onDeleteLecturer(l.id)} className={btn('danger')}><Trash2 size={10} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <input className={inp} placeholder="Name" value={lectForm.name} onChange={(e) => setLectForm((f) => ({ ...f, name: e.target.value }))} />
              <select className={sel} value={lectForm.faculty} onChange={(e) => setLectForm((f) => ({ ...f, faculty: e.target.value }))}>
                {['ICT', 'Business', 'Design', 'Communication'].map((x) => <option key={x}>{x}</option>)}
              </select>
              <input className={inp} placeholder="Email" value={lectForm.email} onChange={(e) => setLectForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <button className={cx(btn('primary'), 'mt-2')} onClick={async () => {
              if (!lectForm.name) return;
              setSaving(true);
              await onAddLecturer({ name: lectForm.name, faculty: lectForm.faculty, email: lectForm.email });
              setLectForm({ name: '', faculty: 'ICT', email: '' });
              setSaving(false);
            }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add lecturer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
type Tab = 'grid' | 'conflicts' | 'directory';

export default function TimetablePage() {
  const { user } = useAuth();
  const isAdmin = user?.email === 'andrewpjlangeveldt@gmail.com';

  // ── Data ───────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<TRoom[]>([]);
  const [cohorts, setCohorts] = useState<TCohort[]>([]);
  const [lecturers, setLecturers] = useState<TLecturer[]>([]);
  const [sessions, setSessions] = useState<TSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true); setError(null);
    const [r, co, l, s] = await Promise.all([
      supabase.from('tt_rooms').select('*').order('id'),
      supabase.from('tt_cohorts').select('*').order('id'),
      supabase.from('tt_lecturers').select('*').order('id'),
      supabase.from('tt_sessions').select('*').order('id'),
    ]);
    if (r.error || co.error || l.error || s.error) {
      setError('Failed to load timetable data.');
    } else {
      setRooms(r.data as TRoom[]);
      setCohorts(co.data as TCohort[]);
      setLecturers(l.data as TLecturer[]);
      setSessions(s.data as TSession[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Role system ────────────────────────────────────────────────────────────
  const [demoRole, setDemoRole] = useState<DemoRole>('viewer');
  const [demoLecturerId, setDemoLecturer] = useState<number | null>(null);
  const [demoCohortId, setDemoCohort] = useState<number | null>(null);

  const perms = useMemo(() => {
    if (isAdmin) return { canAdd: true, canEdit: true, canDelete: true, canDirectory: true, canConflicts: true };
    const r = ROLES[demoRole];
    return { canAdd: false, canEdit: false, canDelete: false, canDirectory: r.canDirectory, canConflicts: r.canConflicts };
  }, [isAdmin, demoRole]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const activeSessions = useMemo(() => sessions.filter((s) => !s.deleted), [sessions]);

  const visibleSessions = useMemo(() => {
    if (!isAdmin && demoRole === 'lecturer' && demoLecturerId) {
      return activeSessions.filter((s) => s.lecturer_id === demoLecturerId);
    }
    if (!isAdmin && demoRole === 'student' && demoCohortId) {
      return activeSessions.filter((s) => s.cohort_id === demoCohortId);
    }
    return activeSessions;
  }, [isAdmin, demoRole, demoLecturerId, demoCohortId, activeSessions]);

  const conflicts = useMemo(() => detectConflicts(visibleSessions), [visibleSessions]);

  // ── View state ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('grid');
  const [dayFilter, setDayFilter] = useState<number | null>(null);

  // ── Session form ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Partial<TSession>>({});

  const openAdd = (day?: number) => { setEditTarget({ day_of_week: day ?? 1 }); setFormOpen(true); };
  const openEdit = (s: TSession) => { setEditTarget({ ...s }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditTarget({}); };

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<TSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = (id: number) => {
    const s = activeSessions.find((x) => x.id === id);
    if (s) { setDeleteTarget(s); setDeleteError(null); }
  };

  const executeDelete = async () => {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('tt_sessions').update({ deleted: true }).eq('id', deleteTarget.id);
    if (error) {
      const msg = error.message.includes('row-level security') || error.message.includes('policy')
        ? 'Admin sign-in required to delete sessions.'
        : `Delete failed: ${error.message}`;
      setDeleteError(msg);
      setDeleting(false);
      return;
    }
    await load();
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleSave = async (d: Omit<TSession, 'id' | 'deleted' | 'created_at'>) => {
    if (!supabase) return;
    if (editTarget.id) {
      const { error } = await supabase.from('tt_sessions').update(d).eq('id', editTarget.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('tt_sessions').insert({ ...d, deleted: false });
      if (error) throw error;
    }
    await load();
    closeForm();
  };

  // ── Directory handlers ─────────────────────────────────────────────────────
  const addRoom = async (r: Omit<TRoom, 'id'>) => { if (!supabase) return; await supabase.from('tt_rooms').insert(r); await load(); };
  const delRoom = async (id: number) => { if (!supabase) return; await supabase.from('tt_rooms').delete().eq('id', id); await load(); };
  const addCohort = async (c: Omit<TCohort, 'id'>) => { if (!supabase) return; await supabase.from('tt_cohorts').insert(c); await load(); };
  const delCohort = async (id: number) => { if (!supabase) return; await supabase.from('tt_cohorts').delete().eq('id', id); await load(); };
  const addLecturer = async (l: Omit<TLecturer, 'id'>) => { if (!supabase) return; await supabase.from('tt_lecturers').insert(l); await load(); };
  const delLecturer = async (id: number) => { if (!supabase) return; await supabase.from('tt_lecturers').delete().eq('id', id); await load(); };

  // ── Masthead facts ───────────────────────────────────────────────────────────
  const facts: Fact[] = [
    { label: 'Sessions', value: visibleSessions.length },
    { label: 'Rooms', value: rooms.length },
    { label: 'Cohorts', value: cohorts.length },
    { label: 'Lecturers', value: lecturers.length },
  ];

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const tabs: TabDef<Tab>[] = [
    { id: 'grid', label: 'Schedule' },
    ...(perms.canConflicts ? [{ id: 'conflicts' as Tab, label: 'Conflicts', count: conflicts.length }] : []),
    ...(perms.canDirectory ? [{ id: 'directory' as Tab, label: 'Directory' }] : []),
  ];

  // Role banner message
  const roleBanner = !isAdmin ? (
    demoRole === 'lecturer' && !demoLecturerId
      ? 'Select a lecturer in the role switcher to filter the schedule.'
      : demoRole === 'student' && !demoCohortId
        ? 'Select your cohort in the role switcher to see your timetable.'
        : null
  ) : null;

  return (
    <DemoShell title="Class Timetable" wordmark="SCH" revealKey={tab}>
      <Masthead
        eyebrow="Academic scheduling · Meridian University"
        title="A week that never double-books."
        lede="A multi-role university timetable on a live PostgreSQL backend: a lane-packed weekly grid, real-time room / lecturer / cohort conflict detection, and role-based views gated by row-level security. Switch roles to explore viewer, coordinator, lecturer, and student permissions."
        live="Live · Supabase-backed"
        facts={facts}
      />

      {/* Faculty legend */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <span className={fieldLabel}>Faculties</span>
        {Object.entries(FACULTY_COLOURS).map(([fac, col]) => (
          <span key={fac} className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span className="h-2 w-2" style={{ background: col }} /> {fac}
          </span>
        ))}
      </div>

      {/* Toolbar: role + tabs + actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <span className="inline-flex items-center gap-1.5 border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)]">
              <ShieldCheck size={11} /> Admin
            </span>
          ) : (
            <RoleSwitcher
              role={demoRole} setRole={setDemoRole}
              lecturerId={demoLecturerId} setLecturerId={setDemoLecturer}
              cohortId={demoCohortId} setCohortId={setDemoCohort}
              lecturers={lecturers} cohorts={cohorts}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {tab === 'grid' && (
            <select
              className="border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] focus:outline-none"
              value={dayFilter ?? ''}
              onChange={(e) => setDayFilter(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">All days</option>
              {DAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </select>
          )}
          {perms.canAdd && tab === 'grid' && (
            <button onClick={() => openAdd()} className={btn('primary')}><Plus size={13} /> Add session</button>
          )}
          <button onClick={load} className={btn()} title="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="mt-4">
        <TabNav tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <div className="pt-6">
        {roleBanner && (
          <div className="mb-4 border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[var(--accent)]">{roleBanner}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-28 text-sm text-[var(--muted)]">
            <Loader2 size={16} className="animate-spin" /> Loading timetable…
          </div>
        ) : error ? (
          <div className="py-20 text-center text-sm text-[var(--danger)]">{error}</div>
        ) : tab === 'grid' ? (
          <TimetableGrid
            sessions={visibleSessions}
            rooms={rooms} cohorts={cohorts} lecturers={lecturers}
            conflicts={conflicts} dayFilter={dayFilter}
            canAdd={perms.canAdd} canEdit={perms.canEdit} canDelete={perms.canDelete}
            onEdit={openEdit} onDelete={confirmDelete} onAdd={openAdd}
          />
        ) : tab === 'conflicts' ? (
          <ConflictPanel
            conflicts={conflicts} sessions={visibleSessions}
            rooms={rooms} cohorts={cohorts} lecturers={lecturers}
            onEdit={openEdit} canEdit={perms.canEdit}
          />
        ) : (
          <DirectoryPanel
            rooms={rooms} cohorts={cohorts} lecturers={lecturers}
            onAddRoom={addRoom} onDeleteRoom={delRoom}
            onAddCohort={addCohort} onDeleteCohort={delCohort}
            onAddLecturer={addLecturer} onDeleteLecturer={delLecturer}
          />
        )}

        <p className="mt-8 text-center text-xs text-[var(--muted)]/60">
          Supabase PostgreSQL · TypeScript conflict detection · role-based access control · original build
        </p>
      </div>

      {formOpen && (
        <SessionForm
          initial={editTarget}
          rooms={rooms} cohorts={cohorts} lecturers={lecturers}
          existingSessions={sessions}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {deleteTarget && (
        <>
          <DeleteConfirm session={deleteTarget} onConfirm={executeDelete} onCancel={() => { setDeleteTarget(null); setDeleteError(null); }} loading={deleting} />
          {deleteError && (
            <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 border border-[var(--danger)]/30 bg-[var(--surface)] px-4 py-2 text-xs text-[var(--danger)] shadow-xl">{deleteError}</div>
          )}
        </>
      )}
    </DemoShell>
  );
}
