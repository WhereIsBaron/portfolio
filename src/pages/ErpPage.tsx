import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Wallet, Boxes, ShoppingCart, Truck, Factory,
  UsersRound, FolderKanban, Landmark, BarChart3, Settings as SettingsIcon,
  Search, ChevronRight, Database, AlertTriangle, TrendingUp, TrendingDown,
  Package, DollarSign, ClipboardList, FileText, PackagePlus,
} from 'lucide-react';
import {
  fetchErpData, money, avatarFor, orderTotal, accountBalances,
  WAREHOUSES, DEPARTMENTS, SO_FLOW, PO_FLOW, VAT_RATE, opCostPerUnit,
  type ErpData, type SalesOrder, type PurchaseOrder,
  type SOStatus, type POStatus, type WOStatus, type AcctType,
  type QuoteStatus,
  type GLEntry, type GLLine, type StockEntry, type DocStamp, type OrderLine,
  type SalarySlip, type PayrollRun,
} from '@/data/erpSeed';
import {
  DemoShell, Masthead, TabNav, Stat, StatusTag, Meter, cx, fieldLabel,
  type Tone, type TabDef, type Fact,
} from '@/components/demo/kit';

/* ─────────────────────────────────────────────────────────────────────────
   ERP console — /erp — Andrew.ERP

   A small but genuinely double-entry ERP: order-to-cash and procure-to-pay
   chains that post balanced general-ledger vouchers, perpetual inventory with
   a valued stock ledger, BOM + routing manufacturing, and monthly payroll.
   Inventory seeds from the DummyJSON API and people from randomuser.me; the
   rest is generated with a seeded PRNG so the dataset stays small and
   reproducible. Rebuilt on the homepage "Stone & blueprint" editorial theme
   via the shared demo kit; the accounting model is modelled on ERPNext.
   ──────────────────────────────────────────────────────────────────────── */

type Tab =
  | 'dashboard' | 'accounting' | 'inventory' | 'sales' | 'buying' | 'manufacturing'
  | 'hr' | 'projects' | 'assets' | 'reports' | 'settings';

const NAV: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'accounting', label: 'Accounting', icon: Wallet },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'sales', label: 'Sales', icon: ShoppingCart },
  { id: 'buying', label: 'Buying', icon: Truck },
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
  { id: 'hr', label: 'HR', icon: UsersRound },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'assets', label: 'Assets', icon: Landmark },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

/* Status → semantic tone (one blueprint accent, two-tone status palette). */
const SO_TONE: Record<SOStatus, Tone> = {
  Draft: 'neutral', 'To Deliver': 'warn', 'To Bill': 'accent', 'To Pay': 'accent', Completed: 'ok', Cancelled: 'danger',
};
const PO_TONE: Record<POStatus, Tone> = {
  Draft: 'neutral', 'To Receive': 'warn', 'To Bill': 'accent', 'To Pay': 'accent', Completed: 'ok',
};
const WO_TONE: Record<WOStatus, Tone> = { 'Not Started': 'neutral', 'In Process': 'warn', Completed: 'ok' };
const QUOTE_TONE: Record<QuoteStatus, Tone> = { Draft: 'neutral', Submitted: 'accent', Ordered: 'ok', Lost: 'danger' };
const ACCT_ORDER: AcctType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
const panel = 'border border-[var(--border)] bg-[var(--surface)]';
const thCls = 'px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em]';
const theadCls = 'bg-[var(--bg-soft)] text-left text-[var(--muted)]';

// Small inline table/row action button in the editorial style.
function MiniBtn({ onClick, children, ghost }: { onClick: () => void; children: React.ReactNode; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
        ghost
          ? 'border border-[var(--border)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
          : 'bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90',
      )}
    >
      {children}
    </button>
  );
}

// ── Posting helpers (build ledger + stock movements for the document chains) ──
let _seq = 0;
const seq = () => `${Date.now().toString(36)}-${_seq++}`;
const stamp = (prefix: string, n: number): DocStamp => ({ number: `${prefix}-${String(n).padStart(4, '0')}`, date: Date.now() });
const glEntry = (voucherType: string, voucherNo: string, party: string | undefined, lines: GLLine[]): GLEntry =>
  ({ id: `gl-${seq()}`, date: Date.now(), voucherType, voucherNo, party, lines });
const stockMove = (itemId: string, qty: number, rate: number, voucherType: string, voucherNo: string, warehouse: string): StockEntry =>
  ({ id: `sl-${seq()}`, date: Date.now(), itemId, qty, rate, voucherType, voucherNo, warehouse });
const lineCost = (lines: OrderLine[], costOf: (id: string) => number) => lines.reduce((t, l) => t + costOf(l.itemId) * l.qty, 0);

function Thumb({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <span className="flex items-center justify-center border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--muted)]" style={{ width: size, height: size }}>
        <Package size={size * 0.5} />
      </span>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)} className="border border-[var(--border)] bg-[var(--surface)] object-cover" style={{ width: size, height: size }} />;
}
function Avatar({ src, name, size = 36 }: { src: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = err || !src ? avatarFor(name) : src;
  return <img src={url} alt={name} onError={() => setErr(true)} className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] object-cover" style={{ width: size, height: size }} />;
}

export default function ErpPage() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<ErpData | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');

  useEffect(() => {
    let cancelled = false;
    fetchErpData().then((data) => { if (!cancelled) { setD(data); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const go = (t: Tab) => setTab(t);

  // Mutations
  // Advance a sales order through its order-to-cash lifecycle. Each step creates
  // the linked document and posts balanced entries to the general ledger; the
  // delivery step also moves stock (perpetual inventory).
  const advanceSO = (id: string) => setD((s) => {
    if (!s) return s;
    const o = s.salesOrders.find((x) => x.id === id);
    if (!o) return s;
    const i = SO_FLOW.indexOf(o.status as SOStatus);
    if (i < 0 || i >= SO_FLOW.length - 1) return s;
    const next = SO_FLOW[i + 1];
    const itemById = Object.fromEntries(s.items.map((it) => [it.id, it]));
    const costOf = (iid: string) => itemById[iid]?.cost ?? 0;
    const amount = orderTotal(o.lines);
    const party = s.customers.find((c) => c.id === o.customerId)?.name;
    let items = s.items, gl = s.gl, stockLedger = s.stockLedger;
    let patch: Partial<SalesOrder> = {};

    if (o.status === 'To Deliver') {
      const dn = stamp('DN', 7000 + s.salesOrders.filter((x) => x.deliveryNote).length + 1);
      const cost = lineCost(o.lines, costOf);
      items = s.items.map((it) => {
        const line = o.lines.find((l) => l.itemId === it.id);
        return line ? { ...it, stock: Math.max(0, it.stock - line.qty) } : it;
      });
      stockLedger = [
        ...o.lines.map((l) => stockMove(l.itemId, -l.qty, costOf(l.itemId), 'Delivery Note', dn.number, itemById[l.itemId]?.warehouse ?? 'Main Store')),
        ...s.stockLedger,
      ];
      gl = [glEntry('Delivery Note', dn.number, party, [
        { account: 'Cost of Goods Sold', debit: cost, credit: 0 },
        { account: 'Inventory', debit: 0, credit: cost },
      ]), ...s.gl];
      patch = { deliveryNote: dn };
    } else if (o.status === 'To Bill') {
      // Output VAT: customer owes net goods + 15% VAT, collected on behalf of SARS.
      const si = stamp('SINV', 8000 + s.salesOrders.filter((x) => x.salesInvoice).length + 1);
      const tax = Math.round(amount * VAT_RATE);
      gl = [glEntry('Sales Invoice', si.number, party, [
        { account: 'Accounts Receivable', debit: amount + tax, credit: 0 },
        { account: 'Sales Revenue', debit: 0, credit: amount },
        { account: 'VAT Payable', debit: 0, credit: tax },
      ]), ...s.gl];
      patch = { salesInvoice: si };
    } else if (o.status === 'To Pay') {
      const pe = stamp('PE', 9000 + s.salesOrders.filter((x) => x.payment).length + 1);
      const gross = amount + Math.round(amount * VAT_RATE);
      gl = [glEntry('Payment Entry', pe.number, party, [
        { account: 'Bank', debit: gross, credit: 0 },
        { account: 'Accounts Receivable', debit: 0, credit: gross },
      ]), ...s.gl];
      patch = { payment: pe };
    }
    const salesOrders = s.salesOrders.map((x) => (x.id === id ? { ...x, status: next, ...patch } : x));
    return { ...s, salesOrders, items, gl, stockLedger };
  });

  // Advance a purchase order through procure-to-pay. Receipt moves stock and
  // recognises the liability via a "Stock Received Not Billed" clearing account
  // (perpetual inventory, as ERPNext does); billing moves it to Accounts Payable.
  const advancePO = (id: string) => setD((s) => {
    if (!s) return s;
    const o = s.purchaseOrders.find((x) => x.id === id);
    if (!o) return s;
    const i = PO_FLOW.indexOf(o.status);
    if (i < 0 || i >= PO_FLOW.length - 1) return s;
    const next = PO_FLOW[i + 1];
    const itemById = Object.fromEntries(s.items.map((it) => [it.id, it]));
    const amount = orderTotal(o.lines);
    const party = s.suppliers.find((c) => c.id === o.supplierId)?.name;
    let items = s.items, gl = s.gl, stockLedger = s.stockLedger;
    let patch: Partial<PurchaseOrder> = {};

    if (o.status === 'To Receive') {
      const pr = stamp('PR', 7500 + s.purchaseOrders.filter((x) => x.receipt).length + 1);
      items = s.items.map((it) => {
        const line = o.lines.find((l) => l.itemId === it.id);
        return line ? { ...it, stock: it.stock + line.qty } : it;
      });
      stockLedger = [
        ...o.lines.map((l) => stockMove(l.itemId, l.qty, l.rate, 'Purchase Receipt', pr.number, itemById[l.itemId]?.warehouse ?? 'Main Store')),
        ...s.stockLedger,
      ];
      gl = [glEntry('Purchase Receipt', pr.number, party, [
        { account: 'Inventory', debit: amount, credit: 0 },
        { account: 'Stock Received Not Billed', debit: 0, credit: amount },
      ]), ...s.gl];
      patch = { receipt: pr };
    } else if (o.status === 'To Bill') {
      // Input VAT: reclaimable, so it debits (reduces) the VAT Payable liability.
      const bill = stamp('PINV', 8500 + s.purchaseOrders.filter((x) => x.bill).length + 1);
      const tax = Math.round(amount * VAT_RATE);
      gl = [glEntry('Purchase Invoice', bill.number, party, [
        { account: 'Stock Received Not Billed', debit: amount, credit: 0 },
        { account: 'VAT Payable', debit: tax, credit: 0 },
        { account: 'Accounts Payable', debit: 0, credit: amount + tax },
      ]), ...s.gl];
      patch = { bill };
    } else if (o.status === 'To Pay') {
      const pe = stamp('PE', 9500 + s.purchaseOrders.filter((x) => x.payment).length + 1);
      const gross = amount + Math.round(amount * VAT_RATE);
      gl = [glEntry('Payment Entry', pe.number, party, [
        { account: 'Accounts Payable', debit: gross, credit: 0 },
        { account: 'Bank', debit: 0, credit: gross },
      ]), ...s.gl];
      patch = { payment: pe };
    }
    const purchaseOrders = s.purchaseOrders.map((x) => (x.id === id ? { ...x, status: next, ...patch } : x));
    return { ...s, purchaseOrders, items, gl, stockLedger };
  });
  // Produce a batch (ERPNext BOM + routing → Manufacture Stock Entry). Consumes
  // BOM components at their valuation rate, applies routing labour/overhead, and
  // receives the finished good valued at material + operating cost. Posts a
  // balanced Manufacture entry and moves the stock ledger.
  const produceWO = (id: string) => setD((s) => {
    if (!s) return s;
    const w = s.workOrders.find((x) => x.id === id);
    if (!w || w.status === 'Completed') return s;
    const batch = Math.min(w.qty - w.produced, Math.ceil(w.qty * 0.25));
    if (batch <= 0) return s;
    const itemById = Object.fromEntries(s.items.map((it) => [it.id, it]));
    const fg = itemById[w.itemId];
    const materialCost = Math.round(w.bom.reduce((t, b) => t + (itemById[b.itemId]?.cost ?? 0) * b.qtyPerUnit * batch, 0));
    const opCost = Math.round(opCostPerUnit(w.operations) * batch);
    const fgValue = materialCost + opCost;
    const fgRate = fgValue / batch;

    const items = s.items.map((it) => {
      if (it.id === w.itemId) return { ...it, stock: it.stock + batch };
      const line = w.bom.find((b) => b.itemId === it.id);
      return line ? { ...it, stock: Math.max(0, it.stock - line.qtyPerUnit * batch) } : it;
    });
    const ste = stamp('MFG-STE', 8800 + s.gl.filter((e) => e.voucherType === 'Manufacture').length + 1);
    const stockLedger = [
      stockMove(w.itemId, batch, fgRate, 'Manufacture', ste.number, fg?.warehouse ?? 'Main Store'),
      ...w.bom.map((b) => stockMove(b.itemId, -b.qtyPerUnit * batch, itemById[b.itemId]?.cost ?? 0, 'Manufacture', ste.number, itemById[b.itemId]?.warehouse ?? 'Main Store')),
      ...s.stockLedger,
    ];
    const gl = [glEntry('Manufacture', ste.number, w.number, [
      { account: 'Inventory', debit: fgValue, credit: 0 },
      { account: 'Inventory', debit: 0, credit: materialCost },
      { account: 'Manufacturing Overhead Applied', debit: 0, credit: opCost },
    ]), ...s.gl];

    const produced = w.produced + batch;
    const status: WOStatus = produced >= w.qty ? 'Completed' : 'In Process';
    const workOrders = s.workOrders.map((x) => (x.id === id ? { ...x, produced, status } : x));
    return { ...s, items, workOrders, gl, stockLedger };
  });

  // Run monthly payroll: one salary slip per active employee (gross → PAYE + UIF
  // → net), posted as one batched Journal-style entry to the ledger.
  const runPayroll = () => setD((s) => {
    if (!s) return s;
    const active = s.employees.filter((e) => e.status === 'Active');
    if (!active.length) return s;
    const slips: SalarySlip[] = active.map((e) => {
      const gross = Math.round(e.salary / 12);
      const paye = Math.round(gross * 0.18);
      const uif = Math.round(gross * 0.01);
      return { employeeId: e.id, name: e.name, gross, paye, uif, net: gross - paye - uif };
    });
    const gross = slips.reduce((t, x) => t + x.gross, 0);
    const paye = slips.reduce((t, x) => t + x.paye, 0);
    const uif = slips.reduce((t, x) => t + x.uif, 0);
    const net = slips.reduce((t, x) => t + x.net, 0);
    const period = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const run: PayrollRun = { id: `pay-${Date.now()}`, number: `PAY-${5000 + s.payrollRuns.length + 1}`, period, date: Date.now(), slips };
    // Dr Salaries (full cost); Cr Bank (net paid), Cr PAYE + UIF withheld (liabilities).
    const gl = [glEntry('Payroll', run.number, period, [
      { account: 'Salaries', debit: gross, credit: 0 },
      { account: 'Bank', debit: 0, credit: net },
      { account: 'Payroll Payable', debit: 0, credit: paye + uif },
    ]), ...s.gl];
    return { ...s, payrollRuns: [run, ...s.payrollRuns], gl };
  });
  const restock = (id: string) => setD((s) => !s ? s : ({ ...s, items: s.items.map((it) =>
    it.id === id ? { ...it, stock: it.reorder * 3 } : it) }));

  // Quotation → Sales Order.
  const convertQuote = (id: string) => setD((s) => {
    if (!s) return s;
    const q = s.quotations.find((x) => x.id === id);
    if (!q || q.status === 'Ordered' || q.status === 'Lost') return s;
    const soId = `so-${Date.now()}`;
    const so: SalesOrder = { id: soId, number: `SAL-ORD-${2000 + s.salesOrders.length}`, customerId: q.customerId, date: Date.now(), lines: q.lines, status: 'Draft' };
    return {
      ...s,
      salesOrders: [so, ...s.salesOrders],
      quotations: s.quotations.map((x) => (x.id === id ? { ...x, status: 'Ordered', salesOrderId: soId } : x)),
    };
  });

  // Material Request → Purchase Order.
  const convertMR = (id: string) => setD((s) => {
    if (!s) return s;
    const mr = s.materialRequests.find((x) => x.id === id);
    if (!mr || mr.status === 'Ordered') return s;
    const it = s.items.find((x) => x.id === mr.itemId);
    const supplier = s.suppliers[s.purchaseOrders.length % s.suppliers.length];
    const poId = `po-${Date.now()}`;
    const po: PurchaseOrder = { id: poId, number: `PUR-ORD-${3000 + s.purchaseOrders.length}`, supplierId: supplier.id, date: Date.now(), lines: [{ itemId: mr.itemId, qty: mr.qty, rate: it?.cost ?? 0 }], status: 'Draft' };
    return {
      ...s,
      purchaseOrders: [po, ...s.purchaseOrders],
      materialRequests: s.materialRequests.map((x) => (x.id === id ? { ...x, status: 'Ordered', purchaseOrderId: poId } : x)),
    };
  });

  const TABS: TabDef<Tab>[] = NAV.map((n) => ({ id: n.id, label: n.label }));

  const facts: Fact[] = d
    ? [
        { label: 'Modules', value: '11' },
        { label: 'SKUs', value: d.items.length },
        { label: 'Open orders', value: d.salesOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled').length },
        { label: 'Receivables', value: money(d.customers.reduce((s, c) => s + c.outstanding, 0)) },
      ]
    : [
        { label: 'Modules', value: '11' }, { label: 'SKUs', value: '—' },
        { label: 'Open orders', value: '—' }, { label: 'Receivables', value: '—' },
      ];

  return (
    <DemoShell title="ERP System Demo" wordmark="ERP" revealKey={tab}>
      <Masthead
        eyebrow="Operations · Andrew Trading (Pty) Ltd"
        title="The whole business, double-entry."
        lede="A compact but genuinely double-entry ERP: order-to-cash and procure-to-pay chains that post balanced ledger vouchers, perpetual inventory with a valued stock ledger, BOM-and-routing manufacturing, and payroll. Walk an order through its lifecycle and watch the general ledger and stock move in step."
        live="Interactive · seeded data"
        facts={facts}
      />

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      <div className="pt-7">
        <p className={fieldLabel}>Module</p>
        <h2 className="mb-5 mt-1 font-display text-[clamp(1.375rem,2.6vw,1.75rem)] font-medium leading-tight text-[var(--ink)]">
          {NAV.find((n) => n.id === tab)?.label}
        </h2>
        {loading || !d ? (
          <div className="py-24 text-center text-sm text-[var(--muted)]">Loading sample data…</div>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard d={d} go={go} />}
            {tab === 'accounting' && <Accounting d={d} />}
            {tab === 'inventory' && <Inventory d={d} onRestock={restock} />}
            {tab === 'sales' && <Sales d={d} onAdvance={advanceSO} onConvertQuote={convertQuote} />}
            {tab === 'buying' && <Buying d={d} onAdvance={advancePO} onConvertMR={convertMR} />}
            {tab === 'manufacturing' && <Manufacturing d={d} onProduce={produceWO} />}
            {tab === 'hr' && <HR d={d} onRunPayroll={runPayroll} />}
            {tab === 'projects' && <Projects d={d} />}
            {tab === 'assets' && <Assets d={d} />}
            {tab === 'reports' && <Reports d={d} />}
            {tab === 'settings' && <SettingsView d={d} />}
          </>
        )}
      </div>
    </DemoShell>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ d, go }: { d: ErpData; go: (t: Tab) => void }) {
  const revenue = d.monthly.reduce((s, m) => s + m.revenue, 0);
  const expenses = d.monthly.reduce((s, m) => s + m.expenses, 0);
  const profit = revenue - expenses;
  const stockValue = d.items.reduce((s, it) => s + it.stock * it.cost, 0);
  const lowStock = d.items.filter((it) => it.stock <= it.reorder).length;
  const openSO = d.salesOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled').length;
  const openPO = d.purchaseOrders.filter((o) => o.status !== 'Completed').length;
  const receivable = d.customers.reduce((s, c) => s + c.outstanding, 0);
  const maxM = Math.max(1, ...d.monthly.map((m) => Math.max(m.revenue, m.expenses)));

  const cards = [
    { label: 'Revenue (6mo)', value: money(revenue), icon: TrendingUp, tab: 'reports' as Tab },
    { label: 'Expenses (6mo)', value: money(expenses), icon: TrendingDown, tab: 'accounting' as Tab },
    { label: 'Net profit', value: money(profit), icon: DollarSign, tab: 'accounting' as Tab },
    { label: 'Stock value', value: money(stockValue), icon: Boxes, tab: 'inventory' as Tab },
    { label: 'Open sales orders', value: openSO.toString(), icon: ShoppingCart, tab: 'sales' as Tab },
    { label: 'Open purchase orders', value: openPO.toString(), icon: Truck, tab: 'buying' as Tab },
    { label: 'Receivables', value: money(receivable), icon: ClipboardList, tab: 'accounting' as Tab },
    { label: 'Low-stock items', value: lowStock.toString(), icon: AlertTriangle, tab: 'inventory' as Tab },
  ];

  const soStatuses = ['Draft', 'To Deliver', 'To Bill', 'Completed'] as SOStatus[];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => go(c.tab)} className={cx(panel, 'p-3.5 text-left transition-colors hover:border-[var(--accent)]')}>
            <c.icon size={15} className="text-[var(--accent)]" />
            <div className="mt-2.5 font-display text-xl font-medium text-[var(--ink)]">{c.value}</div>
            <div className={cx('mt-0.5', fieldLabel)}>{c.label}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cx(panel, 'p-5')}>
          <p className={fieldLabel}>Revenue vs expenses</p>
          <div className="mt-5 flex h-44 gap-4">
            {d.monthly.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div className="w-1/2 bg-[var(--accent)]" style={{ height: `${(m.revenue / maxM) * 100}%` }} title={`Revenue ${money(m.revenue)}`} />
                  <div className="w-1/2 bg-[var(--border)]" style={{ height: `${(m.expenses / maxM) * 100}%` }} title={`Expenses ${money(m.expenses)}`} />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-[var(--accent)]" /> Revenue</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-[var(--border)]" /> Expenses</span>
          </div>
        </div>

        <div className={cx(panel, 'p-5')}>
          <p className={fieldLabel}>Sales orders by status</p>
          <div className="mt-4 space-y-3">
            {soStatuses.map((st) => {
              const n = d.salesOrders.filter((o) => o.status === st).length;
              const pct = (n / Math.max(1, d.salesOrders.length)) * 100;
              return (
                <div key={st}>
                  <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">{st}</span><span className="text-[var(--ink)] tabular-nums">{n}</span></div>
                  <Meter value={pct} className="mt-1.5" tone={SO_TONE[st] === 'neutral' ? 'accent' : SO_TONE[st]} />
                </div>
              );
            })}
          </div>
          <button onClick={() => go('sales')} className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">Open sales →</button>
        </div>
      </div>

      <ApiCredit d={d} />
    </div>
  );
}

// ── Accounting ───────────────────────────────────────────────────────────────
function Accounting({ d }: { d: ErpData }) {
  // Every balance is derived live from opening balances + the general ledger.
  const bal = useMemo(() => accountBalances(d.accounts, d.gl), [d.accounts, d.gl]);
  const sumType = (t: AcctType) => d.accounts.filter((a) => a.type === t).reduce((s, a) => s + (bal[a.name] ?? 0), 0);
  const income = sumType('Income');
  const expense = sumType('Expense');
  const profit = income - expense;
  const assets = sumType('Asset');
  const liabilities = sumType('Liability');
  const equityBooked = sumType('Equity');
  // Balance the sheet: Assets = Liabilities + Equity + current-year earnings.
  const retained = assets - liabilities - equityBooked - profit;
  const equityTotal = equityBooked + profit + retained;
  const byType = (t: AcctType) => d.accounts.filter((a) => a.type === t);

  // Itemised P&L lines (only accounts with a non-zero balance).
  const acctLines = (t: AcctType) => byType(t).map((a) => ({ name: a.name, v: bal[a.name] ?? 0 })).filter((a) => a.v !== 0);
  const incomeLines = acctLines('Income');
  const expenseLines = acctLines('Expense');

  // Trial balance — every account on its natural side (debit-normal = Asset/Expense),
  // plus a retained-earnings line so the columns tie out, exactly like the sheet.
  const debitNormal = (t: AcctType) => t === 'Asset' || t === 'Expense';
  const tbRows = ACCT_ORDER.flatMap((t) =>
    byType(t)
      .map((a) => ({ name: a.name, type: t, v: bal[a.name] ?? 0 }))
      .filter((a) => Math.round(a.v) !== 0)
  );
  if (Math.round(retained) !== 0) tbRows.push({ name: 'Opening balance equity', type: 'Equity', v: retained });
  const tb = tbRows.map((r) => {
    const putDebit = (debitNormal(r.type) && r.v > 0) || (!debitNormal(r.type) && r.v < 0);
    const amt = Math.abs(r.v);
    return { ...r, debit: putDebit ? amt : 0, credit: putDebit ? 0 : amt };
  });
  const tbDr = tb.reduce((s, r) => s + r.debit, 0);
  const tbCr = tb.reduce((s, r) => s + r.credit, 0);
  const tbBalanced = Math.abs(tbDr - tbCr) < 1;

  // Flatten live GL postings into ledger rows (newest first), then history.
  const glRows = d.gl.flatMap((e) => e.lines.map((l, k) => ({ key: `${e.id}-${k}`, live: true, date: e.date, voucher: e.voucherType, ref: e.voucherNo, account: l.account, debit: l.debit, credit: l.credit })));
  const histRows = d.journal.map((j) => ({ key: j.id, live: false, date: j.date, voucher: j.voucher, ref: '', account: j.account, debit: j.debit, credit: j.credit }));
  const totalDr = glRows.reduce((s, r) => s + r.debit, 0);
  const totalCr = glRows.reduce((s, r) => s + r.credit, 0);
  const sheetBalanced = Math.abs(assets - (liabilities + equityTotal)) < 1;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cx(panel, 'p-5')}>
          <p className={fieldLabel}>Profit &amp; Loss</p>
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Income</div>
            {incomeLines.length ? incomeLines.map((a) => <Line key={a.name} label={a.name} value={money(a.v)} muted />)
              : <div className="text-xs text-[var(--muted)]/70">No income posted yet.</div>}
            <div className="flex justify-between border-t border-[var(--border)] pt-1.5 font-medium"><span className="text-[var(--ink)]">Total income</span><span className="text-[var(--ink)] tabular-nums">{money(income)}</span></div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Expenses</div>
            {expenseLines.length ? expenseLines.map((a) => <Line key={a.name} label={a.name} value={`(${money(a.v)})`} muted />)
              : <div className="text-xs text-[var(--muted)]/70">No expenses posted yet.</div>}
            <div className="flex justify-between border-t border-[var(--border)] pt-1.5 font-medium"><span className="text-[var(--ink)]">Total expenses</span><span className="text-[var(--ink)] tabular-nums">({money(expense)})</span></div>
            <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 font-medium">
              <span className="text-[var(--ink)]">Net profit</span>
              <span className={profit >= 0 ? 'text-[var(--ok)]' : 'text-[var(--danger)]'}>{money(profit)}</span>
            </div>
            <div className="text-xs text-[var(--muted)]">Margin {income ? Math.round((profit / income) * 100) : 0}%</div>
          </div>
        </div>

        <div className={cx(panel, 'p-5')}>
          <div className="flex items-center justify-between">
            <p className={fieldLabel}>Balance sheet</p>
            <StatusTag tone={sheetBalanced ? 'ok' : 'danger'} dot={false}>{sheetBalanced ? 'In balance' : 'Out of balance'}</StatusTag>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Line label="Total assets" value={money(assets)} />
            <div className="my-2 border-t border-[var(--border)]" />
            <Line label="Liabilities" value={money(liabilities)} muted />
            <Line label="Equity + earnings" value={money(equityTotal)} muted />
            <div className="my-2 border-t border-[var(--border)]" />
            <div className="flex justify-between font-medium"><span className="text-[var(--ink)]">Liabilities + equity</span><span className="text-[var(--ink)] tabular-nums">{money(liabilities + equityTotal)}</span></div>
          </div>
        </div>

        <div className={cx(panel, 'p-5')}>
          <p className={fieldLabel}>Chart of accounts</p>
          <div className="mt-3 max-h-72 space-y-4 overflow-y-auto pr-1">
            {ACCT_ORDER.map((t) => (
              <div key={t}>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{t}</div>
                <div className="mt-1 divide-y divide-[var(--border)]">
                  {byType(t).map((a) => (
                    <div key={a.name} className="flex justify-between py-1.5 text-sm"><span className="text-[var(--text)]">{a.name}</span><span className="text-[var(--ink)] tabular-nums">{money(bal[a.name] ?? 0)}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
          <p className={fieldLabel}>Trial balance</p>
          <StatusTag tone={tbBalanced ? 'ok' : 'danger'} dot={false}>Dr {money(tbDr)} = Cr {money(tbCr)} {tbBalanced ? '✓' : '⚠'}</StatusTag>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className={theadCls}>
              <tr><th className={thCls}>Account</th><th className={thCls}>Type</th><th className={cx(thCls, 'text-right')}>Debit</th><th className={cx(thCls, 'text-right')}>Credit</th></tr>
            </thead>
            <tbody>
              {tb.map((r) => (
                <tr key={r.name} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 text-[var(--text)]">{r.name}</td>
                  <td className="px-4 py-2 text-xs text-[var(--muted)]">{r.type}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--ink)]">{r.debit ? money(r.debit) : '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--ink)]">{r.credit ? money(r.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--border)] bg-[var(--bg-soft)] font-medium">
                <td className="px-4 py-2.5 text-[var(--ink)]" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink)]">{money(tbDr)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink)]">{money(tbCr)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
          <p className={fieldLabel}>General ledger</p>
          {glRows.length > 0 ? (
            <span className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
              <StatusTag tone="accent" dot={false}>{d.gl.length} posted this session</StatusTag>
              Dr {money(totalDr)} = Cr {money(totalCr)} {totalDr === totalCr ? '✓' : '⚠'}
            </span>
          ) : (
            <span className="text-xs text-[var(--muted)]">Advance a sales or purchase order to post live entries →</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className={theadCls}>
              <tr><th className={thCls}>Date</th><th className={thCls}>Voucher</th><th className={thCls}>Reference</th><th className={thCls}>Account</th><th className={cx(thCls, 'text-right')}>Debit</th><th className={cx(thCls, 'text-right')}>Credit</th></tr>
            </thead>
            <tbody>
              {[...glRows, ...histRows].slice(0, 40).map((r) => (
                <tr key={r.key} className={cx('border-t border-[var(--border)]', r.live && 'bg-[var(--accent-soft)]')}>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5 text-[var(--text)]">{r.voucher}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{r.ref || '—'}</td>
                  <td className="px-4 py-2.5 text-[var(--text)]">{r.account}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink)]">{r.debit ? money(r.debit) : '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink)]">{r.credit ? money(r.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return <div className="flex justify-between"><span className="text-[var(--muted)]">{label}</span><span className={muted ? 'text-[var(--muted)] tabular-nums' : 'text-[var(--ink)] tabular-nums'}>{value}</span></div>;
}

// The linked-document trail on an order: a filled chip once each document exists.
function DocTrail({ stamps }: { stamps: [string, DocStamp | undefined][] }) {
  if (!stamps.some(([, s]) => s)) return <span className="text-xs text-[var(--muted)]">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {stamps.map(([label, s], i) => (
        <span key={label} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="text-[var(--muted)]/50" />}
          <span
            className={cx('border px-1.5 py-0.5 font-mono text-[10px]', s ? 'border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok)]' : 'border-[var(--border)] text-[var(--muted)]/60')}
            title={s ? s.number : `${label} — not yet created`}
          >
            {s ? s.number : label}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Inventory ────────────────────────────────────────────────────────────────
function Inventory({ d, onRestock }: { d: ErpData; onRestock: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [wh, setWh] = useState('All');
  const [lowOnly, setLowOnly] = useState(false);
  const [view, setView] = useState<'items' | 'ledger'>('items');
  const rows = d.items.filter((it) => {
    if (wh !== 'All' && it.warehouse !== wh) return false;
    if (lowOnly && it.stock > it.reorder) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [it.name, it.code, it.category, it.brand].some((f) => f.toLowerCase().includes(q));
  });
  const totalVal = d.items.reduce((s, it) => s + it.stock * it.cost, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="SKUs" value={d.items.length} />
        <Stat label="Stock value" value={money(totalVal)} />
        <Stat label="Low stock" value={d.items.filter((it) => it.stock <= it.reorder).length} tone="warn" sub="at / below reorder" />
        <Stat label="Ledger moves" value={d.stockLedger.length} />
      </div>

      <div className="flex gap-2">
        {(['items', 'ledger'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cx('border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors', view === v ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]')}>
            {v === 'items' ? 'Items' : 'Stock ledger'}
          </button>
        ))}
      </div>

      {view === 'ledger' ? <StockLedgerView d={d} /> : <>
      <div className="flex flex-wrap items-center gap-2">
        <div className={cx('flex flex-1 items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-3 py-2')}>
          <Search size={16} className="text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item, SKU, category…" className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]" />
        </div>
        <select value={wh} onChange={(e) => setWh(e.target.value)} className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none">
          <option value="All">All warehouses</option>
          {WAREHOUSES.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <button onClick={() => setLowOnly((v) => !v)} className={cx('border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors', lowOnly ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]')}>Low stock</button>
      </div>

      <div className={cx('overflow-x-auto', panel)}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className={theadCls}>
            <tr><th className={thCls}>Item</th><th className={thCls}>Category</th><th className={thCls}>Warehouse</th><th className={cx(thCls, 'text-right')}>Price</th><th className={cx(thCls, 'text-right')}>Stock</th><th className={cx(thCls, 'text-right')}>Value</th><th className={thCls} /></tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              const low = it.stock <= it.reorder;
              return (
                <tr key={it.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Thumb src={it.thumbnail} name={it.name} />
                      <div className="min-w-0"><div className="truncate font-medium text-[var(--ink)]">{it.name}</div><div className="text-xs text-[var(--muted)]">{it.code} · {it.brand}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-[var(--muted)]">{it.category}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{it.warehouse}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{money(it.price)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={low ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}>{it.stock}</span>
                    {low && <AlertTriangle size={13} className="ml-1 inline text-[var(--danger)]" />}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">{money(it.stock * it.cost)}</td>
                  <td className="px-4 py-3 text-right">{low && <MiniBtn onClick={() => onRestock(it.id)} ghost>Restock</MiniBtn>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">No items match.</td></tr>}
          </tbody>
        </table>
      </div>
      </>}
    </div>
  );
}

// The running stock ledger — every valued movement, with a per-item running
// on-hand balance. Perpetual inventory: on-hand and valuation are derived here.
function StockLedgerView({ d }: { d: ErpData }) {
  const item = Object.fromEntries(d.items.map((i) => [i.id, i]));
  // Walk oldest→newest to compute the running balance after each movement.
  const chron = [...d.stockLedger].reverse();
  const running: Record<string, number> = {};
  const withBal = chron.map((e) => {
    running[e.itemId] = (running[e.itemId] ?? 0) + e.qty;
    return { ...e, balance: running[e.itemId] };
  }).reverse();
  const moved = d.stockLedger.reduce((s, e) => s + Math.abs(e.qty * e.rate), 0);

  if (!d.stockLedger.length) {
    return (
      <div className={cx(panel, 'p-10 text-center')}>
        <Boxes size={28} className="mx-auto text-[var(--muted)]" />
        <p className="mt-3 text-sm text-[var(--muted)]">No stock movements yet this session.</p>
        <p className="mt-1 text-xs text-[var(--muted)]/70">Deliver a sales order, receive a purchase order, or produce a work order — each posts valued entries here.</p>
      </div>
    );
  }
  return (
    <div className={cx('overflow-x-auto', panel)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
        <p className={fieldLabel}>Stock ledger</p>
        <span className="text-xs text-[var(--muted)]">{d.stockLedger.length} movements · {money(moved)} moved · valued at moving-average cost</span>
      </div>
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className={theadCls}>
          <tr><th className={thCls}>Date</th><th className={thCls}>Item</th><th className={thCls}>Voucher</th><th className={thCls}>Warehouse</th><th className={cx(thCls, 'text-right')}>Qty</th><th className={cx(thCls, 'text-right')}>Rate</th><th className={cx(thCls, 'text-right')}>Value</th><th className={cx(thCls, 'text-right')}>Balance</th></tr>
        </thead>
        <tbody>
          {withBal.slice(0, 50).map((e) => (
            <tr key={e.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-2.5 text-[var(--muted)]">{fmtDate(e.date)}</td>
              <td className="px-4 py-2.5 text-[var(--text)]">{item[e.itemId]?.name ?? e.itemId}</td>
              <td className="px-4 py-2.5"><span className="text-[var(--text)]">{e.voucherType}</span> <span className="text-xs text-[var(--muted)]">{e.voucherNo}</span></td>
              <td className="px-4 py-2.5 text-[var(--muted)]">{e.warehouse}</td>
              <td className={cx('px-4 py-2.5 text-right tabular-nums', e.qty >= 0 ? 'text-[var(--ok)]' : 'text-[var(--danger)]')}>{e.qty >= 0 ? '+' : ''}{e.qty}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">{money(e.rate)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink)]">{money(e.qty * e.rate)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">{e.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sales ────────────────────────────────────────────────────────────────────
function Sales({ d, onAdvance, onConvertQuote }: { d: ErpData; onAdvance: (id: string) => void; onConvertQuote: (id: string) => void }) {
  const cust = Object.fromEntries(d.customers.map((c) => [c.id, c]));
  const total = d.salesOrders.reduce((s, o) => s + orderTotal(o.lines), 0);
  const open = d.salesOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled');
  const openQuotes = d.quotations.filter((q) => q.status === 'Draft' || q.status === 'Submitted');
  // The action that advances an order out of each status.
  const SO_ACTION: Partial<Record<SOStatus, string>> = { Draft: 'Submit', 'To Deliver': 'Deliver', 'To Bill': 'Create invoice', 'To Pay': 'Receive payment' };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open quotations" value={openQuotes.length} />
        <Stat label="Orders" value={d.salesOrders.length} />
        <Stat label="Open orders" value={open.length} />
        <Stat label="Order value" value={money(total)} />
      </div>

      <div className={cx('overflow-x-auto', panel)}>
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
          <FileText size={14} className="text-[var(--accent)]" />
          <p className={fieldLabel}>Quotations</p>
          <span className="text-xs text-[var(--muted)]">— submit a quote, then turn it into a sales order</span>
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className={theadCls}>
            <tr><th className={thCls}>Quotation</th><th className={thCls}>Customer</th><th className={thCls}>Valid till</th><th className={cx(thCls, 'text-right')}>Amount</th><th className={thCls}>Status</th><th className={thCls} /></tr>
          </thead>
          <tbody>
            {d.quotations.map((q) => (
              <tr key={q.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium text-[var(--ink)]">{q.number}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{cust[q.customerId]?.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{fmtDate(q.validTill)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{money(orderTotal(q.lines))}</td>
                <td className="px-4 py-3"><StatusTag tone={QUOTE_TONE[q.status]} dot={false}>{q.status}</StatusTag></td>
                <td className="px-4 py-3 text-right">{(q.status === 'Draft' || q.status === 'Submitted') && <MiniBtn onClick={() => onConvertQuote(q.id)}>Create order</MiniBtn>}{q.status === 'Ordered' && <span className="text-xs text-[var(--muted)]">→ order created</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cx('overflow-x-auto', panel)}>
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
          <p className={fieldLabel}>Sales orders</p>
          <span className="text-xs text-[var(--muted)]">— walk one through Deliver → Invoice → Payment; each step posts to the ledger</span>
        </div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className={theadCls}>
            <tr><th className={thCls}>Order</th><th className={thCls}>Customer</th><th className={thCls}>Documents</th><th className={cx(thCls, 'text-right')}>Amount</th><th className={thCls}>Status</th><th className={thCls} /></tr>
          </thead>
          <tbody>
            {d.salesOrders.map((o) => {
              const label = SO_ACTION[o.status];
              return (
                <tr key={o.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3"><div className="font-medium text-[var(--ink)]">{o.number}</div><div className="text-xs text-[var(--muted)]">{fmtDate(o.date)}</div></td>
                  <td className="px-4 py-3 text-[var(--muted)]">{cust[o.customerId]?.name ?? '—'}</td>
                  <td className="px-4 py-3"><DocTrail stamps={[['DN', o.deliveryNote], ['Inv', o.salesInvoice], ['Pay', o.payment]]} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{money(orderTotal(o.lines))}</td>
                  <td className="px-4 py-3"><StatusTag tone={SO_TONE[o.status]} dot={false}>{o.status}</StatusTag></td>
                  <td className="px-4 py-3 text-right">{label && <MiniBtn onClick={() => onAdvance(o.id)}>{label}</MiniBtn>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Buying ───────────────────────────────────────────────────────────────────
function Buying({ d, onAdvance, onConvertMR }: { d: ErpData; onAdvance: (id: string) => void; onConvertMR: (id: string) => void }) {
  const sup = Object.fromEntries(d.suppliers.map((s) => [s.id, s]));
  const item = Object.fromEntries(d.items.map((i) => [i.id, i]));
  const payable = d.suppliers.reduce((s, x) => s + x.outstanding, 0);
  const openMR = d.materialRequests.filter((m) => m.status === 'Requested');
  const PO_ACTION: Partial<Record<POStatus, string>> = { Draft: 'Submit', 'To Receive': 'Receive', 'To Bill': 'Create bill', 'To Pay': 'Pay supplier' };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Material requests" value={openMR.length} />
        <Stat label="Purchase orders" value={d.purchaseOrders.length} />
        <Stat label="Payables" value={money(payable)} />
        <Stat label="Suppliers" value={d.suppliers.length} />
      </div>

      {d.materialRequests.length > 0 && (
        <div className={cx('overflow-x-auto', panel)}>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
            <PackagePlus size={14} className="text-[var(--accent)]" />
            <p className={fieldLabel}>Material requests</p>
            <span className="text-xs text-[var(--muted)]">— auto-raised from low stock; convert to a purchase order</span>
          </div>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className={theadCls}>
              <tr><th className={thCls}>Request</th><th className={thCls}>Item</th><th className={cx(thCls, 'text-right')}>Qty</th><th className={thCls}>Status</th><th className={thCls} /></tr>
            </thead>
            <tbody>
              {d.materialRequests.map((m) => (
                <tr key={m.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">{m.number}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{item[m.itemId]?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{m.qty}</td>
                  <td className="px-4 py-3"><StatusTag tone={m.status === 'Requested' ? 'warn' : 'ok'} dot={false}>{m.status}</StatusTag></td>
                  <td className="px-4 py-3 text-right">{m.status === 'Requested' ? <MiniBtn onClick={() => onConvertMR(m.id)}>Create PO</MiniBtn> : <span className="text-xs text-[var(--muted)]">→ PO created</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className={cx('overflow-x-auto', panel)}>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
            <p className={fieldLabel}>Purchase orders</p>
            <span className="text-xs text-[var(--muted)]">— Receive → Bill → Pay; receipt moves stock &amp; posts the ledger</span>
          </div>
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className={theadCls}>
              <tr><th className={thCls}>Order</th><th className={thCls}>Supplier</th><th className={thCls}>Documents</th><th className={cx(thCls, 'text-right')}>Amount</th><th className={thCls}>Status</th><th className={thCls} /></tr>
            </thead>
            <tbody>
              {d.purchaseOrders.map((o) => {
                const label = PO_ACTION[o.status];
                return (
                  <tr key={o.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{o.number}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{sup[o.supplierId]?.name ?? '—'}</td>
                    <td className="px-4 py-3"><DocTrail stamps={[['PR', o.receipt], ['Bill', o.bill], ['Pay', o.payment]]} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{money(orderTotal(o.lines))}</td>
                    <td className="px-4 py-3"><StatusTag tone={PO_TONE[o.status]} dot={false}>{o.status}</StatusTag></td>
                    <td className="px-4 py-3 text-right">{label && <MiniBtn onClick={() => onAdvance(o.id)}>{label}</MiniBtn>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={cx(panel, 'h-fit p-5')}>
          <p className={fieldLabel}>Suppliers</p>
          <div className="mt-3 divide-y divide-[var(--border)]">
            {d.suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0"><div className="truncate text-[var(--ink)]">{s.name}</div><div className="text-xs text-[var(--muted)]">{s.category}</div></div>
                <span className="shrink-0 text-[var(--muted)]">{s.outstanding ? money(s.outstanding) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Manufacturing ────────────────────────────────────────────────────────────
function Manufacturing({ d, onProduce }: { d: ErpData; onProduce: (id: string) => void }) {
  const item = Object.fromEntries(d.items.map((i) => [i.id, i]));
  const wos = d.workOrders;
  const inProcess = wos.filter((w) => w.status === 'In Process').length;
  const completed = wos.filter((w) => w.status === 'Completed').length;
  const mfgPosted = d.gl.filter((e) => e.voucherType === 'Manufacture').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Work orders" value={wos.length} />
        <Stat label="In process" value={inProcess} tone={inProcess ? 'warn' : 'neutral'} />
        <Stat label="Completed" value={completed} tone={completed ? 'ok' : 'neutral'} />
        <Stat label="Batches posted" value={mfgPosted} />
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Each work order carries a <span className="text-[var(--ink)]">bill of materials</span> and a <span className="text-[var(--ink)]">routing</span> of operations. Producing a batch consumes the components, applies each workstation’s labour &amp; overhead, and receives the finished good valued at <span className="text-[var(--ink)]">material + operating cost</span> — posting a balanced <span className="text-[var(--ink)]">Manufacture</span> entry to the general ledger.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {wos.map((w) => {
          const it = item[w.itemId];
          const pct = Math.round((w.produced / w.qty) * 100);
          const matPerUnit = w.bom.reduce((t, b) => t + (item[b.itemId]?.cost ?? 0) * b.qtyPerUnit, 0);
          const opPerUnit = opCostPerUnit(w.operations);
          const fgPerUnit = matPerUnit + opPerUnit;
          return (
            <div key={w.id} className={cx(panel, 'flex flex-col p-5')}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--ink)]">{w.number}</span>
                <StatusTag tone={WO_TONE[w.status]} dot={false}>{w.status}</StatusTag>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Thumb src={it?.thumbnail ?? ''} name={it?.name ?? ''} size={34} />
                <div className="min-w-0"><div className="truncate text-sm text-[var(--ink)]">{it?.name ?? '—'}</div><div className="text-xs text-[var(--muted)]">Due {fmtDate(w.due)}</div></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Produced</span><span className="text-[var(--ink)]">{w.produced} / {w.qty}</span></div>
                <Meter value={pct} className="mt-1.5" tone={w.status === 'Completed' ? 'ok' : 'accent'} />
              </div>

              <div className="mt-4 bg-[var(--bg-soft)] p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Bill of materials · per unit</div>
                <div className="mt-1.5 space-y-1">
                  {w.bom.map((b) => (
                    <div key={b.itemId} className="flex justify-between text-xs">
                      <span className="truncate text-[var(--text)]">{item[b.itemId]?.name ?? '—'} <span className="text-[var(--muted)]">×{b.qtyPerUnit}</span></span>
                      <span className="shrink-0 text-[var(--muted)]">{money((item[b.itemId]?.cost ?? 0) * b.qtyPerUnit)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 bg-[var(--bg-soft)] p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Routing · operations</div>
                <div className="mt-1.5 space-y-1">
                  {w.operations.map((op) => (
                    <div key={op.operation} className="flex justify-between text-xs">
                      <span className="truncate text-[var(--text)]">{op.operation} <span className="text-[var(--muted)]">· {op.workstation}</span></span>
                      <span className="shrink-0 text-[var(--muted)]">{op.hoursPerUnit}h × {money(op.hourlyRate)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 space-y-1 border border-[var(--border)] p-3 text-xs">
                <div className="flex justify-between"><span className="text-[var(--muted)]">Material / unit</span><span className="tabular-nums text-[var(--text)]">{money(matPerUnit)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Operating / unit</span><span className="tabular-nums text-[var(--text)]">{money(opPerUnit)}</span></div>
                <div className="flex justify-between border-t border-[var(--border)] pt-1 font-medium"><span className="text-[var(--ink)]">Finished cost / unit</span><span className="tabular-nums text-[var(--accent)]">{money(fgPerUnit)}</span></div>
              </div>

              {w.status !== 'Completed' ? (
                <button onClick={() => onProduce(w.id)} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 bg-[var(--accent)] py-2 text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-90"><Factory size={14} /> Produce batch</button>
              ) : (
                <div className="mt-4 bg-[var(--ok-bg)] py-2 text-center text-xs text-[var(--ok)]">Fully produced ✓</div>
              )}
              <p className="mt-2 text-center text-[10px] text-[var(--muted)]/60">Producing posts a Manufacture entry &amp; moves the stock ledger</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HR ───────────────────────────────────────────────────────────────────────
function HR({ d, onRunPayroll }: { d: ErpData; onRunPayroll: () => void }) {
  const [dept, setDept] = useState('All');
  const rows = d.employees.filter((e) => dept === 'All' || e.department === dept);
  const payroll = Math.round(d.employees.reduce((s, e) => s + e.salary, 0) / 12);
  const lastRun = d.payrollRuns[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Employees" value={d.employees.length} />
        <Stat label="On leave" value={d.employees.filter((e) => e.status === 'On Leave').length} />
        <Stat label="Departments" value={DEPARTMENTS.length} />
        <Stat label="Monthly payroll" value={money(payroll)} />
      </div>

      <div className={cx(panel, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Payroll run</p>
          <p className="text-xs text-[var(--muted)]">One salary slip per active employee — gross → PAYE (18%) + UIF (1%) → net. Posts Dr Salaries, Cr Bank &amp; Cr Payroll Payable to the ledger.</p>
        </div>
        <button onClick={onRunPayroll} className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-90"><Wallet size={15} /> Run payroll</button>
      </div>

      {lastRun && (
        <div className={cx('overflow-x-auto', panel)}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
            <p className={fieldLabel}>{lastRun.number} · {lastRun.period}</p>
            <span className="text-xs text-[var(--muted)]">
              {lastRun.slips.length} slips · Gross {money(lastRun.slips.reduce((s, x) => s + x.gross, 0))} · Net {money(lastRun.slips.reduce((s, x) => s + x.net, 0))}
              {d.payrollRuns.length > 1 && <> · {d.payrollRuns.length} runs posted</>}
            </span>
          </div>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className={theadCls}>
              <tr><th className={thCls}>Employee</th><th className={cx(thCls, 'text-right')}>Gross</th><th className={cx(thCls, 'text-right')}>PAYE</th><th className={cx(thCls, 'text-right')}>UIF</th><th className={cx(thCls, 'text-right')}>Net pay</th></tr>
            </thead>
            <tbody>
              {lastRun.slips.map((sl) => (
                <tr key={sl.employeeId} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2.5 text-[var(--ink)]">{sl.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text)]">{money(sl.gross)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">({money(sl.paye)})</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">({money(sl.uif)})</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink)]">{money(sl.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['All', ...DEPARTMENTS].map((dp) => (
          <button key={dp} onClick={() => setDept(dp)} className={cx('px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors', dept === dp ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]')}>{dp}</button>
        ))}
      </div>
      <div className={cx('overflow-x-auto', panel)}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className={theadCls}>
            <tr><th className={thCls}>Employee</th><th className={thCls}>Department</th><th className={thCls}>Designation</th><th className={thCls}>Joined</th><th className={cx(thCls, 'text-right')}>Salary</th><th className={thCls}>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar src={e.avatar} name={e.name} /><div className="min-w-0"><div className="truncate font-medium text-[var(--ink)]">{e.name}</div><div className="truncate text-xs text-[var(--muted)]">{e.email}</div></div></div></td>
                <td className="px-4 py-3 text-[var(--muted)]">{e.department}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{e.designation}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{fmtDate(e.joinDate)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{money(e.salary)}</td>
                <td className="px-4 py-3"><StatusTag tone={e.status === 'Active' ? 'ok' : 'warn'} dot={false}>{e.status}</StatusTag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Projects ─────────────────────────────────────────────────────────────────
function Projects({ d }: { d: ErpData }) {
  const cust = Object.fromEntries(d.customers.map((c) => [c.id, c]));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {d.projects.map((p) => {
        const over = p.spent > p.budget;
        const tone: Tone = p.status === 'Completed' ? 'ok' : p.status === 'On Hold' ? 'warn' : 'accent';
        return (
          <div key={p.id} className={cx(panel, 'p-5')}>
            <div className="flex items-center justify-between">
              <StatusTag tone={tone} dot={false}>{p.status}</StatusTag>
              <span className="text-xs text-[var(--muted)]">{p.tasksDone}/{p.tasksTotal} tasks</span>
            </div>
            <h3 className="mt-3 font-medium text-[var(--ink)]">{p.name}</h3>
            <div className="text-xs text-[var(--muted)]">{cust[p.customerId]?.name ?? '—'}</div>
            <div className="mt-4">
              <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Progress</span><span className="text-[var(--ink)]">{p.percent}%</span></div>
              <Meter value={p.percent} className="mt-1.5" tone={tone === 'warn' ? 'warn' : 'accent'} />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-[var(--muted)]">Budget {money(p.budget)}</span>
              <span className={over ? 'text-[var(--danger)]' : 'text-[var(--muted)]'}>Spent {money(p.spent)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Assets ───────────────────────────────────────────────────────────────────
function Assets({ d }: { d: ErpData }) {
  const now = Date.now();
  const rows = d.assets.map((a) => {
    const ageYears = (now - a.purchaseDate) / (365 * 86_400_000);
    const depreciated = Math.min(a.purchaseValue, a.purchaseValue * (ageYears / a.life));
    return { ...a, current: Math.max(0, a.purchaseValue - depreciated), depreciated };
  });
  const totalValue = rows.reduce((s, a) => s + a.purchaseValue, 0);
  const totalCurrent = rows.reduce((s, a) => s + a.current, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Assets" value={d.assets.length} />
        <Stat label="Purchase value" value={money(totalValue)} />
        <Stat label="Book value (now)" value={money(totalCurrent)} />
      </div>
      <div className={cx('overflow-x-auto', panel)}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className={theadCls}>
            <tr><th className={thCls}>Asset</th><th className={thCls}>Category</th><th className={thCls}>Purchased</th><th className={cx(thCls, 'text-right')}>Cost</th><th className={cx(thCls, 'text-right')}>Depreciation</th><th className={cx(thCls, 'text-right')}>Book value</th><th className={thCls}>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium text-[var(--ink)]">{a.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{a.category}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{fmtDate(a.purchaseDate)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{money(a.purchaseValue)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">({money(a.depreciated)})</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">{money(a.current)}</td>
                <td className="px-4 py-3"><StatusTag tone={a.status === 'In Use' ? 'ok' : a.status === 'Idle' ? 'warn' : 'neutral'} dot={false}>{a.status}</StatusTag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reports ──────────────────────────────────────────────────────────────────
function Reports({ d }: { d: ErpData }) {
  const maxM = Math.max(1, ...d.monthly.map((m) => Math.max(m.revenue, m.expenses)));
  // Stock by category
  const catMap: Record<string, number> = {};
  d.items.forEach((it) => { catMap[it.category] = (catMap[it.category] || 0) + it.stock * it.cost; });
  const cats = Object.entries(catMap).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const maxCat = Math.max(1, ...cats.map((c) => c.value));
  // Sales by customer
  const custMap: Record<string, number> = {};
  const custName = Object.fromEntries(d.customers.map((c) => [c.id, c.name]));
  d.salesOrders.forEach((o) => { custMap[o.customerId] = (custMap[o.customerId] || 0) + orderTotal(o.lines); });
  const topCust = Object.entries(custMap).map(([id, value]) => ({ label: custName[id] ?? '—', value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const maxCust = Math.max(1, ...topCust.map((c) => c.value));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={cx(panel, 'p-5')}>
        <p className={fieldLabel}>Revenue vs expenses (6mo)</p>
        <div className="mt-5 flex h-44 gap-4">
          {d.monthly.map((m) => (
            <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end justify-center gap-1">
                <div className="w-1/2 bg-[var(--accent)]" style={{ height: `${(m.revenue / maxM) * 100}%` }} />
                <div className="w-1/2 bg-[var(--border)]" style={{ height: `${(m.expenses / maxM) * 100}%` }} />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={cx(panel, 'p-5')}>
        <p className={fieldLabel}>Stock value by category</p>
        <div className="mt-4 space-y-2">
          {cats.map((c) => (
            <div key={c.label}>
              <div className="flex justify-between text-sm"><span className="capitalize text-[var(--muted)]">{c.label}</span><span className="text-[var(--ink)]">{money(c.value)}</span></div>
              <Meter value={(c.value / maxCat) * 100} className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>

      <div className={cx(panel, 'p-5')}>
        <p className={fieldLabel}>Top customers by order value</p>
        <div className="mt-4 space-y-2">
          {topCust.map((c) => (
            <div key={c.label}>
              <div className="flex justify-between text-sm"><span className="truncate text-[var(--muted)]">{c.label}</span><span className="text-[var(--ink)]">{money(c.value)}</span></div>
              <Meter value={(c.value / maxCust) * 100} className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>

      <div className={cx(panel, 'p-5')}>
        <p className={fieldLabel}>Order pipeline</p>
        <div className="mt-4 space-y-3">
          {(['Draft', 'To Deliver', 'To Bill', 'Completed'] as SOStatus[]).map((st) => {
            const n = d.salesOrders.filter((o) => o.status === st).length;
            return (
              <div key={st} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-[var(--muted)]">{st}</span>
                <div className="h-7 flex-1 overflow-hidden bg-[var(--bg-soft)]">
                  <div className="flex h-full items-center justify-end bg-[var(--accent)] px-2 text-[11px] font-medium text-[var(--accent-ink)]" style={{ width: `${Math.max((n / Math.max(1, d.salesOrders.length)) * 100, 8)}%` }}>{n}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
function SettingsView({ d }: { d: ErpData }) {
  const modules = NAV.filter((n) => n.id !== 'dashboard' && n.id !== 'settings');
  return (
    <div className="space-y-5">
      <div className={cx(panel, 'p-5')}>
        <p className={fieldLabel}>Company</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['Legal name', 'Andrew Trading (Pty) Ltd'],
            ['Base currency', 'USD ($)'],
            ['Fiscal year', 'Jan – Dec'],
            ['Country', 'South Africa'],
            ['Time zone', 'Africa/Johannesburg'],
            ['Chart of accounts', 'Standard'],
          ].map(([k, v]) => (
            <div key={k} className="bg-[var(--bg-soft)] px-4 py-3"><div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">{k}</div><div className="text-sm text-[var(--ink)]">{v}</div></div>
          ))}
        </div>
      </div>
      <div className={cx(panel, 'p-5')}>
        <p className={fieldLabel}>Enabled modules</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {modules.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)]"><m.icon size={13} className="text-[var(--accent)]" /> {m.label}</span>
          ))}
        </div>
      </div>
      <ApiCredit d={d} />
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────────────────
function ApiCredit({ d }: { d: ErpData }) {
  return (
    <div className={cx(panel, 'p-5')}>
      <h3 className="flex items-center gap-2 font-display text-lg font-medium text-[var(--ink)]"><Database size={17} className="text-[var(--accent)]" /> Data &amp; references</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Inventory items were loaded from <span className="text-[var(--ink)]">{d.productsSource === 'DummyJSON' ? 'the DummyJSON API (live)' : 'a built-in fallback set'}</span> and employees from <span className="text-[var(--ink)]">{d.peopleSource === 'randomuser.me' ? 'randomuser.me (live)' : 'a built-in fallback set'}</span>. Customers, suppliers, orders, work orders, projects, assets, accounts and journal entries are generated on top with a seeded random generator, so the dataset stays small and reproducible.
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
        <li>• <span className="text-[var(--ink)]">DummyJSON</span> — real product names, prices, stock levels, categories, and images for inventory.</li>
        <li>• <span className="text-[var(--ink)]">randomuser.me</span> — names, emails, and photos for the HR module.</li>
        <li>• <span className="text-[var(--ink)]">DiceBear</span> — generated company logos and avatar fallbacks.</li>
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]/70">
        The double-entry model, order-to-cash / procure-to-pay document chains and perpetual-inventory valuation follow the conventions of ERPNext (open-source ERP); all data and code here are original. Front-end demo — everything you change lives in your browser only.
      </p>
    </div>
  );
}
