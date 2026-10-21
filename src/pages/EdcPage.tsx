import { useMemo, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Lock, CircleDot, FlaskConical,
} from 'lucide-react';
import {
  DemoShell, Masthead, TabNav, Panel, Section, Stat, StatusTag, Meter,
  AccentButton, GhostButton, fieldLabel, cx, type TabDef, type Tone,
} from '@/components/demo/kit';

// ─────────────────────────────────────────────────────────────────────────
// Health Research Data Platform (EDC) — /edc — Andrew.EDC
//
// An Electronic Data Capture console of the kind a clinical research data team
// runs for a multi-site study: an enrolment & data-quality overview, a
// de-identified participant register, an interactive electronic Case Report
// Form with live edit-checks (range / required-field validation that auto-raises
// data queries on save, with a 21 CFR Part 11-style audit trail), and a data-
// query (discrepancy) workbench. Queries raised in the CRF flow straight into
// the workbench, so the data-management loop is real; the seed data is fixed and
// entirely fictional — no real participant data of any kind.
//
// UX patterns studied from OpenClinica — all logic, data and UI are original.
// ─────────────────────────────────────────────────────────────────────────

// ── Seeded PRNG (deterministic demo data) ─────────────────────────────────────
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rint = (rng: () => number, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

// ── Study context ────────────────────────────────────────────────────────────
const STUDY = {
  protocol: 'TB-PREVENT-BW',
  title: 'Short-course TB preventive therapy in adults living with HIV',
  design: 'Phase III · randomised · open-label · 1:1',
  target: 96,
};

type Arm = 'Arm A · 3HP' | 'Arm B · 6H';
const ARMS: Arm[] = ['Arm A · 3HP', 'Arm B · 6H'];

type Site = { code: string; name: string; town: string };
const SITES: Site[] = [
  { code: 'BW-GAB', name: 'Princess Marina Hospital', town: 'Gaborone' },
  { code: 'BW-FRA', name: 'Nyangabgwe Referral Hospital', town: 'Francistown' },
  { code: 'BW-MOL', name: 'Scottish Livingstone Hospital', town: 'Molepolole' },
  { code: 'BW-SER', name: 'Sekgoma Memorial Hospital', town: 'Serowe' },
  { code: 'BW-MAU', name: 'Letsholathebe II Memorial', town: 'Maun' },
];
const SITE_COUNT: Record<string, number> = { 'BW-GAB': 14, 'BW-FRA': 11, 'BW-MOL': 8, 'BW-SER': 6, 'BW-MAU': 5 };

const VISITS = ['Screening', 'Baseline', 'Week 4', 'Week 12', 'Week 24', 'End of study'];

type SubjectStatus = 'Screening' | 'Active' | 'Completed' | 'Withdrawn';

type SubjectT = {
  id: string;
  site: string;
  arm: Arm;
  enrolledDaysAgo: number;
  visitIdx: number; // 0..5 — furthest completed scheduled visit
  status: SubjectStatus;
  crfPct: number;
};

function buildSubjects(): SubjectT[] {
  const rng = mulberry32(20260421);
  const out: SubjectT[] = [];
  for (const site of SITES) {
    const n = SITE_COUNT[site.code];
    for (let i = 1; i <= n; i++) {
      const enrolledDaysAgo = rint(rng, 4, 184);
      const visitIdx = Math.min(5, Math.floor(enrolledDaysAgo / 32));
      const roll = rng();
      let status: SubjectStatus;
      if (roll < 0.08) status = 'Withdrawn';
      else if (visitIdx >= 5) status = 'Completed';
      else if (enrolledDaysAgo <= 10) status = 'Screening';
      else status = 'Active';
      const crfPct =
        status === 'Completed' ? 100 :
        status === 'Screening' ? rint(rng, 10, 40) :
        status === 'Withdrawn' ? rint(rng, 30, 80) :
        rint(rng, 55, 98);
      out.push({
        id: `${site.code}-${String(i).padStart(3, '0')}`,
        site: site.code,
        arm: ARMS[rint(rng, 0, 1)],
        enrolledDaysAgo,
        visitIdx,
        status,
        crfPct,
      });
    }
  }
  return out;
}
const SUBJECTS = buildSubjects();

// ── Data queries (discrepancies) ──────────────────────────────────────────────
type QueryStatus = 'Open' | 'Answered' | 'Closed';
type QueryT = {
  id: string;
  subjectId: string;
  visit: string;
  form: string;
  field: string;
  value: string;
  rule: string;
  status: QueryStatus;
  raisedDaysAgo: number;
  auto: boolean;
};

const SEED_QUERIES: QueryT[] = [
  { id: 'Q-4071', subjectId: 'BW-GAB-004', visit: 'Week 12', form: 'Safety labs', field: 'ALT (liver)', value: '168 U/L', rule: 'Above expected range (≤120) — confirm against source document', status: 'Open', raisedDaysAgo: 3, auto: true },
  { id: 'Q-4068', subjectId: 'BW-FRA-002', visit: 'Baseline', form: 'Vital signs', field: 'Weight', value: '41 kg', rule: 'Low for adult (40–120) — verify against screening weight', status: 'Open', raisedDaysAgo: 6, auto: true },
  { id: 'Q-4066', subjectId: 'BW-MOL-003', visit: 'Week 4', form: 'Adverse events', field: 'Onset date', value: '2026-09-14', rule: 'Onset date is after the report date — chronology error', status: 'Answered', raisedDaysAgo: 9, auto: false },
  { id: 'Q-4063', subjectId: 'BW-SER-001', visit: 'Screening', form: 'Demographics', field: 'Date of birth', value: '—', rule: 'Derived age 17 — below eligibility (≥18). Protocol deviation?', status: 'Open', raisedDaysAgo: 12, auto: false },
  { id: 'Q-4060', subjectId: 'BW-GAB-009', visit: 'Week 24', form: 'Safety labs', field: 'CD4 count', value: '1890 cells/µL', rule: 'Above expected range (200–1500) — confirm units/entry', status: 'Open', raisedDaysAgo: 2, auto: true },
  { id: 'Q-4058', subjectId: 'BW-MAU-002', visit: 'Baseline', form: 'Drug accountability', field: 'Bottles dispensed', value: '—', rule: 'Required field blank — needed to reconcile accountability', status: 'Open', raisedDaysAgo: 1, auto: false },
  { id: 'Q-4051', subjectId: 'BW-FRA-007', visit: 'Week 12', form: 'Vital signs', field: 'Systolic BP', value: '198 mmHg', rule: 'Above expected range (90–180) — repeat measurement recorded?', status: 'Closed', raisedDaysAgo: 15, auto: true },
];

// ── Tone maps ───────────────────────────────────────────────────────────────────
function pctTone(p: number): Tone { return p >= 90 ? 'ok' : p >= 75 ? 'warn' : 'danger'; }

const SUBJECT_TONE: Record<SubjectStatus, Tone> = {
  Screening: 'warn', Active: 'ok', Completed: 'accent', Withdrawn: 'neutral',
};
const QUERY_TONE: Record<QueryStatus, Tone> = {
  Open: 'warn', Answered: 'accent', Closed: 'ok',
};

const siteName = (code: string) => SITES.find((s) => s.code === code)?.town ?? code;
const openCountFor = (id: string, queries: QueryT[]) => queries.filter((q) => q.subjectId === id && q.status === 'Open').length;

function VisitDots({ idx }: { idx: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${idx}/5 scheduled visits`}>
      {VISITS.map((v, i) => (
        <span
          key={v}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i <= idx ? 'var(--accent)' : 'var(--border)' }}
        />
      ))}
    </span>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
const FORM_COMPLETION: { form: string; pct: number }[] = [
  { form: 'Demographics', pct: 98 },
  { form: 'Vital signs', pct: 91 },
  { form: 'Safety labs', pct: 84 },
  { form: 'Adverse events', pct: 88 },
  { form: 'Drug accountability', pct: 79 },
];

function OverviewTab({ queries }: { queries: QueryT[] }) {
  const enrolled = SUBJECTS.length;
  const active = SUBJECTS.filter((s) => s.status === 'Active' || s.status === 'Screening');
  const completeness = Math.round(
    SUBJECTS.filter((s) => s.status !== 'Withdrawn').reduce((a, s) => a + s.crfPct, 0) /
    Math.max(1, SUBJECTS.filter((s) => s.status !== 'Withdrawn').length),
  );
  const openQueries = queries.filter((q) => q.status === 'Open').length;
  const bySite = SITES.map((s) => ({ ...s, n: SUBJECTS.filter((x) => x.site === s.code).length }));
  const maxSite = Math.max(1, ...bySite.map((s) => s.n));
  const armA = SUBJECTS.filter((s) => s.arm === ARMS[0]).length;
  const armB = enrolled - armA;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        <Stat label="Participants enrolled" value={`${enrolled}/${STUDY.target}`} sub={`${Math.round((enrolled / STUDY.target) * 100)}% of target · ${active.length} in follow-up`} />
        <Stat label="Data completeness" value={`${completeness}%`} sub="mean CRF completion (excl. withdrawn)" tone={pctTone(completeness)} />
        <Stat label="Open data queries" value={String(openQueries)} sub="awaiting site response" tone={openQueries > 0 ? 'warn' : 'ok'} />
        <Stat label="Active sites" value={String(SITES.length)} sub="across Botswana" />
      </div>

      <Section label="Data quality" title="Where the study stands">
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel label="Recruitment" title="Enrolment by site">
            <div className="space-y-3.5">
              {bySite.map((s) => (
                <div key={s.code}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{s.town}</span>
                    <span className="font-mono tabular-nums text-[var(--muted)]">{s.code} · {s.n}</span>
                  </div>
                  <Meter value={s.n} max={maxSite} tone="accent" />
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Completeness" title="CRF completion by form">
            <div className="space-y-3.5">
              {FORM_COMPLETION.map((f) => (
                <div key={f.form}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{f.form}</span>
                    <span className="font-mono tabular-nums text-[var(--muted)]">{f.pct}%</span>
                  </div>
                  <Meter value={f.pct} max={100} tone={pctTone(f.pct)} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Section>

      <Panel
        label="Allocation"
        title="Randomisation balance"
        actions={<span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">target 1:1</span>}
      >
        <div className="flex h-9 overflow-hidden border border-[var(--border)]">
          <div className="flex items-center justify-center bg-[var(--accent-soft)] text-[11px] text-[var(--ink)]" style={{ width: `${(armA / SUBJECTS.length) * 100}%` }}>
            {ARMS[0]} · {armA}
          </div>
          <div className="flex items-center justify-center bg-[var(--bg-soft)] text-[11px] text-[var(--ink)]" style={{ width: `${(armB / SUBJECTS.length) * 100}%` }}>
            {ARMS[1]} · {armB}
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-[var(--muted)]">
          Allocation generated by the randomisation module at enrolment; imbalance of ±{Math.abs(armA - armB)} is within tolerance for n={SUBJECTS.length}.
        </p>
      </Panel>
    </div>
  );
}

// ── Participants tab ──────────────────────────────────────────────────────────
const SUBJ_FILTERS: (SubjectStatus | 'All')[] = ['All', 'Screening', 'Active', 'Completed', 'Withdrawn'];

function ParticipantsTab({ queries }: { queries: QueryT[] }) {
  const [filter, setFilter] = useState<SubjectStatus | 'All'>('All');
  const rows = SUBJECTS.filter((s) => filter === 'All' || s.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SUBJ_FILTERS.map((f) => {
          const n = f === 'All' ? SUBJECTS.length : SUBJECTS.filter((s) => s.status === f).length;
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                'border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors',
                on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]'
              )}
            >
              {f} <span className="opacity-60">· {n}</span>
            </button>
          );
        })}
      </div>

      <Panel bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Participant', 'Site', 'Arm', 'Enrolled', 'Visits', 'CRF', 'Queries'].map((h) => (
                  <th key={h} className={cx('px-4 py-3 font-medium first:pl-5', fieldLabel)}>{h}</th>
                ))}
                <th className={cx('px-5 py-3 text-right font-medium', fieldLabel)}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const oq = openCountFor(s.id, queries);
                return (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-soft)]">
                    <td className="px-4 py-3 pl-5 font-mono text-xs text-[var(--ink)]">{s.id}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{siteName(s.site)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{s.arm}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{s.enrolledDaysAgo}d ago</td>
                    <td className="px-4 py-3"><VisitDots idx={s.visitIdx} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Meter value={s.crfPct} max={100} tone={pctTone(s.crfPct)} className="w-16" />
                        <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">{s.crfPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {oq > 0
                        ? <StatusTag tone="warn" dot={false}>{oq} open</StatusTag>
                        : <span className="text-[11px] text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StatusTag tone={SUBJECT_TONE[s.status]} dot={false}>{s.status}</StatusTag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="text-[11px] text-[var(--muted)]">
        Participant identifiers are site-sequential codes only — no names, dates of birth or other identifiers are held in this demo.
      </p>
    </div>
  );
}

// ── Electronic CRF (interactive data capture) ─────────────────────────────────
type FieldDef = {
  key: string;
  label: string;
  unit?: string;
  type: 'number' | 'select';
  options?: string[];
  required: boolean;
  hardMin?: number;
  hardMax?: number;
  alertLow?: number;
  alertHigh?: number;
};

const CRF_FIELDS: FieldDef[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', type: 'number', required: true, hardMin: 25, hardMax: 250, alertLow: 40, alertHigh: 120 },
  { key: 'sbp', label: 'Systolic BP', unit: 'mmHg', type: 'number', required: true, hardMin: 50, hardMax: 260, alertLow: 90, alertHigh: 180 },
  { key: 'dbp', label: 'Diastolic BP', unit: 'mmHg', type: 'number', required: true, hardMin: 30, hardMax: 160, alertLow: 50, alertHigh: 110 },
  { key: 'hr', label: 'Heart rate', unit: 'bpm', type: 'number', required: true, hardMin: 25, hardMax: 220, alertLow: 50, alertHigh: 110 },
  { key: 'temp', label: 'Temperature', unit: '°C', type: 'number', required: true, hardMin: 32, hardMax: 43, alertLow: 35.5, alertHigh: 37.8 },
  { key: 'alt', label: 'ALT (liver)', unit: 'U/L', type: 'number', required: true, hardMin: 1, hardMax: 3000, alertHigh: 120 },
  { key: 'cd4', label: 'CD4 count', unit: 'cells/µL', type: 'number', required: true, hardMin: 0, hardMax: 3000, alertLow: 200, alertHigh: 1500 },
  { key: 'hep', label: 'Symptoms of hepatitis?', type: 'select', options: ['No', 'Yes'], required: true },
];

const PREFILL: Record<string, string> = {
  weight: '72', sbp: '124', dbp: '78', hr: '82', temp: '38.2', alt: '148', cd4: '540', hep: 'No',
};

type CheckLevel = 'ok' | 'incomplete' | 'query' | 'error';
function checkField(def: FieldDef, raw: string): { level: CheckLevel; msg: string } {
  const v = raw.trim();
  if (v === '') return def.required ? { level: 'incomplete', msg: 'Required' } : { level: 'ok', msg: '' };
  if (def.type === 'select') return { level: 'ok', msg: 'Recorded' };
  const n = Number(v);
  if (!Number.isFinite(n)) return { level: 'error', msg: 'Must be numeric' };
  if ((def.hardMin !== undefined && n < def.hardMin) || (def.hardMax !== undefined && n > def.hardMax))
    return { level: 'error', msg: `Implausible — expected ${def.hardMin}–${def.hardMax}${def.unit ? ' ' + def.unit : ''}` };
  if ((def.alertLow !== undefined && n < def.alertLow) || (def.alertHigh !== undefined && n > def.alertHigh)) {
    const lo = def.alertLow ?? '', hi = def.alertHigh ?? '';
    const range = lo !== '' ? `${lo}–${hi}` : `≤${hi}`;
    return { level: 'query', msg: `Outside expected range (${range}) — query on save` };
  }
  return { level: 'ok', msg: 'In range' };
}

const LEVEL_TEXT: Record<CheckLevel, string> = {
  ok: 'text-[var(--ok)]',
  incomplete: 'text-[var(--muted)]',
  query: 'text-[var(--warn)]',
  error: 'text-[var(--danger)]',
};
const LEVEL_BORDER: Record<CheckLevel, string> = {
  ok: 'border-[var(--ok)]',
  incomplete: 'border-[var(--border)]',
  query: 'border-[var(--warn)]',
  error: 'border-[var(--danger)]',
};

type AuditEntry = { field: string; value: string };

function CrfTab({ addQueries }: { addQueries: (items: Omit<QueryT, 'id'>[]) => string[] }) {
  const activeSubjects = SUBJECTS.filter((s) => s.status === 'Active');
  const [subjectId, setSubjectId] = useState(activeSubjects[0]?.id ?? SUBJECTS[0].id);
  const [visit, setVisit] = useState('Week 4');
  const [values, setValues] = useState<Record<string, string>>(PREFILL);
  const [saved, setSaved] = useState<{ raised: string[]; audit: AuditEntry[] } | null>(null);

  const checks = useMemo(
    () => CRF_FIELDS.map((d) => ({ def: d, chk: checkField(d, values[d.key] ?? '') })),
    [values],
  );
  const requiredDone = checks.filter((c) => c.def.required && c.chk.level !== 'incomplete').length;
  const requiredTotal = CRF_FIELDS.filter((d) => d.required).length;
  const completePct = Math.round((requiredDone / requiredTotal) * 100);
  const hasError = checks.some((c) => c.chk.level === 'error');
  const queryCount = checks.filter((c) => c.chk.level === 'query').length;
  const canSave = requiredDone === requiredTotal && !hasError;

  const set = (k: string, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setSaved(null);
  };

  const save = () => {
    const toRaise: Omit<QueryT, 'id'>[] = checks
      .filter((c) => c.chk.level === 'query')
      .map((c) => {
        const lo = c.def.alertLow ?? '', hi = c.def.alertHigh ?? '';
        const range = lo !== '' ? `${lo}–${hi}` : `≤${hi}`;
        return {
          subjectId,
          visit,
          form: 'Vital signs & safety labs',
          field: c.def.label,
          value: `${values[c.def.key]}${c.def.unit ? ' ' + c.def.unit : ''}`,
          rule: `Outside expected range (${range}) — confirm against source document`,
          status: 'Open' as QueryStatus,
          raisedDaysAgo: 0,
          auto: true,
        };
      });
    const ids = addQueries(toRaise);
    const audit: AuditEntry[] = CRF_FIELDS.map((d) => ({
      field: d.label,
      value: `${values[d.key]}${d.unit && values[d.key] ? ' ' + d.unit : ''}`,
    }));
    setSaved({ raised: ids, audit });
  };

  const selectCls = 'w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]';
  const inputCls = (lvl: CheckLevel) =>
    cx('w-full border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors', LEVEL_BORDER[lvl]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      {/* Form */}
      <Panel
        label="Electronic case report form"
        title="Vital signs & safety labs"
        actions={
          <StatusTag tone={saved ? (saved.raised.length ? 'warn' : 'ok') : 'neutral'} dot={false}>
            {saved ? (saved.raised.length ? `${saved.raised.length} quer${saved.raised.length === 1 ? 'y' : 'ies'} raised` : 'Saved clean') : 'In progress'}
          </StatusTag>
        }
      >
        {/* Context selectors */}
        <div className="grid grid-cols-2 gap-3">
          <label className={fieldLabel}>
            Participant
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSaved(null); }} className={cx(selectCls, 'mt-1.5')}>
              {activeSubjects.map((s) => <option key={s.id} value={s.id}>{s.id} · {siteName(s.site)}</option>)}
            </select>
          </label>
          <label className={fieldLabel}>
            Visit event
            <select value={visit} onChange={(e) => { setVisit(e.target.value); setSaved(null); }} className={cx(selectCls, 'mt-1.5')}>
              {VISITS.slice(1).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        </div>

        {/* Fields */}
        <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
          {checks.map(({ def, chk }) => (
            <div key={def.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs text-[var(--muted)]">
                  {def.label}{def.unit ? <span className="opacity-60"> ({def.unit})</span> : null}
                  {def.required && <span className="text-[var(--accent)]"> *</span>}
                </label>
                {chk.level === 'ok' && <CheckCircle2 size={12} className="text-[var(--ok)]" />}
                {chk.level === 'query' && <AlertTriangle size={12} className="text-[var(--warn)]" />}
                {chk.level === 'error' && <AlertTriangle size={12} className="text-[var(--danger)]" />}
              </div>
              {def.type === 'select' ? (
                <select value={values[def.key] ?? ''} onChange={(e) => set(def.key, e.target.value)} className={inputCls(chk.level)}>
                  {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  inputMode="decimal"
                  value={values[def.key] ?? ''}
                  onChange={(e) => set(def.key, e.target.value)}
                  className={inputCls(chk.level)}
                  placeholder="—"
                />
              )}
              {chk.msg && <p className={cx('mt-1 text-[10px]', LEVEL_TEXT[chk.level])}>{chk.msg}</p>}
            </div>
          ))}
        </div>

        {/* Completeness + save */}
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Required fields complete</span>
            <span className="font-mono tabular-nums text-[var(--ink)]">{requiredDone}/{requiredTotal}</span>
          </div>
          <Meter value={completePct} max={100} tone={pctTone(completePct)} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AccentButton onClick={save} disabled={!canSave}>Save &amp; complete form</AccentButton>
            <span className="text-[11px] text-[var(--muted)]">
              {hasError
                ? 'Resolve implausible values before saving.'
                : requiredDone < requiredTotal
                  ? `${requiredTotal - requiredDone} required field(s) still blank.`
                  : queryCount > 0
                    ? `${queryCount} value(s) outside range — saving will auto-raise a query each.`
                    : 'All values in range — form will save clean.'}
            </span>
          </div>
        </div>
      </Panel>

      {/* Audit trail / edit-check legend */}
      <div className="space-y-5">
        <Panel
          label="21 CFR Part 11 style"
          title="Audit trail"
          actions={<Lock size={14} className="text-[var(--accent)]" />}
        >
          {saved ? (
            <div className="space-y-2.5">
              <p className="text-[11px] text-[var(--muted)]">
                {subjectId} · {visit} — signed by <span className="text-[var(--ink)]">Andrew L.</span> (Data Associate) · just now
              </p>
              <ul className="divide-y divide-[var(--border)] border border-[var(--border)]">
                {saved.audit.map((a) => (
                  <li key={a.field} className="flex items-center justify-between px-3 py-2 text-[11px]">
                    <span className="text-[var(--muted)]">{a.field}</span>
                    <span className="font-mono text-[var(--ink)]">{a.value || '—'}</span>
                  </li>
                ))}
              </ul>
              {saved.raised.length > 0 && (
                <p className="border border-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 text-[11px] text-[var(--warn)]">
                  Auto-raised {saved.raised.join(', ')} — see the Data queries tab.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Every value written is logged with the entering user, a timestamp and the form context. Save the form to record this entry; out-of-range values raise a data query automatically.
            </p>
          )}
        </Panel>

        <Panel
          label="Validation"
          title="Edit checks"
          actions={<ShieldCheck size={14} className="text-[var(--accent)]" />}
        >
          <ul className="space-y-2.5 text-[11px] text-[var(--muted)]">
            <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[var(--ok)]" /> In range — accepted</li>
            <li className="flex items-center gap-2"><AlertTriangle size={12} className="text-[var(--warn)]" /> Outside expected range — raises a query on save</li>
            <li className="flex items-center gap-2"><AlertTriangle size={12} className="text-[var(--danger)]" /> Implausible — blocks save until corrected</li>
            <li className="flex items-center gap-2"><CircleDot size={12} className="text-[var(--muted)]" /> Required fields marked with *</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

// ── Data queries tab ──────────────────────────────────────────────────────────
const QUERY_FILTERS: (QueryStatus | 'All')[] = ['All', 'Open', 'Answered', 'Closed'];

function QueriesTab({ queries, setQueries }: { queries: QueryT[]; setQueries: React.Dispatch<React.SetStateAction<QueryT[]>> }) {
  const [filter, setFilter] = useState<QueryStatus | 'All'>('Open');
  const rows = queries.filter((q) => filter === 'All' || q.status === filter);

  const setStatus = (id: string, status: QueryStatus) =>
    setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {QUERY_FILTERS.map((f) => {
          const n = f === 'All' ? queries.length : queries.filter((q) => q.status === f).length;
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                'border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors',
                on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]'
              )}
            >
              {f} <span className="opacity-60">· {n}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <Panel><p className="py-6 text-center text-sm text-[var(--muted)]">No {filter !== 'All' ? filter.toLowerCase() : ''} queries.</p></Panel>
        )}
        {rows.map((q) => (
          <div key={q.id} className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[var(--ink)]">{q.id}</span>
                  <StatusTag tone={QUERY_TONE[q.status]} dot={false}>{q.status}</StatusTag>
                  <span className="border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
                    {q.auto ? 'Auto edit-check' : 'Manual review'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--ink)]">{q.field}: <span className="font-mono">{q.value}</span></p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{q.rule}</p>
                <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                  {q.subjectId} · {q.visit} · {q.form} · raised {q.raisedDaysAgo === 0 ? 'just now' : `${q.raisedDaysAgo}d ago`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {q.status === 'Open' && (
                  <GhostButton onClick={() => setStatus(q.id, 'Answered')}>Mark answered</GhostButton>
                )}
                {q.status !== 'Closed' && (
                  <AccentButton onClick={() => setStatus(q.id, 'Closed')}><CheckCircle2 size={13} /> Close</AccentButton>
                )}
                {q.status === 'Closed' && (
                  <GhostButton onClick={() => setStatus(q.id, 'Open')}>Re-open</GhostButton>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'participants' | 'crf' | 'queries';

export default function EdcPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [queries, setQueries] = useState<QueryT[]>(SEED_QUERIES);

  const addQueries = (items: Omit<QueryT, 'id'>[]): string[] => {
    const existing = queries.filter((q) => q.id.startsWith('Q-5')).length;
    const ids = items.map((_, i) => `Q-${5001 + existing + i}`);
    const made: QueryT[] = items.map((it, i) => ({ ...it, id: ids[i] }));
    setQueries((prev) => [...made, ...prev]);
    return ids;
  };

  const openQueries = queries.filter((q) => q.status === 'Open').length;

  const TABS: TabDef<Tab>[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'participants', label: 'Participants' },
    { id: 'crf', label: 'Data capture' },
    { id: 'queries', label: 'Data queries', count: openQueries || undefined },
  ];

  return (
    <DemoShell title="Health Research Data Platform" wordmark="EDC" revealKey={tab}>
      <Masthead
        eyebrow="Clinical research data management · Botswana"
        live="Live edit-checks"
        title="Clean data, captured at the point of care."
        lede="An Electronic Data Capture console for a multi-site clinical study: track enrolment and data completeness, browse a de-identified participant register, and capture a visit on an electronic Case Report Form whose edit-checks validate every value as you type and raise a data query the moment something falls out of range. Raised queries flow straight to the discrepancy workbench."
        facts={[
          { label: 'Protocol', value: STUDY.protocol },
          { label: 'Design', value: 'Phase III · 1:1' },
          { label: 'Sites', value: `${SITES.length} across Botswana` },
          { label: 'Reference', value: 'OpenClinica (UX)' },
        ]}
      />

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      <div className="pt-10">
        {tab === 'overview' && <OverviewTab queries={queries} />}
        {tab === 'participants' && <ParticipantsTab queries={queries} />}
        {tab === 'crf' && <CrfTab addQueries={addQueries} />}
        {tab === 'queries' && <QueriesTab queries={queries} setQueries={setQueries} />}
      </div>

      <p className="mt-12 flex items-center gap-2 border-t border-[var(--border)] pt-6 text-[11px] leading-relaxed text-[var(--muted)]">
        <FlaskConical size={13} className="shrink-0 text-[var(--accent)]" />
        An enrolment overview, a de-identified participant register, an electronic CRF with live edit-checks and a
        21 CFR Part 11-style audit trail, and a data-query workbench — UX patterns studied from OpenClinica; all
        logic, data and UI are original, with fictional data only.
      </p>
    </DemoShell>
  );
}
