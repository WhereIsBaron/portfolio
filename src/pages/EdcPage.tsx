import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Activity, Users, FlaskConical, ClipboardList, ShieldCheck,
  AlertTriangle, CheckCircle2, Clock, MapPin, HeartPulse, Database,
  ListChecks, Lock, CircleDot, type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import Footer from '@/components/Footer';

// ─────────────────────────────────────────────────────────────────────────
// Health Research Data Platform (EDC) — focused single-page demo.
//
// A simulated Electronic Data Capture console of the kind a clinical research
// data team runs for a multi-site study: an enrolment & data-quality overview,
// a de-identified participant register, an interactive electronic Case Report
// Form with live edit-checks (range / required-field validation that auto-raises
// data queries on save, with a 21 CFR Part 11-style audit trail), and a data-
// query (discrepancy) workbench. Queries raised in the CRF flow straight into
// the workbench, so the data-management loop is real; the seed data is fixed and
// entirely fictional — no real participant data of any kind.
//
// Reference system (UX/feature study only — no code reused): OpenClinica.
// All logic, data and UI here are original.
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
const FORMS = ['Demographics', 'Vital signs', 'Safety labs', 'Adverse events', 'Drug accountability'];

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

// ── Shared UI ─────────────────────────────────────────────────────────────────
const card = 'rounded-2xl border border-white/10 bg-[var(--surface)]';

function pctColour(p: number) { return p >= 90 ? '#34d399' : p >= 75 ? '#fbbf24' : '#f87171'; }

const STATUS_BG: Record<SubjectStatus, string> = {
  Screening: 'bg-blue-500/15 text-blue-400',
  Active: 'bg-[var(--brand-bright)]/15 text-[var(--brand-bright)]',
  Completed: 'bg-emerald-500/15 text-emerald-400',
  Withdrawn: 'bg-white/10 text-[var(--muted)]',
};
const QUERY_BG: Record<QueryStatus, string> = {
  Open: 'bg-amber-500/15 text-amber-400',
  Answered: 'bg-blue-500/15 text-blue-400',
  Closed: 'bg-emerald-500/15 text-emerald-400',
};

function Kpi({ label, value, sub, Icon, warn }: { label: string; value: string; sub: string; Icon: LucideIcon; warn?: boolean }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon size={14} className="text-[var(--brand-bright)]" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`mt-1 font-display text-2xl ${warn ? 'text-amber-400' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] text-[var(--muted)]/70">{sub}</p>
    </div>
  );
}

function VisitDots({ idx }: { idx: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${idx}/5 scheduled visits`}>
      {VISITS.map((v, i) => (
        <span
          key={v}
          className={`h-1.5 w-1.5 rounded-full ${i <= idx ? 'bg-[var(--brand-bright)]' : 'bg-white/15'}`}
        />
      ))}
    </span>
  );
}

const siteName = (code: string) => SITES.find((s) => s.code === code)?.town ?? code;
const openCountFor = (id: string, queries: QueryT[]) => queries.filter((q) => q.subjectId === id && q.status === 'Open').length;

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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Participants enrolled" value={`${enrolled}/${STUDY.target}`} sub={`${Math.round((enrolled / STUDY.target) * 100)}% of target · ${active.length} in follow-up`} Icon={Users} />
        <Kpi label="Data completeness" value={`${completeness}%`} sub="mean CRF completion (excl. withdrawn)" Icon={Database} />
        <Kpi label="Open data queries" value={String(openQueries)} sub="awaiting site response" Icon={AlertTriangle} warn={openQueries > 0} />
        <Kpi label="Active sites" value={String(SITES.length)} sub="across Botswana" Icon={MapPin} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Enrolment by site */}
        <div className={`${card} p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={15} className="text-[var(--brand-bright)]" />
            <h3 className="font-display text-sm text-white">Enrolment by site</h3>
          </div>
          <div className="space-y-3">
            {bySite.map((s) => (
              <div key={s.code}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-white">{s.town}</span>
                  <span className="text-[var(--muted)]">{s.code} · {s.n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-[var(--brand-bright)]/70" style={{ width: `${(s.n / maxSite) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CRF completion by form */}
        <div className={`${card} p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={15} className="text-[var(--brand-bright)]" />
            <h3 className="font-display text-sm text-white">CRF completion by form</h3>
          </div>
          <div className="space-y-3">
            {FORM_COMPLETION.map((f) => (
              <div key={f.form}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-white">{f.form}</span>
                  <span className="text-[var(--muted)]">{f.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: pctColour(f.pct) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Randomisation balance */}
      <div className={`${card} p-5`}>
        <div className="mb-4 flex items-center gap-2">
          <ListChecks size={15} className="text-[var(--brand-bright)]" />
          <h3 className="font-display text-sm text-white">Randomisation balance</h3>
          <span className="text-[10px] text-[var(--muted)]">target 1:1</span>
        </div>
        <div className="flex h-7 overflow-hidden rounded-lg border border-white/10">
          <div className="flex items-center justify-center bg-[var(--brand-bright)]/30 text-[11px] text-white" style={{ width: `${(armA / SUBJECTS.length) * 100}%` }}>
            {ARMS[0]} · {armA}
          </div>
          <div className="flex items-center justify-center bg-white/10 text-[11px] text-white" style={{ width: `${(armB / SUBJECTS.length) * 100}%` }}>
            {ARMS[1]} · {armB}
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[var(--muted)]/70">
          Allocation generated by the randomisation module at enrolment; imbalance of ±{Math.abs(armA - armB)} is within tolerance for n={SUBJECTS.length}.
        </p>
      </div>
    </div>
  );
}

// ── Participants tab ──────────────────────────────────────────────────────────
const SUBJ_FILTERS: (SubjectStatus | 'All')[] = ['All', 'Screening', 'Active', 'Completed', 'Withdrawn'];

function ParticipantsTab({ queries }: { queries: QueryT[] }) {
  const [filter, setFilter] = useState<SubjectStatus | 'All'>('All');
  const rows = SUBJECTS.filter((s) => filter === 'All' || s.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUBJ_FILTERS.map((f) => {
          const n = f === 'All' ? SUBJECTS.length : SUBJECTS.filter((s) => s.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                filter === f ? 'border-[var(--brand-bright)]/40 bg-[var(--brand-bright)]/10 text-white' : 'border-white/10 text-[var(--muted)] hover:text-white'
              }`}
            >
              {f} <span className="text-[var(--muted)]">· {n}</span>
            </button>
          );
        })}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Participant</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Arm</th>
                <th className="px-4 py-3 font-medium">Enrolled</th>
                <th className="px-4 py-3 font-medium">Visits</th>
                <th className="px-4 py-3 font-medium">CRF</th>
                <th className="px-4 py-3 font-medium">Queries</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const oq = openCountFor(s.id, queries);
                return (
                  <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-white">{s.id}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{siteName(s.site)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{s.arm}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{s.enrolledDaysAgo}d ago</td>
                    <td className="px-4 py-3"><VisitDots idx={s.visitIdx} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${s.crfPct}%`, background: pctColour(s.crfPct) }} />
                        </div>
                        <span className="text-[11px] text-[var(--muted)]">{s.crfPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {oq > 0
                        ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">{oq} open</span>
                        : <span className="text-[11px] text-[var(--muted)]/60">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BG[s.status]}`}>{s.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-[var(--muted)]/60">
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

const LEVEL_STYLE: Record<CheckLevel, string> = {
  ok: 'text-emerald-400',
  incomplete: 'text-[var(--muted)]',
  query: 'text-amber-400',
  error: 'text-red-400',
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

  const inputCls = (lvl: CheckLevel) =>
    `w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none transition-colors ${
      lvl === 'error' ? 'border-red-500/50' : lvl === 'query' ? 'border-amber-500/50' : lvl === 'incomplete' ? 'border-white/10' : 'border-emerald-500/40'
    }`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Form */}
      <div className={`${card} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HeartPulse size={16} className="text-[var(--brand-bright)]" />
            <h3 className="font-display text-sm text-white">Vital signs &amp; safety labs</h3>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${saved ? (saved.raised.length ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400') : 'bg-white/10 text-[var(--muted)]'}`}>
            {saved ? (saved.raised.length ? `Complete · ${saved.raised.length} quer${saved.raised.length === 1 ? 'y' : 'ies'} raised` : 'Complete · clean') : 'In progress'}
          </span>
        </div>

        {/* Context selectors */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-[var(--muted)]">
            Participant
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSaved(null); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none">
              {activeSubjects.map((s) => <option key={s.id} value={s.id}>{s.id} · {siteName(s.site)}</option>)}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            Visit event
            <select value={visit} onChange={(e) => { setVisit(e.target.value); setSaved(null); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none">
              {VISITS.slice(1).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        </div>

        {/* Fields */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {checks.map(({ def, chk }) => (
            <div key={def.key}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs text-[var(--muted)]">
                  {def.label}{def.unit ? <span className="text-[var(--muted)]/60"> ({def.unit})</span> : null}
                  {def.required && <span className="text-[var(--brand-bright)]"> *</span>}
                </label>
                {chk.level === 'ok' && <CheckCircle2 size={12} className="text-emerald-400" />}
                {chk.level === 'query' && <AlertTriangle size={12} className="text-amber-400" />}
                {chk.level === 'error' && <AlertTriangle size={12} className="text-red-400" />}
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
              {chk.msg && <p className={`mt-1 text-[10px] ${LEVEL_STYLE[chk.level]}`}>{chk.msg}</p>}
            </div>
          ))}
        </div>

        {/* Completeness + save */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Required fields complete</span>
            <span className="text-white">{requiredDone}/{requiredTotal}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full" style={{ width: `${completePct}%`, background: pctColour(completePct) }} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={!canSave}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                canSave ? 'bg-[var(--brand-bright)] text-black hover:opacity-90' : 'cursor-not-allowed bg-white/10 text-[var(--muted)]'
              }`}
            >
              Save &amp; complete form
            </button>
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
      </div>

      {/* Audit trail / edit-check legend */}
      <div className="space-y-4">
        <div className={`${card} p-5`}>
          <div className="mb-3 flex items-center gap-2">
            <Lock size={14} className="text-[var(--brand-bright)]" />
            <h3 className="font-display text-sm text-white">Audit trail</h3>
            <span className="text-[10px] text-[var(--muted)]">21 CFR Part 11 style</span>
          </div>
          {saved ? (
            <div className="space-y-2">
              <p className="text-[11px] text-[var(--muted)]">
                {subjectId} · {visit} — signed by <span className="text-white">Andrew L.</span> (Data Associate) · just now
              </p>
              <ul className="space-y-1">
                {saved.audit.map((a) => (
                  <li key={a.field} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px]">
                    <span className="text-[var(--muted)]">{a.field}</span>
                    <span className="font-mono text-white">{a.value || '—'}</span>
                  </li>
                ))}
              </ul>
              {saved.raised.length > 0 && (
                <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-400">
                  Auto-raised {saved.raised.join(', ')} — see the Data queries tab.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--muted)]/70">
              Every value written is logged with the entering user, a timestamp and the form context. Save the form to record this entry; out-of-range values raise a data query automatically.
            </p>
          )}
        </div>

        <div className={`${card} p-5`}>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[var(--brand-bright)]" />
            <h3 className="font-display text-sm text-white">Edit checks</h3>
          </div>
          <ul className="space-y-2 text-[11px] text-[var(--muted)]">
            <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400" /> In range — accepted</li>
            <li className="flex items-center gap-2"><AlertTriangle size={12} className="text-amber-400" /> Outside expected range — raises a query on save</li>
            <li className="flex items-center gap-2"><AlertTriangle size={12} className="text-red-400" /> Implausible — blocks save until corrected</li>
            <li className="flex items-center gap-2"><CircleDot size={12} className="text-[var(--muted)]" /> Required fields marked with *</li>
          </ul>
        </div>
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {QUERY_FILTERS.map((f) => {
          const n = f === 'All' ? queries.length : queries.filter((q) => q.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                filter === f ? 'border-[var(--brand-bright)]/40 bg-[var(--brand-bright)]/10 text-white' : 'border-white/10 text-[var(--muted)] hover:text-white'
              }`}
            >
              {f} <span className="text-[var(--muted)]">· {n}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className={`${card} p-8 text-center text-sm text-[var(--muted)]`}>No {filter !== 'All' ? filter.toLowerCase() : ''} queries.</div>
        )}
        {rows.map((q) => (
          <div key={q.id} className={`${card} p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-white">{q.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${QUERY_BG[q.status]}`}>{q.status}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--muted)]">{q.auto ? 'Auto edit-check' : 'Manual review'}</span>
                </div>
                <p className="mt-1.5 text-sm text-white">{q.field}: <span className="font-mono">{q.value}</span></p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{q.rule}</p>
                <p className="mt-1 text-[10px] text-[var(--muted)]/70">
                  {q.subjectId} · {q.visit} · {q.form} · raised {q.raisedDaysAgo === 0 ? 'just now' : `${q.raisedDaysAgo}d ago`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {q.status === 'Open' && (
                  <button onClick={() => setStatus(q.id, 'Answered')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white">
                    Mark answered
                  </button>
                )}
                {q.status !== 'Closed' && (
                  <button onClick={() => setStatus(q.id, 'Closed')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25">
                    <CheckCircle2 size={13} /> Close
                  </button>
                )}
                {q.status === 'Closed' && (
                  <button onClick={() => setStatus(q.id, 'Open')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white">
                    Re-open
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'participants' | 'crf' | 'queries';
const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', Icon: Activity },
  { key: 'participants', label: 'Participants', Icon: Users },
  { key: 'crf', label: 'Data capture', Icon: ClipboardList },
  { key: 'queries', label: 'Data queries', Icon: FlaskConical },
];

export default function EdcPage() {
  usePageTitle('Health Research Data Platform');
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

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
              Andrew<span className="text-[var(--brand-bright)]">.</span>EDC
            </Link>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs text-[var(--muted)] sm:block">Health Research Data Platform</span>
          </div>
          <Link to="/#work" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-white">
            <ArrowLeft size={15} /> Portfolio
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Simulated EDC · live edit-checks
        </span>
        <h1 className="mt-5 font-display text-4xl font-light text-white sm:text-5xl">
          Health Research <span className="text-[var(--brand-bright)]">Data Platform</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          An Electronic Data Capture console for a multi-site clinical study — track enrolment and data
          completeness, browse a de-identified participant register, and capture a visit on an electronic
          Case Report Form whose edit-checks validate every value as you type and raise a data query the
          moment something falls out of range. Queries flow straight to the discrepancy workbench.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5"><Database size={13} className="text-[var(--brand-bright)]" /> {STUDY.protocol} · {STUDY.design}</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[var(--brand-bright)]" /> UX studied from OpenClinica — all logic, data and UI are original (fictional data only).</span>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-20">
        {/* Tab bar */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-[var(--surface)] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white/10 text-white' : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              <t.Icon size={14} /> {t.label}
              {t.key === 'queries' && openQueries > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-400">{openQueries}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab queries={queries} />}
        {tab === 'participants' && <ParticipantsTab queries={queries} />}
        {tab === 'crf' && <CrfTab addQueries={addQueries} />}
        {tab === 'queries' && <QueriesTab queries={queries} setQueries={setQueries} />}

        <p className="mt-8 text-center text-xs text-[var(--muted)]/60">
          Enrolment overview · participant register · electronic CRF with edit-checks · data-query workbench — simulated client-side
        </p>
      </main>

      <Footer />
    </div>
  );
}
