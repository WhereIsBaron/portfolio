import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  Thermometer,
  Droplets,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  BarChart3,
  ClipboardList,
  Package,
  Zap,
  ChevronRight,
  RefreshCw,
  Plus,
  FileText,
  Activity,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type BatchStatus = 'Mixing' | 'Quality Check' | 'Approved' | 'Bottling' | 'Complete' | 'Hold';

interface Batch {
  id: string;
  product: string;
  productCode: string;
  volumeL: number;
  status: BatchStatus;
  started: string;
  operator: string;
  line: string;
  qc: QCCheck[];
  notes?: string;
}

interface QCCheck {
  param: string;
  target: string;
  actual: string | null;
  unit: string;
  pass: boolean | null;
}

interface RawMaterial {
  name: string;
  sku: string;
  stockKg: number;
  minKg: number;
  maxKg: number;
  unit: string;
  location: string;
}

interface SafetyEntry {
  time: string;
  type: 'PTW' | 'Incident' | 'Inspection' | 'Drill';
  description: string;
  status: 'Open' | 'Closed' | 'In Progress';
}

interface ShiftLog {
  time: string;
  author: string;
  note: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const BATCHES: Batch[] = [
  {
    id: 'BT-2026-0441',
    product: 'Heavy-Duty Degreaser',
    productCode: 'HD-500',
    volumeL: 500,
    status: 'Approved',
    started: '06:15',
    operator: 'S. Mogapi',
    line: 'Line A',
    qc: [
      { param: 'pH Level', target: '10.5–11.5', actual: '11.1', unit: 'pH', pass: true },
      { param: 'Active Surfactant', target: '8–12%', actual: '10.4%', unit: '%', pass: true },
      { param: 'Viscosity', target: '200–400', actual: '310', unit: 'cP', pass: true },
      { param: 'Colour', target: 'Clear blue', actual: 'Clear blue', unit: '', pass: true },
      { param: 'Odour', target: 'Citrus / mild', actual: 'Citrus', unit: '', pass: true },
      { param: 'Density', target: '1.02–1.06', actual: '1.04', unit: 'g/mL', pass: true },
    ],
    notes: 'All QC parameters within spec. Released for bottling at 08:50.',
  },
  {
    id: 'BT-2026-0442',
    product: 'Vehicle Wash Concentrate',
    productCode: 'VW-200',
    volumeL: 200,
    status: 'Bottling',
    started: '07:00',
    operator: 'T. Kgosi',
    line: 'Line B',
    qc: [
      { param: 'pH Level', target: '6.5–7.5', actual: '7.0', unit: 'pH', pass: true },
      { param: 'Foam Index', target: '>80', actual: '92', unit: 'mm', pass: true },
      { param: 'Viscosity', target: '500–800', actual: '640', unit: 'cP', pass: true },
      { param: 'Colour', target: 'White/pearlescent', actual: 'White/pearlescent', unit: '', pass: true },
      { param: 'Active Ingredient', target: '15–20%', actual: '17.8%', unit: '%', pass: true },
      { param: 'Density', target: '1.00–1.04', actual: '1.02', unit: 'g/mL', pass: true },
    ],
    notes: 'Batch approved 09:20. Bottling on 500mL line.',
  },
  {
    id: 'BT-2026-0443',
    product: 'Industrial Floor Cleaner',
    productCode: 'IF-100',
    volumeL: 1000,
    status: 'Quality Check',
    started: '08:30',
    operator: 'R. Ditshego',
    line: 'Line A',
    qc: [
      { param: 'pH Level', target: '9.0–10.0', actual: '9.7', unit: 'pH', pass: true },
      { param: 'Alkalinity', target: '0.5–1.5%', actual: '0.9%', unit: '%', pass: true },
      { param: 'Viscosity', target: '100–300', actual: null, unit: 'cP', pass: null },
      { param: 'Colour', target: 'Yellow/amber', actual: null, unit: '', pass: null },
      { param: 'Microbial Count', target: '<100 CFU/mL', actual: null, unit: 'CFU/mL', pass: null },
      { param: 'Density', target: '0.98–1.02', actual: null, unit: 'g/mL', pass: null },
    ],
    notes: 'QC in progress. Awaiting viscosity and micro results from lab.',
  },
  {
    id: 'BT-2026-0444',
    product: 'Antibacterial Hand Soap',
    productCode: 'AH-300',
    volumeL: 300,
    status: 'Mixing',
    started: '09:45',
    operator: 'B. Ncube',
    line: 'Line C',
    qc: [
      { param: 'pH Level', target: '5.5–6.5', actual: null, unit: 'pH', pass: null },
      { param: 'Active Triclosan', target: '0.3–0.5%', actual: null, unit: '%', pass: null },
      { param: 'Viscosity', target: '3000–5000', actual: null, unit: 'cP', pass: null },
      { param: 'Colour', target: 'Clear/pink tint', actual: null, unit: '', pass: null },
      { param: 'Foam Quality', target: '>90 (index)', actual: null, unit: '', pass: null },
      { param: 'Microbial Count', target: '<10 CFU/mL', actual: null, unit: 'CFU/mL', pass: null },
    ],
    notes: 'Batch in mixing phase. Fragrance added at 10:05.',
  },
  {
    id: 'BT-2026-0445',
    product: 'Surface Sanitizer',
    productCode: 'SS-50',
    volumeL: 200,
    status: 'Hold',
    started: '07:30',
    operator: 'L. Moahi',
    line: 'Line B',
    qc: [
      { param: 'Ethanol Content', target: '70–80%', actual: '68.2%', unit: '%', pass: false },
      { param: 'pH Level', target: '6.0–7.5', actual: '6.8', unit: 'pH', pass: true },
      { param: 'Colour', target: 'Clear', actual: 'Slight haze', unit: '', pass: false },
      { param: 'Active Biocide', target: '0.1%', actual: '0.09%', unit: '%', pass: false },
      { param: 'Density', target: '0.85–0.89', actual: '0.86', unit: 'g/mL', pass: true },
      { param: 'Odour', target: 'Alcohol/mild', actual: 'Alcohol', unit: '', pass: true },
    ],
    notes: 'HOLD — Ethanol below spec (68.2% vs 70% target). Ethanol top-up authorised by supervisor. Re-test scheduled 11:30.',
  },
  {
    id: 'BT-2026-0440',
    product: 'Multi-Purpose Cleaner',
    productCode: 'MP-150',
    volumeL: 150,
    status: 'Complete',
    started: '05:00',
    operator: 'S. Mogapi',
    line: 'Line C',
    qc: [
      { param: 'pH Level', target: '7.0–9.0', actual: '8.2', unit: 'pH', pass: true },
      { param: 'Active Surfactant', target: '5–10%', actual: '7.6%', unit: '%', pass: true },
      { param: 'Viscosity', target: '150–400', actual: '290', unit: 'cP', pass: true },
      { param: 'Colour', target: 'Clear/green', actual: 'Clear/green', unit: '', pass: true },
      { param: 'Density', target: '0.99–1.03', actual: '1.01', unit: 'g/mL', pass: true },
      { param: 'Microbial Count', target: '<100 CFU/mL', actual: '12 CFU/mL', unit: 'CFU/mL', pass: true },
    ],
    notes: 'Batch complete. Shipped to warehouse 08:45 (150×1L bottles).',
  },
];

const MATERIALS: RawMaterial[] = [
  { name: 'Sodium Lauryl Sulfate (SLS)', sku: 'RM-001', stockKg: 842, minKg: 200, maxKg: 1500, unit: 'kg', location: 'Bay 1' },
  { name: 'Caustic Soda (NaOH) — 50%', sku: 'RM-002', stockKg: 1240, minKg: 500, maxKg: 3000, unit: 'kg', location: 'Chem Store' },
  { name: 'Ethanol 96% (Pharmaceutical)', sku: 'RM-003', stockKg: 178, minKg: 300, maxKg: 1000, unit: 'L', location: 'Solvent Bay' },
  { name: 'Citric Acid (Anhydrous)', sku: 'RM-004', stockKg: 95, minKg: 100, maxKg: 600, unit: 'kg', location: 'Bay 2' },
  { name: 'Glycerin (USP Grade)', sku: 'RM-005', stockKg: 312, minKg: 50, maxKg: 500, unit: 'kg', location: 'Bay 2' },
  { name: 'RO Water (Purified)', sku: 'RM-006', stockKg: 4500, minKg: 1000, maxKg: 8000, unit: 'L', location: 'Tank Farm' },
  { name: 'EDTA (Chelating Agent)', sku: 'RM-007', stockKg: 28, minKg: 30, maxKg: 200, unit: 'kg', location: 'Bay 3' },
  { name: 'Fragrance Oil (Citrus)', sku: 'RM-008', stockKg: 45, minKg: 20, maxKg: 150, unit: 'kg', location: 'Bay 3' },
  { name: 'MIT Preservative', sku: 'RM-009', stockKg: 12, minKg: 15, maxKg: 80, unit: 'kg', location: 'Bay 3' },
];

const SAFETY: SafetyEntry[] = [
  { time: '06:00', type: 'Inspection', description: 'Pre-shift PPE & housekeeping inspection — Line A, B, C', status: 'Closed' },
  { time: '07:15', type: 'PTW', description: 'Permit to Work: NaOH drum change — Chem Store (authorized: A. Langeveldt)', status: 'Closed' },
  { time: '08:50', type: 'Incident', description: 'Near-miss: minor spill of SLS solution, Bay 1. Cleaned immediately. No injury. Report filed.', status: 'Closed' },
  { time: '09:30', type: 'PTW', description: 'Permit to Work: ethanol tank re-supply from road tanker', status: 'In Progress' },
  { time: '10:45', type: 'Inspection', description: 'Planned fire-exit inspection — Building A & Chem Store', status: 'Open' },
];

const SHIFT_LOG: ShiftLog[] = [
  { time: '06:00', author: 'A. Langeveldt (Supervisor)', note: 'Day shift commenced. 7 operators present. Absent: P. Sithole (sick leave). Batch schedule confirmed with Production Manager.' },
  { time: '07:30', author: 'A. Langeveldt', note: 'BT-2026-0445 (SS-50) placed on HOLD. Ethanol content 68.2% vs 70% spec. Ethanol top-up authorized. Re-test at 11:30.' },
  { time: '08:15', author: 'A. Langeveldt', note: 'NaOH drum change completed under PTW-007. PTW signed off. Area inspected and cleared.' },
  { time: '08:50', author: 'A. Langeveldt', note: 'SLS spill near-miss logged (Bay 1). Root cause: unsecured drum valve. Immediate corrective action taken. Team briefed on drum handling SOP.' },
  { time: '09:20', author: 'T. Kgosi (Operator)', note: 'BT-2026-0442 (VW-200) QC approved. Bottling commenced on 500mL line.' },
  { time: '10:05', author: 'B. Ncube (Operator)', note: 'AH-300 fragrance addition complete. Batch on schedule.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<BatchStatus, { bg: string; text: string; dot: string }> = {
  Mixing:         { bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  'Quality Check':{ bg: 'bg-amber-500/15',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  Approved:       { bg: 'bg-teal-500/15',   text: 'text-teal-400',   dot: 'bg-teal-400' },
  Bottling:       { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-400' },
  Complete:       { bg: 'bg-green-500/15',  text: 'text-green-400',  dot: 'bg-green-400' },
  Hold:           { bg: 'bg-red-500/15',    text: 'text-red-400',    dot: 'bg-red-400' },
};

function StatusBadge({ status }: { status: BatchStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot} ${status === 'Mixing' || status === 'Bottling' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

function OEEGauge({ value }: { value: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ * 0.75; // 270° arc
  const color = value >= 85 ? '#00c9a7' : value >= 65 ? '#f59e0b' : '#ef4444';
  return (
    <svg viewBox="0 0 100 80" className="w-full max-w-[120px]" aria-label={`OEE: ${value}%`}>
      {/* Background arc */}
      <circle cx="50" cy="55" r={r} fill="none" stroke="#1e2d3d" strokeWidth="9"
        strokeDasharray={`${circ * 0.75} ${circ}`} strokeDashoffset={0}
        strokeLinecap="round" transform="rotate(135 50 55)" />
      {/* Value arc */}
      <circle cx="50" cy="55" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${filled} ${circ}`} strokeDashoffset={0}
        strokeLinecap="round" transform="rotate(135 50 55)"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="50" y="52" textAnchor="middle" fontSize="14" fontWeight="700" fill={color} fontFamily="Rajdhani, sans-serif">{value}%</text>
      <text x="50" y="64" textAnchor="middle" fontSize="6" fill="#8fa3bf" fontFamily="Inter, sans-serif">OEE</text>
    </svg>
  );
}

function StockBar({ material }: { material: RawMaterial }) {
  const pct = Math.min(100, (material.stockKg / material.maxKg) * 100);
  const low = material.stockKg <= material.minKg;
  const warn = material.stockKg <= material.minKg * 1.3;
  const color = low ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-teal-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#cbd5e1]">{material.name}</span>
        <span className={`text-xs font-mono font-semibold ${low ? 'text-red-400' : warn ? 'text-amber-400' : 'text-teal-400'}`}>
          {material.stockKg.toLocaleString()} {material.unit}
          {(low || warn) && <span className="ml-1">{low ? '⚠ REORDER' : '!'}</span>}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#1e2d3d]">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'batches' | 'materials' | 'safety' | 'reports';

export default function ProductionPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('batches');
  const [selectedBatch, setSelectedBatch] = useState<Batch>(BATCHES[2]); // QC in progress by default
  const [now, setNow] = useState(new Date());
  const [logExpanded, setLogExpanded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const completed = BATCHES.filter(b => b.status === 'Complete').length;
  const inProgress = BATCHES.filter(b => b.status !== 'Complete').length;
  const holds = BATCHES.filter(b => b.status === 'Hold').length;
  const totalL = BATCHES.filter(b => b.status === 'Complete' || b.status === 'Bottling' || b.status === 'Approved')
    .reduce((s, b) => s + b.volumeL, 0);
  const qcPassed = BATCHES.filter(b => b.status === 'Approved' || b.status === 'Bottling' || b.status === 'Complete').length;
  const qcTotal = BATCHES.filter(b => b.status !== 'Mixing' && b.status !== 'Hold').length;
  const qcRate = qcTotal ? Math.round((qcPassed / qcTotal) * 100) : 0;
  const lowMaterials = MATERIALS.filter(m => m.stockKg <= m.minKg * 1.3).length;

  const shiftTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'batches',   label: 'Batch Tracker',  icon: <FlaskConical size={15} /> },
    { id: 'materials', label: 'Raw Materials',   icon: <Package size={15} /> },
    { id: 'safety',    label: 'Safety & PTW',    icon: <ShieldCheck size={15} /> },
    { id: 'reports',   label: 'Shift Report',    icon: <BarChart3 size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#cbd5e1]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" />

      {/* ── Top Bar ── */}
      <header className="border-b border-[#1e2d3d] bg-[#0d1117] px-5 py-3">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-lg border border-[#1e2d3d] px-3 py-1.5 text-xs text-[#8fa3bf] transition-colors hover:border-[#00c9a7]/40 hover:text-[#00c9a7]"
          >
            <ArrowLeft size={13} /> Back to portfolio
          </button>

          <div className="flex items-center gap-2">
            <span className="rounded bg-[#00c9a7]/10 p-1.5">
              <FlaskConical size={16} className="text-[#00c9a7]" />
            </span>
            <div>
              <p className="text-xs font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.08em' }}>
                CHEMX PRODUCTION OPS
              </p>
              <p className="text-[10px] text-[#8fa3bf]">Morwadi Industrial Park, Mmopane · Line Supervisor View</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-6 text-right">
            <div>
              <p className="font-mono text-sm font-semibold text-[#00c9a7]">{shiftTime}</p>
              <p className="text-[10px] text-[#8fa3bf]">{dateStr}</p>
            </div>
            <div className="rounded-lg border border-[#1e2d3d] bg-[#111827] px-3 py-1.5">
              <p className="text-[10px] text-[#8fa3bf]">Active Shift</p>
              <p className="text-xs font-semibold text-white">Day · 06:00 – 14:00</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#00c9a7]/10 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#00c9a7]" />
              <span className="text-xs font-medium text-[#00c9a7]">Live</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-5">

        {/* ── KPI Tiles ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* OEE */}
          <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center rounded-xl border border-[#1e2d3d] bg-[#111827] p-4">
            <OEEGauge value={79} />
            <p className="mt-1 text-center text-[10px] text-[#8fa3bf]">Overall Equipment<br />Effectiveness</p>
          </div>

          <div className="flex flex-col rounded-xl border border-[#1e2d3d] bg-[#111827] p-4">
            <div className="flex items-center gap-2 text-[#8fa3bf]">
              <Activity size={14} />
              <span className="text-[10px] uppercase tracking-widest">Production Rate</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              342<span className="ml-1 text-base font-normal text-[#8fa3bf]">L/hr</span>
            </p>
            <p className="mt-1 text-[10px] text-teal-400">▲ 8% vs plan</p>
          </div>

          <div className="flex flex-col rounded-xl border border-[#1e2d3d] bg-[#111827] p-4">
            <div className="flex items-center gap-2 text-[#8fa3bf]">
              <Droplets size={14} />
              <span className="text-[10px] uppercase tracking-widest">Volume Out</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {totalL.toLocaleString()}<span className="ml-1 text-base font-normal text-[#8fa3bf]">L</span>
            </p>
            <p className="mt-1 text-[10px] text-[#8fa3bf]">Approved + shipped today</p>
          </div>

          <div className="flex flex-col rounded-xl border border-[#1e2d3d] bg-[#111827] p-4">
            <div className="flex items-center gap-2 text-[#8fa3bf]">
              <CheckCircle2 size={14} />
              <span className="text-[10px] uppercase tracking-widest">QC Pass Rate</span>
            </div>
            <p className={`mt-2 font-display text-3xl font-bold ${qcRate >= 90 ? 'text-teal-400' : 'text-amber-400'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {qcRate}<span className="ml-0.5 text-base font-normal text-[#8fa3bf]">%</span>
            </p>
            <p className="mt-1 text-[10px] text-[#8fa3bf]">{qcPassed}/{qcTotal} batches passed</p>
          </div>

          <div className="flex flex-col rounded-xl border border-[#1e2d3d] bg-[#111827] p-4">
            <div className="flex items-center gap-2 text-[#8fa3bf]">
              <ClipboardList size={14} />
              <span className="text-[10px] uppercase tracking-widest">Batches</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{BATCHES.length}</span>
              <span className="text-[10px] text-[#8fa3bf]">today</span>
            </div>
            <div className="mt-1 flex gap-2 text-[10px]">
              <span className="text-green-400">{completed} done</span>
              <span className="text-amber-400">{inProgress} active</span>
              {holds > 0 && <span className="text-red-400">{holds} hold</span>}
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-[#1e2d3d] bg-[#111827] p-4">
            <div className="flex items-center gap-2 text-[#8fa3bf]">
              <AlertTriangle size={14} />
              <span className="text-[10px] uppercase tracking-widest">Materials Alert</span>
            </div>
            <p className={`mt-2 font-display text-3xl font-bold ${lowMaterials > 0 ? 'text-amber-400' : 'text-teal-400'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {lowMaterials}
            </p>
            <p className="mt-1 text-[10px] text-[#8fa3bf]">items below reorder level</p>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-[#00c9a7] text-[#0d1117]'
                  : 'border border-[#1e2d3d] text-[#8fa3bf] hover:border-[#00c9a7]/40 hover:text-[#00c9a7]'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Batch Tracker ── */}
        {tab === 'batches' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* Batch list */}
            <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#1e2d3d] px-5 py-3">
                <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>ACTIVE BATCH REGISTER</h2>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-lg border border-[#1e2d3d] px-3 py-1.5 text-xs text-[#8fa3bf] hover:text-white">
                    <RefreshCw size={12} /> Refresh
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg bg-[#00c9a7]/10 px-3 py-1.5 text-xs font-medium text-[#00c9a7] hover:bg-[#00c9a7]/20">
                    <Plus size={12} /> New Batch
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e2d3d] text-[10px] uppercase tracking-widest text-[#8fa3bf]">
                      <th className="px-5 py-3 text-left">Batch ID</th>
                      <th className="px-3 py-3 text-left">Product</th>
                      <th className="px-3 py-3 text-left">Vol.</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">Line</th>
                      <th className="px-3 py-3 text-left">Operator</th>
                      <th className="px-3 py-3 text-left">Start</th>
                      <th className="px-3 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {BATCHES.map(b => (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBatch(b)}
                        className={`cursor-pointer border-b border-[#1e2d3d]/50 transition-colors hover:bg-[#162030] ${selectedBatch.id === b.id ? 'bg-[#162030]' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-[#00c9a7]">{b.id}</span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-medium text-white">{b.product}</p>
                          <p className="text-[10px] text-[#8fa3bf]">{b.productCode}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs text-[#cbd5e1]">{b.volumeL.toLocaleString()} L</span>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-3 py-3 text-xs text-[#8fa3bf]">{b.line}</td>
                        <td className="px-3 py-3 text-xs text-[#cbd5e1]">{b.operator}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[#8fa3bf]">{b.started}</td>
                        <td className="px-3 py-3">
                          <ChevronRight size={14} className={`text-[#8fa3bf] transition-colors ${selectedBatch.id === b.id ? 'text-[#00c9a7]' : ''}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QC Detail Panel */}
            <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] overflow-hidden">
              <div className="border-b border-[#1e2d3d] px-5 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>QUALITY CONTROL</h2>
                  <StatusBadge status={selectedBatch.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-[#00c9a7]">{selectedBatch.id}</p>
              </div>

              <div className="p-5">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#8fa3bf]">Product</p>
                    <p className="mt-0.5 text-sm font-medium text-white">{selectedBatch.product}</p>
                    <p className="text-[10px] text-[#8fa3bf]">{selectedBatch.productCode}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#8fa3bf]">Batch Volume</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-white">{selectedBatch.volumeL.toLocaleString()} L</p>
                    <p className="text-[10px] text-[#8fa3bf]">{selectedBatch.line} · {selectedBatch.operator}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1 text-[10px] uppercase tracking-widest text-[#8fa3bf] px-1">
                    <span className="col-span-1">Parameter</span>
                    <span>Target</span>
                    <span>Actual</span>
                    <span>Result</span>
                  </div>
                  {selectedBatch.qc.map((qc) => (
                    <div key={qc.param} className={`grid grid-cols-4 gap-1 rounded-lg p-2.5 text-xs ${
                      qc.pass === null ? 'bg-[#162030]' : qc.pass ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'
                    }`}>
                      <span className="col-span-1 font-medium text-[#cbd5e1]">{qc.param}</span>
                      <span className="font-mono text-[#8fa3bf]">{qc.target}</span>
                      <span className={`font-mono font-semibold ${qc.pass === null ? 'text-[#8fa3bf]' : qc.pass ? 'text-teal-400' : 'text-red-400'}`}>
                        {qc.actual ?? '—'}
                      </span>
                      <span>
                        {qc.pass === null ? <span className="text-[#8fa3bf]">Pending</span>
                          : qc.pass
                            ? <span className="flex items-center gap-1 text-teal-400"><CheckCircle2 size={11} /> Pass</span>
                            : <span className="flex items-center gap-1 text-red-400"><XCircle size={11} /> Fail</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {selectedBatch.notes && (
                  <div className={`mt-4 rounded-lg p-3 text-xs leading-relaxed ${
                    selectedBatch.status === 'Hold' ? 'border border-red-500/30 bg-red-500/5 text-red-300' : 'border border-[#1e2d3d] bg-[#0d1117] text-[#8fa3bf]'
                  }`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#8fa3bf]">Supervisor Notes</p>
                    {selectedBatch.notes}
                  </div>
                )}

                {selectedBatch.status === 'Quality Check' && (
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 rounded-lg bg-teal-500/10 py-2 text-xs font-medium text-teal-400 hover:bg-teal-500/20 border border-teal-500/30">
                      Approve Batch
                    </button>
                    <button className="flex-1 rounded-lg bg-red-500/10 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 border border-red-500/30">
                      Place on Hold
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Raw Materials ── */}
        {tab === 'materials' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>RAW MATERIAL INVENTORY</h2>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/30">
                  {lowMaterials} item{lowMaterials !== 1 ? 's' : ''} need reorder
                </span>
              </div>
              <div className="space-y-4">
                {MATERIALS.map(m => <StockBar key={m.sku} material={m} />)}
              </div>
            </div>

            <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] p-5">
              <h2 className="mb-5 text-sm font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>MATERIAL REGISTER</h2>
              <div className="space-y-2">
                {MATERIALS.map(m => {
                  const low = m.stockKg <= m.minKg;
                  const warn = m.stockKg <= m.minKg * 1.3;
                  return (
                    <div key={m.sku} className="flex items-center justify-between rounded-lg border border-[#1e2d3d] bg-[#0d1117] px-4 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-[#cbd5e1]">{m.name}</p>
                        <p className="text-[10px] text-[#8fa3bf]">{m.sku} · {m.location}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono text-xs font-semibold ${low ? 'text-red-400' : warn ? 'text-amber-400' : 'text-teal-400'}`}>
                          {m.stockKg.toLocaleString()} {m.unit}
                        </p>
                        <p className="text-[10px] text-[#8fa3bf]">Min: {m.minKg.toLocaleString()} {m.unit}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Safety & PTW ── */}
        {tab === 'safety' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] overflow-hidden">
              <div className="border-b border-[#1e2d3d] px-5 py-3">
                <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>SAFETY, HEALTH & ENVIRONMENT LOG</h2>
                <p className="text-[10px] text-[#8fa3bf]">Day shift · {dateStr.split(',')[0]}</p>
              </div>
              <div className="divide-y divide-[#1e2d3d]">
                {SAFETY.map((s, i) => {
                  const typeColor: Record<SafetyEntry['type'], string> = {
                    PTW: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
                    Incident: 'text-red-400 bg-red-500/10 border-red-500/30',
                    Inspection: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
                    Drill: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                  };
                  const statusColor: Record<SafetyEntry['status'], string> = {
                    Open: 'text-amber-400',
                    Closed: 'text-teal-400',
                    'In Progress': 'text-blue-400',
                  };
                  return (
                    <div key={i} className="flex gap-4 px-5 py-4">
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs text-[#00c9a7]">{s.time}</p>
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeColor[s.type]}`}>{s.type}</span>
                          <span className={`text-[10px] font-medium ${statusColor[s.status]}`}>{s.status}</span>
                        </div>
                        <p className="text-xs text-[#cbd5e1]">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] p-5">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8fa3bf]">SHE Dashboard</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Days without LTI', value: '142', color: 'text-teal-400' },
                    { label: 'PPE Compliance', value: '100%', color: 'text-teal-400' },
                    { label: 'Open PTWs', value: '1', color: 'text-blue-400' },
                    { label: 'Near-misses today', value: '1', color: 'text-amber-400' },
                    { label: 'SOP deviations', value: '0', color: 'text-teal-400' },
                    { label: 'Open incidents', value: '0', color: 'text-teal-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between border-b border-[#1e2d3d] pb-2">
                      <span className="text-xs text-[#cbd5e1]">{item.label}</span>
                      <span className={`font-mono text-sm font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Hazardous Materials On-Site</h3>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-[#cbd5e1]">
                  <p>⬥ Caustic Soda (NaOH) — Corrosive · GHS05/07</p>
                  <p>⬥ Ethanol 96% — Flammable · GHS02/07</p>
                  <p>⬥ MIT Preservative — Harmful · GHS07/09</p>
                  <p>⬥ SLS — Irritant · GHS07</p>
                </div>
                <p className="mt-3 text-[10px] text-amber-400/70">All SDS documents current. Chem Store locked. PPE mandatory in all production areas.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Reports / Shift Summary ── */}
        {tab === 'reports' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] overflow-hidden">
              <div className="border-b border-[#1e2d3d] px-5 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>SHIFT HANDOVER LOG</h2>
                <button className="flex items-center gap-1.5 rounded-lg bg-[#00c9a7]/10 px-3 py-1.5 text-xs font-medium text-[#00c9a7] border border-[#00c9a7]/30 hover:bg-[#00c9a7]/20">
                  <Plus size={12} /> Add Entry
                </button>
              </div>
              <div className="divide-y divide-[#1e2d3d]">
                {(logExpanded ? SHIFT_LOG : SHIFT_LOG.slice(0, 4)).map((l, i) => (
                  <div key={i} className="flex gap-4 px-5 py-4">
                    <div className="shrink-0">
                      <p className="font-mono text-xs font-semibold text-[#00c9a7]">{l.time}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-[#8fa3bf]">{l.author}</p>
                      <p className="text-xs leading-relaxed text-[#cbd5e1]">{l.note}</p>
                    </div>
                  </div>
                ))}
              </div>
              {!logExpanded && (
                <button onClick={() => setLogExpanded(true)} className="w-full px-5 py-3 text-center text-xs text-[#00c9a7] hover:bg-[#162030] border-t border-[#1e2d3d]">
                  Show all {SHIFT_LOG.length} entries
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] p-5">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8fa3bf]">Day Shift Summary</h3>
                <div className="space-y-3 text-xs">
                  {[
                    { label: 'Batches scheduled', value: '6' },
                    { label: 'Batches started', value: '6' },
                    { label: 'Batches complete', value: '1' },
                    { label: 'Total volume produced', value: `${totalL.toLocaleString()} L` },
                    { label: 'QC first-pass rate', value: `${qcRate}%` },
                    { label: 'Batches on hold', value: `${holds}` },
                    { label: 'Operators on shift', value: '7 / 8' },
                    { label: 'OEE', value: '79%' },
                    { label: 'Lost time incidents', value: '0' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between border-b border-[#1e2d3d] pb-2 last:border-0 last:pb-0">
                      <span className="text-[#8fa3bf]">{item.label}</span>
                      <span className="font-mono font-semibold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#1e2d3d] bg-[#111827] p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#8fa3bf]">Pending Actions</h3>
                <div className="space-y-2">
                  {[
                    { text: 'Re-test BT-2026-0445 ethanol — 11:30', urgent: true },
                    { text: 'Fire-exit inspection Building A — 10:45', urgent: true },
                    { text: 'Reorder: Ethanol 96% (below min)', urgent: true },
                    { text: 'Reorder: Citric Acid & MIT Preservative', urgent: false },
                    { text: 'Close ethanol tanker PTW after delivery', urgent: false },
                    { text: 'Prepare night-shift handover report — 13:30', urgent: false },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${item.urgent ? 'bg-red-500/5 text-red-300 border border-red-500/20' : 'bg-[#0d1117] text-[#cbd5e1]'}`}>
                      <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.urgent ? 'bg-red-400' : 'bg-[#8fa3bf]'}`} />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#00c9a7]/30 bg-[#00c9a7]/5 py-3 text-sm font-medium text-[#00c9a7] hover:bg-[#00c9a7]/10 transition-colors">
                <FileText size={14} /> Export Shift Report PDF
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 border-t border-[#1e2d3d] px-5 py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between text-[10px] text-[#8fa3bf]">
          <span>ChemX Production OPS · Demo built by <span className="text-[#00c9a7]">Andrew Langeveldt</span></span>
          <span>Line Supervisor: A. Langeveldt · Shift: Day 06:00–14:00</span>
        </div>
      </footer>
    </div>
  );
}
