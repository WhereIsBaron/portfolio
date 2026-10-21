import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Activity, Database, HardDrive, Gauge, Clock,
  ShieldCheck, Play, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Cpu, Layers, Search, ChevronRight, Terminal, RotateCcw, Info,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import Footer from '@/components/Footer';

// ─────────────────────────────────────────────────────────────────────────
// Oracle DBA Console — focused single-page demo.
//
// A simulated DBA operations console modelled on the daily job of an Oracle
// database administrator: instance health, backup & recovery, SQL performance
// tuning (with an EXPLAIN plan-tree visualiser), and a script runner that
// executes against a seeded schema. Everything is generated from a seeded PRNG
// so the numbers are stable run-to-run — it is a simulation, not a live DB.
//
// Reference systems (UX/feature study only — no code reused): CloudBeaver
// (web SQL workbench) and Percona Monitoring & Management (instance health
// dashboards). All logic, data and UI here are original.
// ─────────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rint = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

// ── Instance health ─────────────────────────────────────────────────────────

const rng = mulberry32(90125);

type Tablespace = { name: string; usedGb: number; totalGb: number; autoextend: boolean };
const TABLESPACES: Tablespace[] = [
  { name: 'SYSTEM',   usedGb: 1.1,  totalGb: 2,   autoextend: false },
  { name: 'SYSAUX',   usedGb: 3.4,  totalGb: 5,   autoextend: true  },
  { name: 'USERS',    usedGb: 48.2, totalGb: 64,  autoextend: true  },
  { name: 'DATA_IDX', usedGb: 29.7, totalGb: 32,  autoextend: false },
  { name: 'TEMP',     usedGb: 6.8,  totalGb: 16,  autoextend: true  },
  { name: 'UNDOTBS1', usedGb: 4.1,  totalGb: 8,   autoextend: true  },
];

type WaitEvent = { event: string; class: string; pct: number };
const WAIT_EVENTS: WaitEvent[] = [
  { event: 'db file sequential read', class: 'User I/O',      pct: 34 },
  { event: 'CPU + wait for CPU',      class: 'CPU',           pct: 28 },
  { event: 'log file sync',           class: 'Commit',        pct: 14 },
  { event: 'db file scattered read',  class: 'User I/O',      pct: 11 },
  { event: 'enq: TX - row lock',      class: 'Concurrency',   pct: 8  },
  { event: 'direct path read temp',   class: 'User I/O',      pct: 5  },
];

type Session = { sid: number; user: string; status: 'ACTIVE' | 'INACTIVE'; sql: string; waitSec: number };
const SESSION_USERS = ['APP_RW', 'APP_RO', 'BATCH', 'REPORTS', 'DBSNMP', 'ETL_SVC'];
const SESSION_SQL = [
  'SELECT * FROM orders WHERE status = :1',
  'UPDATE inventory SET qty = qty - :1 WHERE sku = :2',
  'INSERT INTO audit_log (actor, action) VALUES (:1, :2)',
  'SELECT /*+ INDEX(c) */ ... FROM customers c',
  'MERGE INTO dim_product USING stg_product ...',
  'DELETE FROM session_cache WHERE expires < SYSDATE',
];
const SESSIONS: Session[] = Array.from({ length: 11 }, (_, i) => {
  const active = rng() > 0.45;
  return {
    sid: 100 + rint(rng, 1, 899),
    user: SESSION_USERS[i % SESSION_USERS.length],
    status: (active ? 'ACTIVE' : 'INACTIVE') as Session['status'],
    sql: SESSION_SQL[i % SESSION_SQL.length],
    waitSec: active ? rint(rng, 0, 42) : 0,
  };
}).sort((a, b) => b.waitSec - a.waitSec);

const INSTANCE = {
  name: 'ORCLCDB',
  version: '19.21.0.0',
  uptimeDays: 72,
  cpuPct: 61,
  memPct: 74,
  sgaGb: 12,
  pgaGb: 4,
  hitRatio: 98.7,
};

// ── Backup & recovery ─────────────────────────────────────────────────────────

type BackupJob = {
  id: string;
  type: 'L0 Full' | 'L1 Incremental' | 'Archivelog';
  status: 'COMPLETED' | 'RUNNING' | 'FAILED';
  startedAgoH: number;
  durationMin: number;
  sizeGb: number;
};
const BACKUP_JOBS: BackupJob[] = [
  { id: 'RMAN-2048', type: 'L1 Incremental', status: 'COMPLETED', startedAgoH: 6,   durationMin: 18, sizeGb: 7.4 },
  { id: 'RMAN-2047', type: 'Archivelog',     status: 'COMPLETED', startedAgoH: 12,  durationMin: 4,  sizeGb: 1.2 },
  { id: 'RMAN-2046', type: 'L1 Incremental', status: 'COMPLETED', startedAgoH: 30,  durationMin: 17, sizeGb: 6.9 },
  { id: 'RMAN-2045', type: 'Archivelog',     status: 'FAILED',    startedAgoH: 36,  durationMin: 1,  sizeGb: 0   },
  { id: 'RMAN-2044', type: 'L0 Full',        status: 'COMPLETED', startedAgoH: 54,  durationMin: 92, sizeGb: 58.3 },
];

type RestorePoint = { name: string; scn: number; agoH: number; guaranteed: boolean };
const RESTORE_POINTS: RestorePoint[] = [
  { name: 'BEFORE_REL_4_2', scn: 14_882_019, agoH: 3,  guaranteed: true  },
  { name: 'NIGHTLY_SNAP',   scn: 14_861_440, agoH: 12, guaranteed: false },
  { name: 'PRE_PATCH_1921', scn: 14_702_885, agoH: 54, guaranteed: true  },
];

// ── Query performance + EXPLAIN plan trees ──────────────────────────────────────

type PlanNode = {
  op: string;
  object?: string;
  rows: number;
  costPct: number; // share of total cost, for the heat bar
  children?: PlanNode[];
};

type TopSql = {
  sqlId: string;
  text: string;
  execs: number;
  elapsedSec: number;
  cpuSec: number;
  buffers: number;
  plan: PlanNode;
  tuning: string;
};

const TOP_SQL: TopSql[] = [
  {
    sqlId: '7fd2a9kx1m0qp',
    text: 'SELECT o.id, c.name, SUM(ol.qty*ol.price) total\n  FROM orders o JOIN customers c ON c.id = o.customer_id\n  JOIN order_lines ol ON ol.order_id = o.id\n WHERE o.status = :1\n GROUP BY o.id, c.name',
    execs: 18_442,
    elapsedSec: 412.6,
    cpuSec: 288.1,
    buffers: 9_120_334,
    tuning: 'orders.status has no index — the optimiser falls back to a FULL scan of 2.1M rows. A composite index on (status, customer_id) removes the full scan and the costliest step.',
    plan: {
      op: 'HASH GROUP BY', rows: 142_000, costPct: 6,
      children: [{
        op: 'HASH JOIN', rows: 142_000, costPct: 14,
        children: [
          { op: 'HASH JOIN', rows: 88_000, costPct: 11, children: [
            { op: 'TABLE ACCESS FULL', object: 'ORDERS', rows: 2_100_000, costPct: 52 },
            { op: 'INDEX FAST FULL SCAN', object: 'CUSTOMERS_PK', rows: 120_000, costPct: 5 },
          ]},
          { op: 'TABLE ACCESS BY INDEX ROWID', object: 'ORDER_LINES', rows: 6_300_000, costPct: 9, children: [
            { op: 'INDEX RANGE SCAN', object: 'ORDER_LINES_FK', rows: 6_300_000, costPct: 3 },
          ]},
        ],
      }],
    },
  },
  {
    sqlId: 'b3n8 qd71zcvw'.replace(' ', ''),
    text: 'UPDATE inventory SET qty = qty - :1\n WHERE sku = :2 AND warehouse_id = :3',
    execs: 240_118,
    elapsedSec: 96.2,
    cpuSec: 61.0,
    buffers: 1_880_210,
    tuning: 'Already using the unique index — hot-row contention on popular SKUs shows up as "enq: TX - row lock". Consider application-level batching rather than an index change.',
    plan: {
      op: 'UPDATE', object: 'INVENTORY', rows: 1, costPct: 10,
      children: [{
        op: 'INDEX UNIQUE SCAN', object: 'INVENTORY_SKU_WH_UK', rows: 1, costPct: 90,
      }],
    },
  },
  {
    sqlId: 'q9m1 x7hh2k4tt'.replace(' ', ''),
    text: 'SELECT product_id, SUM(qty) FROM order_lines\n GROUP BY product_id\n ORDER BY SUM(qty) DESC\n FETCH FIRST 20 ROWS ONLY',
    execs: 1_204,
    elapsedSec: 58.9,
    cpuSec: 40.4,
    buffers: 740_990,
    tuning: 'A materialized view refreshed nightly would turn this nightly top-sellers report from a 6.3M-row aggregation into a 20-row lookup.',
    plan: {
      op: 'SORT ORDER BY (STOPKEY)', rows: 20, costPct: 22,
      children: [{
        op: 'HASH GROUP BY', rows: 85_000, costPct: 31,
        children: [
          { op: 'INDEX FAST FULL SCAN', object: 'ORDER_LINES_PROD_IDX', rows: 6_300_000, costPct: 47 },
        ],
      }],
    },
  },
];

// ── SQL script runner ───────────────────────────────────────────────────────────

type ScriptResult = {
  columns: string[];
  rows: (string | number)[][];
  log: string[];
  feedback: string;
};

const SCRIPTS: { label: string; sql: string; run: () => ScriptResult }[] = [
  {
    label: 'Top tablespaces by usage',
    sql: "SELECT tablespace_name, used_gb, total_gb,\n       ROUND(used_gb/total_gb*100,1) pct_used\n  FROM dba_tablespace_usage\n ORDER BY pct_used DESC;",
    run: () => ({
      columns: ['TABLESPACE_NAME', 'USED_GB', 'TOTAL_GB', 'PCT_USED'],
      rows: [...TABLESPACES]
        .map((t) => [t.name, t.usedGb, t.totalGb, Math.round((t.usedGb / t.totalGb) * 1000) / 10])
        .sort((a, b) => (b[3] as number) - (a[3] as number)),
      log: [
        'SQL*Plus: Release 19.0.0.0.0',
        'Connected to: Oracle Database 19c Enterprise Edition',
        'Executing query against DBA_TABLESPACE_USAGE ...',
      ],
      feedback: '6 rows selected. (0.012s)',
    }),
  },
  {
    label: 'Create index to fix top SQL',
    sql: "CREATE INDEX orders_status_cust_idx\n  ON orders (status, customer_id)\n  TABLESPACE data_idx\n  PARALLEL 4 NOLOGGING;\n\nEXEC DBMS_STATS.GATHER_TABLE_STATS('APP','ORDERS');",
    run: () => ({
      columns: ['STEP', 'OBJECT', 'STATUS'],
      rows: [
        ['CREATE INDEX', 'ORDERS_STATUS_CUST_IDX', 'CREATED'],
        ['ALTER INDEX NOPARALLEL', 'ORDERS_STATUS_CUST_IDX', 'DONE'],
        ['GATHER_TABLE_STATS', 'APP.ORDERS', 'DONE'],
      ],
      log: [
        'Building index on ORDERS (status, customer_id) with PARALLEL 4 ...',
        'Index built: 2,100,000 rows scanned, 142,018 distinct key prefixes.',
        'Resetting index to NOPARALLEL for OLTP access.',
        'Gathering optimiser statistics (AUTO_SAMPLE_SIZE) ...',
        'Re-costing SQL 7fd2a9kx1m0qp: FULL scan → INDEX RANGE SCAN.',
      ],
      feedback: 'Index created. Estimated cost of top SQL: -58%.',
    }),
  },
  {
    label: 'Daily health check',
    sql: "SELECT metric, value, threshold, verdict\n  FROM v$db_health_check\n ORDER BY DECODE(verdict,'WARN',0,1), metric;",
    run: () => ({
      columns: ['METRIC', 'VALUE', 'THRESHOLD', 'VERDICT'],
      rows: [
        ['DATA_IDX pct used', '92.8%', '90%', 'WARN'],
        ['Buffer cache hit', '98.7%', '95%', 'OK'],
        ['Last RMAN L0 age (h)', 54, 168, 'OK'],
        ['Failed jobs (24h)', 1, 0, 'WARN'],
        ['Blocked sessions', 0, 3, 'OK'],
        ['Archivelog dest full', '41%', '85%', 'OK'],
      ],
      log: [
        'Running daily health check pack ...',
        'Querying V$SYSMETRIC, DBA_HIST_* and RMAN catalog ...',
        '2 checks breached a threshold — see VERDICT = WARN.',
      ],
      feedback: '6 rows selected. 2 warnings raised.',
    }),
  },
];

// ── Shared UI helpers ───────────────────────────────────────────────────────────

const card = 'rounded-2xl border border-white/10 bg-[var(--surface)]';

function usageColour(pct: number) {
  if (pct >= 90) return '#f87171';
  if (pct >= 75) return '#fbbf24';
  return '#34d399';
}

const WAIT_CLASS_COLOUR: Record<string, string> = {
  'User I/O': '#60a5fa',
  CPU: '#34d399',
  Commit: '#a78bfa',
  Concurrency: '#f87171',
};

// ── Instance health tab ─────────────────────────────────────────────────────────

function Meter({ label, pct, Icon, sub, highGood }: { label: string; pct: number; Icon: LucideIcon; sub: string; highGood?: boolean }) {
  // Most meters are "lower is better" (usage). highGood flips the scale so a
  // high buffer-cache hit ratio reads healthy (green) rather than critical (red).
  const colour = highGood ? usageColour(100 - pct) : usageColour(pct);
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon size={14} className="text-[var(--brand-bright)]" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-display text-2xl text-white">{pct}%</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colour }} />
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--muted)]/70">{sub}</p>
    </div>
  );
}

function HealthTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Meter label="Host CPU"        pct={INSTANCE.cpuPct} Icon={Cpu}    sub="8 vCPU · load avg 4.9" />
        <Meter label="Memory"          pct={INSTANCE.memPct} Icon={Gauge}  sub={`SGA ${INSTANCE.sgaGb}G · PGA ${INSTANCE.pgaGb}G`} />
        <Meter label="Buffer cache"    pct={INSTANCE.hitRatio} Icon={Layers} sub="hit ratio · target ≥ 95%" highGood />
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Activity size={14} className="text-[var(--brand-bright)]" />
            <span className="text-xs">Sessions</span>
          </div>
          <p className="mt-1 font-display text-2xl text-white">{SESSIONS.length}</p>
          <p className="mt-2 text-[10px] text-[var(--muted)]/70">
            {SESSIONS.filter((s) => s.status === 'ACTIVE').length} active · {SESSIONS.filter((s) => s.status === 'INACTIVE').length} idle
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tablespaces */}
        <div className={card}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <HardDrive size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">Tablespace usage</h3>
          </div>
          <div className="space-y-3 p-5">
            {TABLESPACES.map((t) => {
              const pct = Math.round((t.usedGb / t.totalGb) * 1000) / 10;
              return (
                <div key={t.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-mono text-white">{t.name}</span>
                    <span className="text-[var(--muted)]">
                      {t.usedGb} / {t.totalGb} GB
                      {t.autoextend && <span className="ml-1 text-[10px] text-[var(--brand-bright)]">autoextend</span>}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: usageColour(pct) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wait events */}
        <div className={card}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <Clock size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">Top wait events</h3>
            <span className="ml-auto text-[10px] text-[var(--muted)]">last 60 min · DB time</span>
          </div>
          <div className="space-y-3 p-5">
            {WAIT_EVENTS.map((w) => (
              <div key={w.event}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-mono text-white">{w.event}</span>
                  <span className="text-[var(--muted)]">{w.pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${w.pct}%`, background: WAIT_CLASS_COLOUR[w.class] ?? '#94a3b8' }} />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 pt-1">
              {Object.entries(WAIT_CLASS_COLOUR).map(([cls, col]) => (
                <span key={cls} className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-sm" style={{ background: col }} /> {cls}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className={card}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Activity size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Active session monitor</h3>
          <span className="ml-auto text-[10px] text-[var(--muted)]">V$SESSION</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-[var(--muted)]">
                <th className="px-5 py-2 font-medium">SID</th>
                <th className="px-2 py-2 font-medium">User</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Current SQL</th>
                <th className="px-5 py-2 text-right font-medium">Wait</th>
              </tr>
            </thead>
            <tbody>
              {SESSIONS.map((s) => (
                <tr key={s.sid} className="border-b border-white/5">
                  <td className="px-5 py-2 font-mono text-white">{s.sid}</td>
                  <td className="px-2 py-2 text-[var(--muted)]">{s.user}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-[var(--muted)]'
                    }`}>{s.status}</span>
                  </td>
                  <td className="max-w-[320px] truncate px-2 py-2 font-mono text-[var(--muted)]" title={s.sql}>{s.sql}</td>
                  <td className="px-5 py-2 text-right font-mono text-[var(--muted)]">{s.waitSec ? `${s.waitSec}s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Backup & recovery tab ────────────────────────────────────────────────────────

const BACKUP_STATUS: Record<BackupJob['status'], { Icon: LucideIcon; colour: string; bg: string }> = {
  COMPLETED: { Icon: CheckCircle2, colour: '#34d399', bg: 'bg-emerald-500/15 text-emerald-400' },
  RUNNING:   { Icon: Loader2,      colour: '#60a5fa', bg: 'bg-blue-500/15 text-blue-400' },
  FAILED:    { Icon: XCircle,      colour: '#f87171', bg: 'bg-red-500/15 text-red-400' },
};

function BackupTab() {
  const lastFull = BACKUP_JOBS.find((j) => j.type === 'L0 Full' && j.status === 'COMPLETED');
  const failed = BACKUP_JOBS.filter((j) => j.status === 'FAILED').length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`${card} p-4`}>
          <p className="text-xs text-[var(--muted)]">Last full (L0)</p>
          <p className="mt-1 font-display text-2xl text-white">{lastFull ? `${lastFull.startedAgoH}h` : '—'}</p>
          <p className="mt-1 text-[10px] text-[var(--muted)]/70">ago · {lastFull?.sizeGb} GB</p>
        </div>
        <div className={`${card} p-4`}>
          <p className="text-xs text-[var(--muted)]">Recovery window</p>
          <p className="mt-1 font-display text-2xl text-white">7 days</p>
          <p className="mt-1 text-[10px] text-[var(--muted)]/70">RMAN retention policy</p>
        </div>
        <div className={`${card} p-4`}>
          <p className="text-xs text-[var(--muted)]">Archivelog mode</p>
          <p className="mt-1 font-display text-2xl text-emerald-400">ON</p>
          <p className="mt-1 text-[10px] text-[var(--muted)]/70">FRA 41% used</p>
        </div>
        <div className={`${card} p-4`}>
          <p className="text-xs text-[var(--muted)]">Failed jobs (72h)</p>
          <p className={`mt-1 font-display text-2xl ${failed ? 'text-red-400' : 'text-white'}`}>{failed}</p>
          <p className="mt-1 text-[10px] text-[var(--muted)]/70">needs attention</p>
        </div>
      </div>

      {failed > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">RMAN-2045 archivelog backup failed</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              ORA-19809: limit exceeded for recovery files. The job retried against the FRA before a
              housekeeping script reclaimed space; the next scheduled run completed clean. Suggested fix:
              raise <span className="font-mono">db_recovery_file_dest_size</span> or shorten archivelog retention.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Job history */}
        <div className={`${card} lg:col-span-3`}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <ShieldCheck size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">RMAN backup history</h3>
          </div>
          <div className="divide-y divide-white/5">
            {BACKUP_JOBS.map((j) => {
              const st = BACKUP_STATUS[j.status];
              return (
                <div key={j.id} className="flex items-center gap-3 px-5 py-3">
                  <st.Icon size={16} style={{ color: st.colour }} className={j.status === 'RUNNING' ? 'animate-spin' : ''} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-white">{j.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg}`}>{j.type}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      {j.startedAgoH}h ago · {j.durationMin} min{j.sizeGb ? ` · ${j.sizeGb} GB` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Restore points */}
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <RotateCcw size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">Restore points</h3>
          </div>
          <div className="space-y-3 p-5">
            {RESTORE_POINTS.map((r) => (
              <div key={r.name} className="rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white">{r.name}</span>
                  {r.guaranteed && (
                    <span className="rounded-full bg-[var(--brand-bright)]/15 px-2 py-0.5 text-[10px] text-[var(--brand-bright)]">guaranteed</span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">SCN {r.scn.toLocaleString()} · {r.agoH}h ago</p>
              </div>
            ))}
            <p className="pt-1 text-[10px] text-[var(--muted)]/60">
              Flashback to any guaranteed point is a sub-minute operation vs. a full restore.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Query performance tab + plan tree ─────────────────────────────────────────────

function PlanTreeNode({ node, depth }: { node: PlanNode; depth: number }) {
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 pr-2"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {depth > 0 && <ChevronRight size={11} className="shrink-0 text-[var(--muted)]/50" />}
        <span className="font-mono text-xs text-white">{node.op}</span>
        {node.object && (
          <span className="font-mono text-[11px] text-[var(--brand-bright)]">{node.object}</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--muted)]">{node.rows.toLocaleString()} rows</span>
          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:block">
            <span className="block h-full rounded-full" style={{ width: `${node.costPct}%`, background: usageColour(node.costPct * 1.6) }} />
          </span>
          <span className="w-8 text-right font-mono text-[10px] text-[var(--muted)]">{node.costPct}%</span>
        </span>
      </div>
      {node.children?.map((c, i) => <PlanTreeNode key={i} node={c} depth={depth + 1} />)}
    </div>
  );
}

function PerfTab() {
  const [selected, setSelected] = useState(TOP_SQL[0].sqlId);
  const sql = useMemo(() => TOP_SQL.find((s) => s.sqlId === selected)!, [selected]);
  const maxElapsed = Math.max(...TOP_SQL.map((s) => s.elapsedSec));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Top SQL list */}
      <div className={`${card} lg:col-span-2`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Search size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Top SQL by elapsed time</h3>
        </div>
        <div className="divide-y divide-white/5">
          {TOP_SQL.map((s) => (
            <button
              key={s.sqlId}
              onClick={() => setSelected(s.sqlId)}
              className={`w-full px-5 py-3 text-left transition-colors ${selected === s.sqlId ? 'bg-[var(--brand-bright)]/10' : 'hover:bg-white/5'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-[var(--brand-bright)]">{s.sqlId}</span>
                <span className="font-mono text-[11px] text-white">{s.elapsedSec}s</span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-[var(--muted)]">{s.text.split('\n')[0]}</p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[var(--brand-bright)]/70" style={{ width: `${(s.elapsedSec / maxElapsed) * 100}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-[var(--muted)]/70">{s.execs.toLocaleString()} execs · {s.cpuSec}s CPU</p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected SQL detail + plan tree */}
      <div className={`${card} lg:col-span-3`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Layers size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Execution plan</h3>
          <span className="ml-auto font-mono text-[10px] text-[var(--muted)]">{sql.sqlId}</span>
        </div>
        <div className="p-5">
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3 font-mono text-[11px] leading-relaxed text-[var(--muted)]">{sql.text}</pre>

          <div className="mt-4 rounded-xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-wide text-[var(--muted)]">
              <span>Operation</span>
              <span>Est. rows · cost share</span>
            </div>
            <PlanTreeNode node={sql.plan} depth={0} />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-bright)]/20 bg-[var(--brand-bright)]/5 px-4 py-3">
            <Info size={15} className="mt-0.5 shrink-0 text-[var(--brand-bright)]" />
            <p className="text-xs text-[var(--muted)]"><span className="text-white">Tuning note — </span>{sql.tuning}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SQL script runner tab ─────────────────────────────────────────────────────────

function ScriptTab() {
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const script = SCRIPTS[idx];

  const run = () => {
    setRunning(true);
    setResult(null);
    // Simulate round-trip latency so the console feels live.
    setTimeout(() => {
      setResult(script.run());
      setRunning(false);
    }, 650);
  };

  const verdictCell = (v: string) =>
    v === 'WARN'
      ? 'text-amber-400'
      : v === 'OK'
        ? 'text-emerald-400'
        : 'text-white';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {SCRIPTS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => { setIdx(i); setResult(null); }}
            className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
              idx === i ? 'border-[var(--brand-bright)]/40 bg-[var(--brand-bright)]/10 text-white' : 'border-white/10 text-[var(--muted)] hover:border-white/30 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={card}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Terminal size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">SQL worksheet</h3>
          <button
            onClick={run}
            disabled={running}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-bright)] px-3 py-1.5 text-xs font-medium text-[#0b0d10] transition-colors hover:bg-white disabled:opacity-60"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {running ? 'Running…' : 'Run script'}
          </button>
        </div>
        <pre className="overflow-x-auto px-5 py-4 font-mono text-[12px] leading-relaxed text-[var(--muted)]">{script.sql}</pre>
      </div>

      {(running || result) && (
        <div className={card}>
          <div className="border-b border-white/10 px-5 py-2.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Output log
          </div>
          <div className="space-y-1 px-5 py-3 font-mono text-[11px] text-[var(--muted)]">
            {running && <p className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Connecting to ORCLCDB …</p>}
            {result?.log.map((l, i) => (
              <p key={i}><span className="text-emerald-400">SQL&gt;</span> {l}</p>
            ))}
          </div>

          {result && (
            <>
              <div className="overflow-x-auto border-t border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[var(--muted)]">
                      {result.columns.map((c) => <th key={c} className="px-5 py-2 font-mono font-medium">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {row.map((cell, j) => {
                          const isVerdict = result.columns[j] === 'VERDICT';
                          return (
                            <td key={j} className={`px-5 py-1.5 font-mono ${isVerdict ? verdictCell(String(cell)) : 'text-white'}`}>
                              {typeof cell === 'number' ? cell.toLocaleString() : cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-2.5 font-mono text-[11px] text-emerald-400">{result.feedback}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

type Tab = 'health' | 'backup' | 'perf' | 'script';

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'health', label: 'Instance health', Icon: Activity },
  { key: 'backup', label: 'Backup & recovery', Icon: ShieldCheck },
  { key: 'perf',   label: 'SQL performance', Icon: Gauge },
  { key: 'script', label: 'Script runner', Icon: Terminal },
];

export default function DbaPage() {
  usePageTitle('Oracle DBA Console');
  const [tab, setTab] = useState<Tab>('health');

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
              Andrew<span className="text-[var(--brand-bright)]">.</span>DBA
            </Link>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs text-[var(--muted)] sm:block">Oracle 19c Operations Console</span>
          </div>
          <Link to="/#work" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-white">
            <ArrowLeft size={15} /> Portfolio
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Simulated instance · {INSTANCE.name} {INSTANCE.version}
        </span>
        <h1 className="mt-5 font-display text-4xl font-light text-white sm:text-5xl">
          Oracle DBA <span className="text-[var(--brand-bright)]">Console</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          A day-in-the-life DBA cockpit — monitor instance health, drive RMAN backup &amp; recovery,
          find and tune the heaviest SQL with a visual EXPLAIN plan tree, and run scripts against a
          seeded schema. The data is generated from a fixed seed, so every number is reproducible.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
          <Database size={13} className="text-[var(--brand-bright)]" />
          <span>UX studied from CloudBeaver &amp; Percona PMM — all logic and data here are original.</span>
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
            </button>
          ))}
        </div>

        {tab === 'health' && <HealthTab />}
        {tab === 'backup' && <BackupTab />}
        {tab === 'perf' && <PerfTab />}
        {tab === 'script' && <ScriptTab />}

        <p className="mt-8 text-center text-xs text-[var(--muted)]/60">
          Oracle 19c · RMAN · AWR/ASH-style metrics · cost-based optimiser plans · PL/SQL scripting — simulated client-side
        </p>
      </main>

      <Footer />
    </div>
  );
}
