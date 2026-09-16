import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LayoutGrid, AlertTriangle, Plus, X, Edit2, Trash2,
  RefreshCw, ChevronDown, Loader2, ShieldCheck, BookOpen,
  Users, DoorOpen, GraduationCap, UserSquare2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Footer from '@/components/Footer';
import {
  detectConflicts, packLanes, sessionConflictTypes, validateDraft,
  hhmm, timeLabel, minToTop, durToHeight,
  DAYS, DAY_SHORT, DURATIONS, ALLOWED_STARTS, GRID_H, GRID_START,
  facultyColour, FACULTY_COLOURS,
  type TRoom, type TCohort, type TLecturer, type TSession, type TConflict, type LanedSession,
} from '@/lib/timetable';

// ── Shared styles ──────────────────────────────────────────────────────────────

const input =
  'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white placeholder:text-[var(--muted)]/50 focus:border-[var(--brand-bright)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bright)]';

const select =
  'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white focus:border-[var(--brand-bright)] focus:outline-none';

const btn = (variant: 'primary' | 'ghost' | 'danger' = 'ghost') => {
  const base = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors';
  if (variant === 'primary') return `${base} bg-[var(--brand-bright)] text-[#0b0d10] hover:bg-white`;
  if (variant === 'danger')  return `${base} bg-red-500/10 text-red-400 hover:bg-red-500/20`;
  return `${base} border border-white/10 text-[var(--muted)] hover:border-white/30 hover:text-white`;
};

// ── Conflict badge colours ─────────────────────────────────────────────────────

const CONFLICT_COLOURS: Record<string, string> = {
  room:     '#f87171',
  lecturer: '#fb923c',
  cohort:   '#facc15',
};

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({
  s, cohort, room, lecturer, conflictTypes, isAdmin, onEdit, onDelete,
}: {
  s: LanedSession;
  cohort: TCohort | undefined;
  room: TRoom | undefined;
  lecturer: TLecturer | undefined;
  conflictTypes: string[];
  isAdmin: boolean;
  onEdit: (s: TSession) => void;
  onDelete: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const top    = minToTop(s.start_min);
  const height = durToHeight(s.duration_min);
  const pct    = 100 / s.totalLanes;
  const colour = facultyColour(cohort?.faculty ?? '');
  const short  = height < 80;

  return (
    <div
      className="absolute overflow-hidden rounded-lg border transition-all"
      style={{
        top: `${top}px`,
        height: `${height - 2}px`,
        left: `${s.lane * pct + 0.5}%`,
        width: `${pct - 1}%`,
        borderColor: `${colour}40`,
        background: `${colour}18`,
        cursor: isAdmin ? 'pointer' : 'default',
        zIndex: hover ? 20 : 10,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Colour accent bar */}
      <div className="absolute left-0 top-0 h-full w-0.5 rounded-l-lg" style={{ background: colour }} />

      <div className="flex h-full flex-col justify-between px-1.5 py-1 pl-2.5">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold leading-tight text-white" title={s.module_title}>
            {s.module_title}
          </p>
          {!short && (
            <>
              <p className="truncate text-[9px] text-[var(--muted)]">{cohort?.code}</p>
              {lecturer && <p className="truncate text-[9px] text-[var(--muted)]">{lecturer.name}</p>}
              {room && <p className="truncate text-[9px] text-[var(--muted)]">{room.name}</p>}
            </>
          )}
        </div>

        {/* Conflict badges */}
        {conflictTypes.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-0.5">
            {conflictTypes.map(t => (
              <span
                key={t}
                className="rounded px-1 text-[8px] font-bold uppercase"
                style={{ background: `${CONFLICT_COLOURS[t]}30`, color: CONFLICT_COLOURS[t] }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Admin hover actions */}
      {isAdmin && hover && (
        <div className="absolute right-1 top-1 flex gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(s); }}
            className="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-white hover:bg-white/20"
          >
            <Edit2 size={9} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
            className="flex h-5 w-5 items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/40"
          >
            <Trash2 size={9} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Weekly grid ───────────────────────────────────────────────────────────────

function TimetableGrid({
  sessions, rooms, cohorts, lecturers, conflicts, dayFilter, isAdmin, onEdit, onDelete, onAdd,
}: {
  sessions: TSession[];
  rooms: TRoom[];
  cohorts: TCohort[];
  lecturers: TLecturer[];
  conflicts: TConflict[];
  dayFilter: number | null;
  isAdmin: boolean;
  onEdit: (s: TSession) => void;
  onDelete: (id: number) => void;
  onAdd: (day: number) => void;
}) {
  const roomIdx     = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);
  const cohortIdx   = useMemo(() => new Map(cohorts.map(c => [c.id, c])), [cohorts]);
  const lecturerIdx = useMemo(() => new Map(lecturers.map(l => [l.id, l])), [lecturers]);

  const active = sessions.filter(s => !s.deleted);
  const days = dayFilter != null ? [dayFilter] : [1, 2, 3, 4, 5];

  // Hour labels 08:00–15:00 (16:00 is the end, just shown as a line)
  const hourLabels = Array.from({ length: 9 }, (_, i) => GRID_START + i * 60);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[var(--surface)]">
      {/* Day header row */}
      <div
        className="grid border-b border-white/10"
        style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(120px,1fr))` }}
      >
        <div className="border-r border-white/10 py-2" />
        {days.map(d => {
          const daySessions = active.filter(s => s.day_of_week === d);
          const hasConflict = daySessions.some(s => sessionConflictTypes(s.id, conflicts).length > 0);
          return (
            <div key={d} className="flex items-center justify-between border-r border-white/10 px-3 py-2 last:border-r-0">
              <span className="text-xs font-medium text-white">{DAY_SHORT[d - 1]}</span>
              <div className="flex items-center gap-1">
                {hasConflict && <AlertTriangle size={11} className="text-red-400" />}
                {isAdmin && (
                  <button
                    onClick={() => onAdd(d)}
                    className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[var(--muted)] hover:bg-[var(--brand-bright)] hover:text-[#0b0d10]"
                    title={`Add session on ${DAYS[d - 1]}`}
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid body */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(120px,1fr))` }}
      >
        {/* Time labels column */}
        <div className="relative border-r border-white/10" style={{ height: `${GRID_H}px` }}>
          {hourLabels.map(min => (
            <div
              key={min}
              className="absolute right-0 w-full pr-1 text-right text-[9px] text-[var(--muted)]"
              style={{ top: `${minToTop(min) - 6}px` }}
            >
              {hhmm(min)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(d => {
          const daySessions = active.filter(s => s.day_of_week === d);
          const laned = packLanes(daySessions);
          return (
            <div
              key={d}
              className="relative border-r border-white/10 last:border-r-0"
              style={{ height: `${GRID_H}px` }}
            >
              {/* Hour grid lines */}
              {hourLabels.map(min => (
                <div
                  key={min}
                  className="absolute left-0 w-full border-t border-white/5"
                  style={{ top: `${minToTop(min)}px` }}
                />
              ))}

              {/* Session cards */}
              {laned.map(s => (
                <SessionCard
                  key={s.id}
                  s={s}
                  cohort={cohortIdx.get(s.cohort_id)}
                  room={s.room_id != null ? roomIdx.get(s.room_id) : undefined}
                  lecturer={s.lecturer_id != null ? lecturerIdx.get(s.lecturer_id) : undefined}
                  conflictTypes={sessionConflictTypes(s.id, conflicts)}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onDelete={onDelete}
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

function ConflictPanel({
  conflicts, sessions, rooms, cohorts, lecturers, onEdit,
}: {
  conflicts: TConflict[];
  sessions: TSession[];
  rooms: TRoom[];
  cohorts: TCohort[];
  lecturers: TLecturer[];
  onEdit: (s: TSession) => void;
}) {
  const sessionIdx  = useMemo(() => new Map(sessions.map(s => [s.id, s])), [sessions]);
  const roomIdx     = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);
  const cohortIdx   = useMemo(() => new Map(cohorts.map(c => [c.id, c])), [cohorts]);
  const lecturerIdx = useMemo(() => new Map(lecturers.map(l => [l.id, l])), [lecturers]);

  const unassigned = sessions.filter(s => !s.deleted && (s.lecturer_id == null || s.room_id == null));

  if (!conflicts.length && !unassigned.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[var(--surface)] px-8 py-16 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck className="text-emerald-400" size={22} />
        </div>
        <p className="font-medium text-white">No conflicts detected</p>
        <p className="mt-1 text-sm text-[var(--muted)]">All sessions are free of room, lecturer and cohort clashes.</p>
      </div>
    );
  }

  const resourceName = (c: TConflict) => {
    if (c.type === 'room')     return roomIdx.get(c.sharedKey)?.name ?? `Room #${c.sharedKey}`;
    if (c.type === 'lecturer') return lecturerIdx.get(c.sharedKey)?.name ?? `Lecturer #${c.sharedKey}`;
    return cohortIdx.get(c.sharedKey)?.code ?? `Cohort #${c.sharedKey}`;
  };

  return (
    <div className="space-y-4">
      {conflicts.map((c, i) => {
        const involved = c.sessionIds.map(id => sessionIdx.get(id)).filter(Boolean) as TSession[];
        const colour = CONFLICT_COLOURS[c.type];
        return (
          <div key={i} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                style={{ background: `${colour}25`, color: colour }}
              >
                {c.type}
              </span>
              <span className="text-sm font-medium text-white">{DAYS[c.day - 1]}</span>
              <span className="text-sm text-[var(--muted)]">— {resourceName(c)} double-booked</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {involved.map(s => {
                const cohort   = cohortIdx.get(s.cohort_id);
                const room     = s.room_id != null ? roomIdx.get(s.room_id) : undefined;
                const lecturer = s.lecturer_id != null ? lecturerIdx.get(s.lecturer_id) : undefined;
                return (
                  <div key={s.id} className="rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3">
                    <p className="text-sm font-medium text-white">{s.module_title}</p>
                    <p className="text-xs text-[var(--muted)]">{timeLabel(s.start_min, s.duration_min)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-[var(--muted)]">
                      {cohort   && <span className="rounded-md border border-white/10 px-1.5 py-0.5">{cohort.code}</span>}
                      {lecturer && <span className="rounded-md border border-white/10 px-1.5 py-0.5">{lecturer.name}</span>}
                      {room     && <span className="rounded-md border border-white/10 px-1.5 py-0.5">{room.name}</span>}
                    </div>
                    <button onClick={() => onEdit(s)} className={`${btn()} mt-2 text-[10px]`}>
                      <Edit2 size={10} /> Reschedule
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <p className="mb-3 text-sm font-medium text-yellow-300">Unassigned sessions ({unassigned.length})</p>
          <div className="space-y-2">
            {unassigned.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2">
                <div>
                  <p className="text-sm text-white">{s.module_title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {DAYS[s.day_of_week - 1]} · {timeLabel(s.start_min, s.duration_min)}
                    {s.lecturer_id == null && ' · No lecturer'}
                    {s.room_id == null && ' · No room'}
                  </p>
                </div>
                <button onClick={() => onEdit(s)} className={btn()}>
                  <Edit2 size={11} /> Assign
                </button>
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
  day_of_week: number;
  start_min: number;
  duration_min: number;
  room_id: string;
  cohort_id: string;
  lecturer_id: string;
  module_code: string;
  module_title: string;
};

function SessionForm({
  initial, rooms, cohorts, lecturers, existingSessions, onSave, onClose,
}: {
  initial: Partial<TSession>;
  rooms: TRoom[];
  cohorts: TCohort[];
  lecturers: TLecturer[];
  existingSessions: TSession[];
  onSave: (d: Omit<TSession, 'id' | 'deleted' | 'created_at'>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    day_of_week: initial.day_of_week ?? 1,
    start_min:   initial.start_min   ?? 480,
    duration_min: initial.duration_min ?? 120,
    room_id:     initial.room_id     != null ? String(initial.room_id)     : '',
    cohort_id:   initial.cohort_id   != null ? String(initial.cohort_id)   : '',
    lecturer_id: initial.lecturer_id != null ? String(initial.lecturer_id) : '',
    module_code:  initial.module_code  ?? '',
    module_title: initial.module_title ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const set = (k: keyof FormState, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  // Live conflict preview — pure in-memory, no network needed.
  const previewConflicts = useMemo(() => {
    const candidate: TSession = {
      id: initial.id ?? -1,
      day_of_week:  Number(form.day_of_week),
      start_min:    Number(form.start_min),
      duration_min: Number(form.duration_min),
      room_id:      form.room_id     ? Number(form.room_id)     : null,
      cohort_id:    Number(form.cohort_id) || 0,
      lecturer_id:  form.lecturer_id ? Number(form.lecturer_id) : null,
      module_code:  form.module_code,
      module_title: form.module_title,
      deleted: false,
    };
    const others = existingSessions.filter(s => !s.deleted && s.id !== candidate.id);
    return detectConflicts([...others, candidate]).filter(c => c.sessionIds.includes(-1) || c.sessionIds.includes(initial.id ?? -1));
  }, [form, existingSessions, initial.id]);

  const handleSave = async () => {
    const draft = {
      day_of_week:  Number(form.day_of_week),
      start_min:    Number(form.start_min),
      duration_min: Number(form.duration_min),
      room_id:      form.room_id     ? Number(form.room_id)     : null,
      cohort_id:    Number(form.cohort_id) || 0,
      lecturer_id:  form.lecturer_id ? Number(form.lecturer_id) : null,
      module_code:  form.module_code,
      module_title: form.module_title,
    };
    const errs = validateDraft({ ...draft, room_id: draft.room_id });
    if (errs.length) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg text-white">
            {initial.id ? 'Edit session' : 'Add session'}
          </h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--muted)]">Module title</label>
            <input className={input} value={form.module_title} onChange={e => set('module_title', e.target.value)} placeholder="e.g. Data Structures" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[var(--muted)]">Module code</label>
              <input className={input} value={form.module_code} onChange={e => set('module_code', e.target.value)} placeholder="CS201" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[var(--muted)]">Cohort</label>
              <select className={select} value={form.cohort_id} onChange={e => set('cohort_id', e.target.value)}>
                <option value="">— select —</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.code} – {c.faculty}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[var(--muted)]">Day</label>
              <select className={select} value={form.day_of_week} onChange={e => set('day_of_week', Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[var(--muted)]">Start time</label>
              <select className={select} value={form.start_min} onChange={e => set('start_min', Number(e.target.value))}>
                {ALLOWED_STARTS.map(m => {
                  const end = m + Number(form.duration_min);
                  if (end > 960) return null;
                  return <option key={m} value={m}>{hhmm(m)}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[var(--muted)]">Duration</label>
              <select className={select} value={form.duration_min} onChange={e => set('duration_min', Number(e.target.value))}>
                {DURATIONS.map(d => <option key={d} value={d}>{d === 60 ? '1h' : d === 90 ? '1h 30m' : d === 120 ? '2h' : '3h'}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[var(--muted)]">Room</label>
              <select className={select} value={form.room_id} onChange={e => set('room_id', e.target.value)}>
                <option value="">— unassigned —</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[var(--muted)]">Lecturer</label>
              <select className={select} value={form.lecturer_id} onChange={e => set('lecturer_id', e.target.value)}>
                <option value="">— unassigned —</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Live conflict preview */}
        {previewConflicts.length > 0 && (
          <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
            <p className="mb-1 text-xs font-medium text-orange-300">
              <AlertTriangle size={12} className="mr-1 inline" />
              {previewConflicts.length} conflict{previewConflicts.length > 1 ? 's' : ''} detected
            </p>
            {previewConflicts.map((c, i) => (
              <p key={i} className="text-xs text-[var(--muted)]">
                {c.type.charAt(0).toUpperCase() + c.type.slice(1)} clash on {DAYS[c.day - 1]}
              </p>
            ))}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400 space-y-0.5">
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

// ── Admin directory tab (rooms / cohorts / lecturers) ─────────────────────────

function DirectoryPanel({
  rooms, cohorts, lecturers, onAddRoom, onDeleteRoom, onAddCohort, onDeleteCohort,
  onAddLecturer, onDeleteLecturer,
}: {
  rooms: TRoom[]; cohorts: TCohort[]; lecturers: TLecturer[];
  onAddRoom: (r: Omit<TRoom, 'id'>) => Promise<void>;
  onDeleteRoom: (id: number) => Promise<void>;
  onAddCohort: (c: Omit<TCohort, 'id'>) => Promise<void>;
  onDeleteCohort: (id: number) => Promise<void>;
  onAddLecturer: (l: Omit<TLecturer, 'id'>) => Promise<void>;
  onDeleteLecturer: (id: number) => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<'rooms' | 'cohorts' | 'lecturers'>('rooms');
  const tabBtn = (t: typeof subTab) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      subTab === t ? 'bg-white/10 text-white' : 'text-[var(--muted)] hover:text-white'
    }`;

  // ── quick-add forms ─────────────────────────────────────────────────────────
  const [roomForm, setRoomForm] = useState({ name: '', type: 'lecture', capacity: '', floor: '' });
  const [cohortForm, setCohortForm] = useState({ code: '', title: '', faculty: 'ICT', year: '1', level: 'Undergraduate' });
  const [lectForm, setLectForm] = useState({ name: '', faculty: 'ICT', email: '' });
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]">
      <div className="flex gap-1 border-b border-white/10 p-3">
        <button className={tabBtn('rooms')}     onClick={() => setSubTab('rooms')}>     <DoorOpen    size={12} className="mr-1 inline" />Rooms</button>
        <button className={tabBtn('cohorts')}   onClick={() => setSubTab('cohorts')}>   <GraduationCap size={12} className="mr-1 inline" />Cohorts</button>
        <button className={tabBtn('lecturers')} onClick={() => setSubTab('lecturers')}> <UserSquare2 size={12} className="mr-1 inline" />Lecturers</button>
      </div>

      <div className="p-4">
        {subTab === 'rooms' && (
          <>
            <table className="w-full text-xs text-[var(--muted)]">
              <thead><tr className="border-b border-white/5 text-left"><th className="pb-1.5">Name</th><th className="pb-1.5">Type</th><th className="pb-1.5">Cap</th><th className="pb-1.5">Floor</th><th /></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 text-white">{r.name}</td>
                    <td className="py-1.5">{r.type}</td>
                    <td className="py-1.5">{r.capacity}</td>
                    <td className="py-1.5">{r.floor}</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => onDeleteRoom(r.id)} className={btn('danger')}><Trash2 size={10} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <input className={input} placeholder="Name" value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} />
              <select className={select} value={roomForm.type} onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))}>
                {['lecture','lab','studio','seminar'].map(t => <option key={t}>{t}</option>)}
              </select>
              <input className={input} placeholder="Capacity" type="number" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))} />
              <input className={input} placeholder="Floor" value={roomForm.floor} onChange={e => setRoomForm(f => ({ ...f, floor: e.target.value }))} />
            </div>
            <button
              className={`${btn('primary')} mt-2`}
              onClick={async () => {
                if (!roomForm.name) return;
                setSaving(true);
                await onAddRoom({ name: roomForm.name, type: roomForm.type as TRoom['type'], capacity: Number(roomForm.capacity) || 0, floor: roomForm.floor });
                setRoomForm({ name: '', type: 'lecture', capacity: '', floor: '' });
                setSaving(false);
              }}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add room
            </button>
          </>
        )}

        {subTab === 'cohorts' && (
          <>
            <table className="w-full text-xs text-[var(--muted)]">
              <thead><tr className="border-b border-white/5 text-left"><th className="pb-1.5">Code</th><th className="pb-1.5">Faculty</th><th className="pb-1.5">Year</th><th className="pb-1.5">Level</th><th /></tr></thead>
              <tbody>
                {cohorts.map(c => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="py-1.5 text-white">{c.code}</td>
                    <td className="py-1.5">{c.faculty}</td>
                    <td className="py-1.5">{c.year}</td>
                    <td className="py-1.5">{c.level}</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => onDeleteCohort(c.id)} className={btn('danger')}><Trash2 size={10} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <input className={input} placeholder="Code (BSSE3)" value={cohortForm.code} onChange={e => setCohortForm(f => ({ ...f, code: e.target.value }))} />
              <input className={input} placeholder="Title" value={cohortForm.title} onChange={e => setCohortForm(f => ({ ...f, title: e.target.value }))} />
              <select className={select} value={cohortForm.faculty} onChange={e => setCohortForm(f => ({ ...f, faculty: e.target.value }))}>
                {['ICT','Business','Design','Communication'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <button
              className={`${btn('primary')} mt-2`}
              onClick={async () => {
                if (!cohortForm.code) return;
                setSaving(true);
                await onAddCohort({ code: cohortForm.code, title: cohortForm.title, faculty: cohortForm.faculty, year: Number(cohortForm.year) || 1, level: cohortForm.level });
                setCohortForm({ code: '', title: '', faculty: 'ICT', year: '1', level: 'Undergraduate' });
                setSaving(false);
              }}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add cohort
            </button>
          </>
        )}

        {subTab === 'lecturers' && (
          <>
            <table className="w-full text-xs text-[var(--muted)]">
              <thead><tr className="border-b border-white/5 text-left"><th className="pb-1.5">Name</th><th className="pb-1.5">Faculty</th><th className="pb-1.5">Email</th><th /></tr></thead>
              <tbody>
                {lecturers.map(l => (
                  <tr key={l.id} className="border-b border-white/5">
                    <td className="py-1.5 text-white">{l.name}</td>
                    <td className="py-1.5">{l.faculty}</td>
                    <td className="py-1.5">{l.email}</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => onDeleteLecturer(l.id)} className={btn('danger')}><Trash2 size={10} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <input className={input} placeholder="Name" value={lectForm.name} onChange={e => setLectForm(f => ({ ...f, name: e.target.value }))} />
              <select className={select} value={lectForm.faculty} onChange={e => setLectForm(f => ({ ...f, faculty: e.target.value }))}>
                {['ICT','Business','Design','Communication'].map(x => <option key={x}>{x}</option>)}
              </select>
              <input className={input} placeholder="Email" value={lectForm.email} onChange={e => setLectForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <button
              className={`${btn('primary')} mt-2`}
              onClick={async () => {
                if (!lectForm.name) return;
                setSaving(true);
                await onAddLecturer({ name: lectForm.name, faculty: lectForm.faculty, email: lectForm.email });
                setLectForm({ name: '', faculty: 'ICT', email: '' });
                setSaving(false);
              }}
            >
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
  usePageTitle('Class Timetable');
  const { user } = useAuth();
  const isAdmin = user?.email === 'andrewpjlangeveldt@gmail.com';

  // ── Data ───────────────────────────────────────────────────────────────────
  const [rooms,     setRooms]     = useState<TRoom[]>([]);
  const [cohorts,   setCohorts]   = useState<TCohort[]>([]);
  const [lecturers, setLecturers] = useState<TLecturer[]>([]);
  const [sessions,  setSessions]  = useState<TSession[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
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

  // ── Computed ────────────────────────────────────────────────────────────────
  const activeSessions = useMemo(() => sessions.filter(s => !s.deleted), [sessions]);
  const conflicts      = useMemo(() => detectConflicts(activeSessions), [activeSessions]);

  // ── View state ─────────────────────────────────────────────────────────────
  const [tab, setTab]           = useState<Tab>('grid');
  const [dayFilter, setDayFilter] = useState<number | null>(null);

  // ── Session form ────────────────────────────────────────────────────────────
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Partial<TSession>>({});

  const openAdd  = (day?: number) => { setEditTarget({ day_of_week: day ?? 1 }); setFormOpen(true); };
  const openEdit = (s: TSession)  => { setEditTarget(s); setFormOpen(true); };
  const closeForm = ()            => { setFormOpen(false); setEditTarget({}); };

  const handleSave = async (d: Omit<TSession, 'id' | 'deleted'>) => {
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

  const handleDelete = async (id: number) => {
    if (!supabase || !confirm('Delete this session?')) return;
    await supabase.from('tt_sessions').update({ deleted: true }).eq('id', id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, deleted: true } : s));
  };

  // ── Directory handlers ──────────────────────────────────────────────────────
  const addRoom     = async (r: Omit<TRoom,'id'>)     => { if (!supabase) return; await supabase.from('tt_rooms').insert(r); await load(); };
  const delRoom     = async (id: number)               => { if (!supabase) return; await supabase.from('tt_rooms').delete().eq('id', id); await load(); };
  const addCohort   = async (c: Omit<TCohort,'id'>)   => { if (!supabase) return; await supabase.from('tt_cohorts').insert(c); await load(); };
  const delCohort   = async (id: number)               => { if (!supabase) return; await supabase.from('tt_cohorts').delete().eq('id', id); await load(); };
  const addLecturer = async (l: Omit<TLecturer,'id'>) => { if (!supabase) return; await supabase.from('tt_lecturers').insert(l); await load(); };
  const delLecturer = async (id: number)               => { if (!supabase) return; await supabase.from('tt_lecturers').delete().eq('id', id); await load(); };

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Sessions',  value: activeSessions.length },
    { label: 'Rooms',     value: rooms.length },
    { label: 'Cohorts',   value: cohorts.length },
    { label: 'Lecturers', value: lecturers.length },
    { label: 'Conflicts', value: conflicts.length, warn: conflicts.length > 0 },
  ];

  // ── Tab bar ──────────────────────────────────────────────────────────────────
  const tabBtn2 = (t: Tab) =>
    `flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors ${
      tab === t ? 'bg-white/10 text-white' : 'text-[var(--muted)] hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            Andrew<span className="text-[var(--brand-bright)]">.</span>Langeveldt
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="hidden items-center gap-1.5 rounded-full border border-[var(--brand-bright)]/30 bg-[var(--brand-bright)]/10 px-2.5 py-1 text-xs text-[var(--brand-bright)] sm:flex">
                <ShieldCheck size={11} /> Admin
              </span>
            )}
            <Link to="/#work" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white">
              <ArrowLeft size={15} /> Portfolio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Live · Supabase-backed
        </span>
        <h1 className="mt-5 font-display text-4xl font-light text-white sm:text-5xl">
          Class Timetable <span className="text-[var(--brand-bright)]">Scheduler</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          University timetable management with real-time conflict detection — room, lecturer, and cohort clashes surfaced instantly. Sessions persist to Supabase; changes are live for every visitor.
        </p>

        {/* Faculty legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(FACULTY_COLOURS).map(([fac, col]) => (
            <span key={fac} className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span className="h-2 w-2 rounded-full" style={{ background: col }} /> {fac}
            </span>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-20">
        {/* KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {kpis.map(k => (
            <div key={k.label} className="rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3">
              <p className="text-xs text-[var(--muted)]">{k.label}</p>
              <p className={`mt-0.5 font-display text-2xl ${k.warn ? 'text-red-400' : 'text-white'}`}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tab bar + actions */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-2xl border border-white/10 bg-[var(--surface)] p-1">
            <button className={tabBtn2('grid')}      onClick={() => setTab('grid')}>
              <LayoutGrid size={14} /> Schedule
            </button>
            <button className={tabBtn2('conflicts')} onClick={() => setTab('conflicts')}>
              <AlertTriangle size={14} />
              Conflicts {conflicts.length > 0 && (
                <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                  {conflicts.length}
                </span>
              )}
            </button>
            {isAdmin && (
              <button className={tabBtn2('directory')} onClick={() => setTab('directory')}>
                <BookOpen size={14} /> Directory
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {tab === 'grid' && (
              <select
                className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] focus:outline-none"
                value={dayFilter ?? ''}
                onChange={e => setDayFilter(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">All days</option>
                {['Monday','Tuesday','Wednesday','Thursday','Friday'].map((d, i) => (
                  <option key={i + 1} value={i + 1}>{d}</option>
                ))}
              </select>
            )}
            {isAdmin && tab === 'grid' && (
              <button onClick={() => openAdd()} className={btn('primary')}>
                <Plus size={13} /> Add session
              </button>
            )}
            <button onClick={load} className={btn()} title="Refresh">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-32 text-sm text-[var(--muted)]">
            <Loader2 size={16} className="animate-spin" /> Loading timetable…
          </div>
        ) : error ? (
          <div className="py-24 text-center text-sm text-red-400">{error}</div>
        ) : tab === 'grid' ? (
          <TimetableGrid
            sessions={activeSessions}
            rooms={rooms}
            cohorts={cohorts}
            lecturers={lecturers}
            conflicts={conflicts}
            dayFilter={dayFilter}
            isAdmin={isAdmin}
            onEdit={openEdit}
            onDelete={handleDelete}
            onAdd={openAdd}
          />
        ) : tab === 'conflicts' ? (
          <ConflictPanel
            conflicts={conflicts}
            sessions={activeSessions}
            rooms={rooms}
            cohorts={cohorts}
            lecturers={lecturers}
            onEdit={openEdit}
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
          Self-hosted · Supabase PostgreSQL · TypeScript conflict detection · No external analytics
        </p>
      </main>

      {formOpen && (
        <SessionForm
          initial={editTarget}
          rooms={rooms}
          cohorts={cohorts}
          lecturers={lecturers}
          existingSessions={sessions}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      <Footer />
    </div>
  );
}
