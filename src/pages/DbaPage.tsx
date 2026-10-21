import { useMemo, useState } from 'react';
import {
  Activity, Clock, HardDrive, ShieldCheck, Play, Loader2, CheckCircle2,
  AlertTriangle, XCircle, Layers, Search, ChevronRight, Terminal, RotateCcw, Info,
  type LucideIcon,
} from 'lucide-react';
import {
  DemoShell, Masthead, TabNav, Panel, Stat, StatusTag, Meter,
  AccentButton, fieldLabel, cx, type TabDef, type Tone,
} from '@/components/demo/kit';

// ─────────────────────────────────────────────────────────────────────────
// Oracle DBA Console — /dba — Andrew.DBA
//
// A DBA operations console modelled on the daily job of an Oracle database
// administrator: instance health, backup & recovery, SQL performance tuning
// (with an EXPLAIN plan-tree visualiser), and a script runner that executes
// against a seeded schema. Everything is generated from a seeded PRNG so the
// numbers are stable run-to-run — it is a simulation, not a live DB.
//
// UX patterns studied from CloudBeaver (web SQL workbench) and Percona
// Monitoring & Management (instance health) — all logic, data and UI are
// original.
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

// ── Tone maps ─────────────────────────────────────────────────────────────────

function pctTone(pct: number): Tone {
  if (pct >= 90) return 'danger';
  if (pct >= 75) return 'warn';
  return 'ok';
}

const WAIT_CLASS_TONE: Record<string, Tone> = {
  'User I/O': 'accent', CPU: 'ok', Commit: 'warn', Concurrency: 'danger',
};

const BACKUP_STATUS: Record<BackupJob['status'], { Icon: LucideIcon; tone: Tone }> = {
  COMPLETED: { Icon: CheckCircle2, tone: 'ok' },
  RUNNING:   { Icon: Loader2,      tone: 'accent' },
  FAILED:    { Icon: XCircle,      tone: 'danger' },
};

const TONE_VAR: Record<Tone, string> = {
  ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)', accent: 'var(--accent)', neutral: 'var(--muted)',
};

// ── Instance health tab ─────────────────────────────────────────────────────────

function GaugeTile({ label, pct, sub, highGood }: { label: string; pct: number; sub: string; highGood?: boolean }) {
  // Most meters are "lower is better" (usage). highGood flips the scale so a
  // high buffer-cache hit ratio reads healthy rather than critical.
  const tone = highGood ? pctTone(100 - pct) : pctTone(pct);
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className={fieldLabel}>{label}</p>
      <p className="mt-2 font-display text-3xl font-medium leading-none tracking-tight text-[var(--ink)]">{pct}%</p>
      <Meter value={pct} max={100} tone={tone} className="mt-3" />
      <p className="mt-2 text-[11px] text-[var(--muted)]">{sub}</p>
    </div>
  );
}

function HealthTab() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        <GaugeTile label="Host CPU" pct={INSTANCE.cpuPct} sub="8 vCPU · load avg 4.9" />
        <GaugeTile label="Memory" pct={INSTANCE.memPct} sub={`SGA ${INSTANCE.sgaGb}G · PGA ${INSTANCE.pgaGb}G`} />
        <GaugeTile label="Buffer cache" pct={INSTANCE.hitRatio} sub="hit ratio · target ≥ 95%" highGood />
        <Stat
          label="Sessions"
          value={String(SESSIONS.length)}
          sub={`${SESSIONS.filter((s) => s.status === 'ACTIVE').length} active · ${SESSIONS.filter((s) => s.status === 'INACTIVE').length} idle`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Tablespaces */}
        <Panel label="Storage" title="Tablespace usage" actions={<HardDrive size={15} className="text-[var(--accent)]" />}>
          <div className="space-y-3.5">
            {TABLESPACES.map((t) => {
              const pct = Math.round((t.usedGb / t.totalGb) * 1000) / 10;
              return (
                <div key={t.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-[var(--ink)]">{t.name}</span>
                    <span className="text-[var(--muted)]">
                      {t.usedGb} / {t.totalGb} GB
                      {t.autoextend && <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">autoextend</span>}
                    </span>
                  </div>
                  <Meter value={pct} max={100} tone={pctTone(pct)} />
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Wait events */}
        <Panel
          label="DB time · last 60 min"
          title="Top wait events"
          actions={<Clock size={15} className="text-[var(--accent)]" />}
        >
          <div className="space-y-3.5">
            {WAIT_EVENTS.map((w) => (
              <div key={w.event}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-[var(--ink)]">{w.event}</span>
                  <span className="font-mono tabular-nums text-[var(--muted)]">{w.pct}%</span>
                </div>
                <Meter value={w.pct} max={100} tone={WAIT_CLASS_TONE[w.class] ?? 'neutral'} />
              </div>
            ))}
            <div className="flex flex-wrap gap-3 pt-1.5">
              {Object.entries(WAIT_CLASS_TONE).map(([cls, tone]) => (
                <span key={cls} className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                  <span className="h-2 w-2" style={{ background: TONE_VAR[tone] }} /> {cls}
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Sessions */}
      <Panel label="V$SESSION" title="Active session monitor" actions={<Activity size={15} className="text-[var(--accent)]" />} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className={cx('px-5 py-2.5 font-medium', fieldLabel)}>SID</th>
                <th className={cx('px-2 py-2.5 font-medium', fieldLabel)}>User</th>
                <th className={cx('px-2 py-2.5 font-medium', fieldLabel)}>Status</th>
                <th className={cx('px-2 py-2.5 font-medium', fieldLabel)}>Current SQL</th>
                <th className={cx('px-5 py-2.5 text-right font-medium', fieldLabel)}>Wait</th>
              </tr>
            </thead>
            <tbody>
              {SESSIONS.map((s) => (
                <tr key={s.sid} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-2.5 font-mono text-[var(--ink)]">{s.sid}</td>
                  <td className="px-2 py-2.5 text-[var(--muted)]">{s.user}</td>
                  <td className="px-2 py-2.5">
                    <StatusTag tone={s.status === 'ACTIVE' ? 'ok' : 'neutral'} dot={false}>{s.status}</StatusTag>
                  </td>
                  <td className="max-w-[320px] truncate px-2 py-2.5 font-mono text-[var(--muted)]" title={s.sql}>{s.sql}</td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-[var(--muted)]">{s.waitSec ? `${s.waitSec}s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ── Backup & recovery tab ────────────────────────────────────────────────────────

function BackupTab() {
  const lastFull = BACKUP_JOBS.find((j) => j.type === 'L0 Full' && j.status === 'COMPLETED');
  const failed = BACKUP_JOBS.filter((j) => j.status === 'FAILED').length;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        <Stat label="Last full (L0)" value={lastFull ? `${lastFull.startedAgoH}h` : '—'} sub={`ago · ${lastFull?.sizeGb} GB`} />
        <Stat label="Recovery window" value="7 days" sub="RMAN retention policy" />
        <Stat label="Archivelog mode" value="ON" sub="FRA 41% used" tone="ok" />
        <Stat label="Failed jobs (72h)" value={String(failed)} sub="needs attention" tone={failed ? 'danger' : 'ok'} />
      </div>

      {failed > 0 && (
        <div className="flex items-start gap-3 border border-[var(--danger)] bg-[var(--danger-bg)] px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          <div>
            <p className="text-sm font-medium text-[var(--danger)]">RMAN-2045 archivelog backup failed</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              ORA-19809: limit exceeded for recovery files. The job retried against the FRA before a
              housekeeping script reclaimed space; the next scheduled run completed clean. Suggested fix:
              raise <span className="font-mono text-[var(--ink)]">db_recovery_file_dest_size</span> or shorten archivelog retention.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Job history */}
        <Panel label="RMAN catalog" title="Backup history" actions={<ShieldCheck size={15} className="text-[var(--accent)]" />} className="lg:col-span-3" bodyClassName="p-0">
          <div className="divide-y divide-[var(--border)]">
            {BACKUP_JOBS.map((j) => {
              const st = BACKUP_STATUS[j.status];
              return (
                <div key={j.id} className="flex items-center gap-3 px-5 py-3.5">
                  <st.Icon size={16} style={{ color: TONE_VAR[st.tone] }} className={j.status === 'RUNNING' ? 'animate-spin' : ''} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--ink)]">{j.id}</span>
                      <StatusTag tone={st.tone} dot={false}>{j.type}</StatusTag>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      {j.startedAgoH}h ago · {j.durationMin} min{j.sizeGb ? ` · ${j.sizeGb} GB` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Restore points */}
        <Panel label="Flashback" title="Restore points" actions={<RotateCcw size={15} className="text-[var(--accent)]" />} className="lg:col-span-2">
          <div className="space-y-3">
            {RESTORE_POINTS.map((r) => (
              <div key={r.name} className="border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[var(--ink)]">{r.name}</span>
                  {r.guaranteed && <StatusTag tone="accent" dot={false}>guaranteed</StatusTag>}
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-[var(--muted)]">SCN {r.scn.toLocaleString()} · {r.agoH}h ago</p>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-[var(--muted)]">
              Flashback to any guaranteed point is a sub-minute operation vs. a full restore.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── Query performance tab + plan tree ─────────────────────────────────────────────

function PlanTreeNode({ node, depth }: { node: PlanNode; depth: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 py-1.5 pr-3" style={{ paddingLeft: `${depth * 18 + 12}px` }}>
        {depth > 0 && <ChevronRight size={11} className="shrink-0 text-[var(--muted)]" />}
        <span className="font-mono text-xs text-[var(--ink)]">{node.op}</span>
        {node.object && <span className="font-mono text-[11px] text-[var(--accent)]">{node.object}</span>}
        <span className="ml-auto flex items-center gap-2.5">
          <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">{node.rows.toLocaleString()} rows</span>
          <Meter value={Math.min(100, node.costPct * 1.6)} max={100} tone={pctTone(node.costPct * 1.6)} className="hidden w-16 sm:block" />
          <span className="w-8 text-right font-mono text-[10px] tabular-nums text-[var(--muted)]">{node.costPct}%</span>
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
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Top SQL list */}
      <Panel label="AWR · elapsed time" title="Top SQL" actions={<Search size={15} className="text-[var(--accent)]" />} className="lg:col-span-2" bodyClassName="p-0">
        <div className="divide-y divide-[var(--border)]">
          {TOP_SQL.map((s) => (
            <button
              key={s.sqlId}
              onClick={() => setSelected(s.sqlId)}
              className={cx('w-full px-5 py-3.5 text-left transition-colors', selected === s.sqlId ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-soft)]')}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-[var(--accent)]">{s.sqlId}</span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--ink)]">{s.elapsedSec}s</span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-[var(--muted)]">{s.text.split('\n')[0]}</p>
              <Meter value={s.elapsedSec} max={maxElapsed} tone="accent" className="mt-2" />
              <p className="mt-1.5 text-[10px] text-[var(--muted)]">{s.execs.toLocaleString()} execs · {s.cpuSec}s CPU</p>
            </button>
          ))}
        </div>
      </Panel>

      {/* Selected SQL detail + plan tree */}
      <Panel
        label={sql.sqlId}
        title="Execution plan"
        actions={<Layers size={15} className="text-[var(--accent)]" />}
        className="lg:col-span-3"
      >
        <pre className="overflow-x-auto border border-[var(--border)] bg-[var(--bg-soft)] p-3 font-mono text-[11px] leading-relaxed text-[var(--ink)]">{sql.text}</pre>

        <div className="mt-4 border border-[var(--border)]">
          <div className={cx('flex items-center justify-between border-b border-[var(--border)] px-3 py-2', fieldLabel)}>
            <span>Operation</span>
            <span>Est. rows · cost share</span>
          </div>
          <PlanTreeNode node={sql.plan} depth={0} />
        </div>

        <div className="mt-4 flex items-start gap-2.5 border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <p className="text-xs text-[var(--muted)]"><span className="text-[var(--ink)]">Tuning note — </span>{sql.tuning}</p>
        </div>
      </Panel>
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

  const verdictClass = (v: string) =>
    v === 'WARN' ? 'text-[var(--warn)]' : v === 'OK' ? 'text-[var(--ok)]' : 'text-[var(--ink)]';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SCRIPTS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => { setIdx(i); setResult(null); }}
            className={cx(
              'border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors',
              idx === i ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Panel
        label="CloudBeaver-style worksheet"
        title="SQL worksheet"
        actions={
          <AccentButton onClick={run} disabled={running}>
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {running ? 'Running…' : 'Run script'}
          </AccentButton>
        }
        bodyClassName="p-0"
      >
        <pre className="overflow-x-auto px-5 py-4 font-mono text-[12px] leading-relaxed text-[var(--ink)]">{script.sql}</pre>
      </Panel>

      {(running || result) && (
        <Panel label="Session" title="Output" actions={<Terminal size={15} className="text-[var(--accent)]" />} bodyClassName="p-0">
          <div className="space-y-1 px-5 py-3.5 font-mono text-[11px] text-[var(--muted)]">
            {running && <p className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Connecting to ORCLCDB …</p>}
            {result?.log.map((l, i) => (
              <p key={i}><span className="text-[var(--ok)]">SQL&gt;</span> {l}</p>
            ))}
          </div>

          {result && (
            <>
              <div className="overflow-x-auto border-t border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      {result.columns.map((c) => <th key={c} className={cx('px-5 py-2.5 font-medium', fieldLabel)}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        {row.map((cell, j) => {
                          const isVerdict = result.columns[j] === 'VERDICT';
                          return (
                            <td key={j} className={cx('px-5 py-2 font-mono', isVerdict ? verdictClass(String(cell)) : 'text-[var(--ink)]')}>
                              {typeof cell === 'number' ? cell.toLocaleString() : cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-[var(--border)] px-5 py-2.5 font-mono text-[11px] text-[var(--ok)]">{result.feedback}</p>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

type Tab = 'health' | 'backup' | 'perf' | 'script';

export default function DbaPage() {
  const [tab, setTab] = useState<Tab>('health');

  const TABS: TabDef<Tab>[] = [
    { id: 'health', label: 'Instance health' },
    { id: 'backup', label: 'Backup & recovery' },
    { id: 'perf', label: 'SQL performance' },
    { id: 'script', label: 'Script runner' },
  ];

  return (
    <DemoShell title="Oracle DBA Console" wordmark="DBA" revealKey={tab}>
      <Masthead
        eyebrow="Oracle database administration · Botswana"
        title="A steady hand on the database."
        lede="A day-in-the-life DBA console: monitor instance health and session waits, drive RMAN backup & recovery with flashback restore points, find and tune the heaviest SQL with a visual EXPLAIN plan tree, and run scripts against a seeded schema. Every number is generated from a fixed seed, so the console is reproducible."
        facts={[
          { label: 'Instance', value: `${INSTANCE.name} · ${INSTANCE.version}` },
          { label: 'Uptime', value: `${INSTANCE.uptimeDays} days` },
          { label: 'Buffer hit', value: `${INSTANCE.hitRatio}%` },
          { label: 'Reference', value: 'CloudBeaver · PMM' },
        ]}
      />

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      <div className="pt-10">
        {tab === 'health' && <HealthTab />}
        {tab === 'backup' && <BackupTab />}
        {tab === 'perf' && <PerfTab />}
        {tab === 'script' && <ScriptTab />}
      </div>

      <p className="mt-12 flex items-center gap-2 border-t border-[var(--border)] pt-6 text-[11px] leading-relaxed text-[var(--muted)]">
        <ShieldCheck size={13} className="shrink-0 text-[var(--accent)]" />
        Oracle 19c instance health, RMAN backup &amp; recovery, cost-based optimiser plan trees and a PL/SQL
        script runner — UX patterns studied from CloudBeaver &amp; Percona PMM; all logic, data and UI are original.
      </p>
    </DemoShell>
  );
}
