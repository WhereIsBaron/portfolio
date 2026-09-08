// ─────────────────────────────────────────────────────────────────────────
// ERP demo data layer.
//
// Populates a small but FULL-FEATURED ERP dataset for the front-end demo,
// modelled on the module map of systems like ERPNext: accounting, inventory,
// buying, selling, manufacturing, HR, projects and assets.
//
// Real data is pulled LIVE from two free public APIs:
//   • DummyJSON  (dummyjson.com/products) — inventory items with real names,
//     prices, stock levels, categories and images.
//   • randomuser.me — employees for the HR module.
// DiceBear provides avatar fallbacks. If either API is unavailable we fall back
// to a small baked-in set so the demo NEVER breaks.
//
// Everything else (customers, suppliers, orders, work orders, projects, assets,
// accounts, journal entries) is generated with a seeded PRNG so the dataset is
// reproducible run-to-run and deliberately tiny — a simulation, not a data dump.
// ─────────────────────────────────────────────────────────────────────────

export const money = (n: number) =>
  (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
export const avatarFor = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed || 'x')}`;
export const logoFor = (seed: string) =>
  `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed || 'x')}`;

export type Item = {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  uom: string;
  price: number; // selling
  cost: number;
  stock: number;
  reorder: number;
  warehouse: string;
  thumbnail: string;
};

export type Customer = { id: string; name: string; group: string; outstanding: number; logo: string };
export type Supplier = { id: string; name: string; category: string; outstanding: number; logo: string };

export type OrderLine = { itemId: string; qty: number; rate: number };

// A document stamp left on an order as its lifecycle advances — the number and
// date of the Delivery Note / Sales Invoice / Payment Entry it generated. This
// is how ERPNext threads one transaction through several linked documents.
export type DocStamp = { number: string; date: number };

// Full order-to-cash lifecycle: Sales Order → Delivery Note → Sales Invoice →
// Payment Entry. Each step posts to the general ledger (and delivery moves stock).
export type SOStatus = 'Draft' | 'To Deliver' | 'To Bill' | 'To Pay' | 'Completed' | 'Cancelled';
export const SO_FLOW: SOStatus[] = ['Draft', 'To Deliver', 'To Bill', 'To Pay', 'Completed'];
export type SalesOrder = { id: string; number: string; customerId: string; date: number; lines: OrderLine[]; status: SOStatus; deliveryNote?: DocStamp; salesInvoice?: DocStamp; payment?: DocStamp };

// Full procure-to-pay lifecycle: Purchase Order → Purchase Receipt → Purchase
// Invoice → Payment Entry. Receipt moves stock; each step posts to the ledger.
export type POStatus = 'Draft' | 'To Receive' | 'To Bill' | 'To Pay' | 'Completed';
export const PO_FLOW: POStatus[] = ['Draft', 'To Receive', 'To Bill', 'To Pay', 'Completed'];
export type PurchaseOrder = { id: string; number: string; supplierId: string; date: number; lines: OrderLine[]; status: POStatus; receipt?: DocStamp; bill?: DocStamp; payment?: DocStamp };

export type WOStatus = 'Not Started' | 'In Process' | 'Completed';
// A Bill of Materials line: how much of a raw-material item is consumed per
// unit of the finished good (ERPNext BOM → Work Order → Stock Entry).
export type BomLine = { itemId: string; qtyPerUnit: number };
// A routing operation: labour/overhead applied on a workstation. Its cost is
// capitalised into the finished good's valuation (ERPNext operating cost).
export type WorkOrderOperation = { operation: string; workstation: string; hoursPerUnit: number; hourlyRate: number };
export type WorkOrder = { id: string; number: string; itemId: string; qty: number; produced: number; status: WOStatus; due: number; bom: BomLine[]; operations: WorkOrderOperation[] };
// Standard SA VAT rate, applied on sales & purchase invoices.
export const VAT_RATE = 0.15;
// Operating (labour + overhead) cost to make one finished unit.
export const opCostPerUnit = (ops: WorkOrderOperation[]) => ops.reduce((t, o) => t + o.hoursPerUnit * o.hourlyRate, 0);

// Quotation → Sales Order (ERPNext selling flow).
export type QuoteStatus = 'Draft' | 'Submitted' | 'Ordered' | 'Lost';
export type Quotation = { id: string; number: string; customerId: string; date: number; validTill: number; lines: OrderLine[]; status: QuoteStatus; salesOrderId?: string };

// Material Request → Purchase Order (ERPNext stock → buying flow). Raised when
// an item drops to/below its reorder level.
export type MRStatus = 'Requested' | 'Ordered';
export type MaterialRequest = { id: string; number: string; itemId: string; qty: number; date: number; status: MRStatus; purchaseOrderId?: string };

export type Employee = {
  id: string; name: string; avatar: string; department: string; designation: string;
  email: string; joinDate: number; salary: number; status: 'Active' | 'On Leave';
};

export type Project = {
  id: string; name: string; customerId: string; status: 'Open' | 'Completed' | 'On Hold';
  percent: number; budget: number; spent: number; tasksDone: number; tasksTotal: number;
};

export type Asset = {
  id: string; name: string; category: string; purchaseValue: number; purchaseDate: number;
  life: number; status: 'In Use' | 'Idle' | 'Scrapped';
};

// A payroll run: one salary slip per employee, posted to the ledger as a batch.
export type SalarySlip = { employeeId: string; name: string; gross: number; paye: number; uif: number; net: number };
export type PayrollRun = { id: string; number: string; period: string; date: number; slips: SalarySlip[] };

export type AcctType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
// `balance` here is the OPENING balance (all history before the session). Live
// postings are held in the general ledger and layered on top — see accountBalances.
export type Account = { name: string; type: AcctType; balance: number };
export type JournalEntry = { id: string; date: number; voucher: string; account: string; debit: number; credit: number };

// ── General ledger ───────────────────────────────────────────────────────────
// Every posting is a balanced set of lines (total debits === total credits).
// This is the single source of truth the financial statements are derived from.
export type GLLine = { account: string; debit: number; credit: number };
export type GLEntry = { id: string; date: number; voucherType: string; voucherNo: string; party?: string; lines: GLLine[] };

// Debit-normal account types carry their balance on the debit side.
const DEBIT_NORMAL = new Set<AcctType>(['Asset', 'Expense']);

export const accountTypes = (accounts: Account[]): Record<string, AcctType> =>
  Object.fromEntries(accounts.map((a) => [a.name, a.type]));

// Live balance for every account: opening balance + the effect of all GL
// postings. Debit-normal accounts move up on debits, credit-normal on credits.
export function accountBalances(accounts: Account[], gl: GLEntry[]): Record<string, number> {
  const type = accountTypes(accounts);
  const bal: Record<string, number> = {};
  for (const a of accounts) bal[a.name] = a.balance;
  for (const e of gl)
    for (const l of e.lines) {
      const debitNormal = DEBIT_NORMAL.has(type[l.account] ?? 'Asset');
      bal[l.account] = (bal[l.account] ?? 0) + (debitNormal ? l.debit - l.credit : l.credit - l.debit);
    }
  return bal;
}

// A stock-ledger entry: one movement of one item, valued. Item on-hand stock and
// inventory valuation are both derived from the running stock ledger (ERPNext).
export type StockEntry = { id: string; date: number; itemId: string; qty: number; rate: number; voucherType: string; voucherNo: string; warehouse: string };

export type ErpData = {
  items: Item[];
  warehouses: string[];
  customers: Customer[];
  suppliers: Supplier[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  materialRequests: MaterialRequest[];
  purchaseOrders: PurchaseOrder[];
  workOrders: WorkOrder[];
  employees: Employee[];
  departments: string[];
  projects: Project[];
  assets: Asset[];
  accounts: Account[];
  journal: JournalEntry[];
  gl: GLEntry[];
  stockLedger: StockEntry[];
  payrollRuns: PayrollRun[];
  monthly: { label: string; revenue: number; expenses: number }[];
  productsSource: 'DummyJSON' | 'fallback';
  peopleSource: 'randomuser.me' | 'fallback';
};

export const WAREHOUSES = ['Main Store', 'Cape Town DC', 'Johannesburg DC', 'Returns'];
export const DEPARTMENTS = ['Sales', 'Operations', 'Finance', 'Engineering', 'HR'];
const DESIGNATIONS: Record<string, string[]> = {
  Sales: ['Account Executive', 'Sales Manager', 'SDR'],
  Operations: ['Ops Coordinator', 'Warehouse Lead', 'Logistics Manager'],
  Finance: ['Accountant', 'Finance Manager', 'AP Clerk'],
  Engineering: ['Software Engineer', 'QA Analyst', 'Eng Manager'],
  HR: ['HR Generalist', 'Recruiter', 'HR Manager'],
};
const CUSTOMER_NAMES = [
  'Nova Retail Group', 'Kalahari Logistics', 'BluePeak Health', 'Summit Freight',
  'Orbit Software', 'Coastal Hospitality', 'Ironwood Construction', 'Pulse Media',
  'Northstar Finance', 'Meridian Travel',
];
const CUSTOMER_GROUPS = ['Enterprise', 'SMB', 'Government', 'Reseller'];
const SUPPLIER_NAMES = [
  'Apex Components', 'Global Packaging Co.', 'Riverside Textiles', 'PrimeMetal Supplies',
  'EverGreen Materials', 'TechParts Distribution', 'Unity Freight', 'Delta Raw Goods',
];
const SUPPLIER_CATS = ['Raw materials', 'Packaging', 'Components', 'Logistics', 'Services'];
// Routing catalogue: [operation, workstation, hourly rate]. Work orders pick a
// short routing from this; each operation's labour is capitalised into stock.
const OPERATIONS: [string, string, number][] = [
  ['Cutting', 'Cutting Station', 45],
  ['Machining', 'CNC Cell', 65],
  ['Assembly', 'Assembly Line 1', 35],
  ['Welding', 'Weld Bay', 55],
  ['Finishing', 'Finishing Booth', 30],
  ['Quality Check', 'QA Bench', 40],
  ['Packaging', 'Packing Line', 25],
];
const ASSET_NAMES = [
  ['Delivery Van', 'Vehicles', 45000, 6], ['Forklift', 'Machinery', 28000, 8],
  ['CNC Machine', 'Machinery', 120000, 10], ['Office Fit-out', 'Furniture', 18000, 7],
  ['Server Rack', 'IT Equipment', 32000, 5], ['Laptop Fleet', 'IT Equipment', 24000, 4],
  ['Warehouse Racking', 'Equipment', 15000, 10], ['Company Car', 'Vehicles', 38000, 6],
] as const;

// ── PRNG ─────────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const pickN = <T,>(rng: () => number, arr: T[], n: number): T[] => {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
};
const rint = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

// ── Fallback source data ─────────────────────────────────────────────────────
type RawItem = { title: string; price: number; stock: number; category: string; brand: string; thumbnail: string };
type RawPerson = { first: string; last: string; email: string; avatar: string };

const FALLBACK_ITEMS: RawItem[] = [
  ['Wireless Earbuds', 89, 120, 'electronics', 'Acme'],
  ['Standing Desk', 420, 34, 'furniture', 'Ergohaus'],
  ['Cotton T-Shirt', 19, 500, 'apparel', 'Basics'],
  ['Stainless Bottle', 25, 260, 'lifestyle', 'HydroPro'],
  ['Mechanical Keyboard', 110, 78, 'electronics', 'KeyForge'],
  ['Office Chair', 260, 40, 'furniture', 'Ergohaus'],
  ['Running Shoes', 95, 150, 'apparel', 'Stride'],
  ['LED Monitor 27"', 230, 55, 'electronics', 'Vivid'],
  ['Ceramic Mug', 12, 800, 'lifestyle', 'HomeCraft'],
  ['Backpack', 65, 210, 'apparel', 'Trekker'],
  ['Desk Lamp', 40, 175, 'furniture', 'Lumen'],
  ['USB-C Hub', 55, 300, 'electronics', 'PortMax'],
].map(([title, price, stock, category, brand]) => ({
  title: title as string, price: price as number, stock: stock as number,
  category: category as string, brand: brand as string, thumbnail: '',
}));

const FALLBACK_PEOPLE: RawPerson[] = [
  ['Amara', 'Okafor'], ['Liam', 'Bennett'], ['Sofia', 'Rossi'], ['Noah', 'Williams'],
  ['Priya', 'Sharma'], ['Ethan', 'Nguyen'], ['Chloe', 'Dubois'], ['Marcus', 'Johansson'],
  ['Zanele', 'Dlamini'], ['Diego', 'Fernández'], ['Hana', 'Kim'], ['Oliver', 'Murphy'],
].map(([first, last]) => ({
  first, last,
  email: `${first.toLowerCase()}.${last.toLowerCase()}@company.com`,
  avatar: avatarFor(first + last),
}));

// ── Build ────────────────────────────────────────────────────────────────────
function buildErpData(
  rawItems: RawItem[],
  rawPeople: RawPerson[],
  productsSource: ErpData['productsSource'],
  peopleSource: ErpData['peopleSource'],
): ErpData {
  const rng = mulberry32(90210);
  const now = Date.now();
  const day = 86_400_000;

  const items: Item[] = rawItems.map((r, i) => {
    const price = Math.max(5, Math.round(r.price));
    return {
      id: `it${i + 1}`,
      code: `SKU-${1000 + i}`,
      name: r.title,
      category: r.category || 'general',
      brand: r.brand || 'Generic',
      uom: 'Nos',
      price,
      cost: Math.round(price * (0.5 + rng() * 0.2)),
      stock: r.stock ?? rint(rng, 0, 300),
      reorder: pick(rng, [10, 20, 25, 40, 50]),
      warehouse: pick(rng, WAREHOUSES),
      thumbnail: r.thumbnail || '',
    };
  });
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  const customers: Customer[] = CUSTOMER_NAMES.map((name, i) => ({
    id: `cu${i + 1}`,
    name,
    group: pick(rng, CUSTOMER_GROUPS),
    outstanding: rng() > 0.4 ? rint(rng, 1, 40) * 1000 : 0,
    logo: logoFor(name),
  }));

  const suppliers: Supplier[] = SUPPLIER_NAMES.map((name, i) => ({
    id: `su${i + 1}`,
    name,
    category: pick(rng, SUPPLIER_CATS),
    outstanding: rng() > 0.4 ? rint(rng, 1, 30) * 1000 : 0,
    logo: logoFor(name),
  }));

  const mkLines = (n: number): OrderLine[] =>
    pickN(rng, items, n).map((it) => ({ itemId: it.id, qty: rint(rng, 1, 40), rate: it.price }));

  const salesOrders: SalesOrder[] = Array.from({ length: 14 }, (_, i) => {
    const status = pick(rng, [...SO_FLOW, 'To Deliver', 'Completed', 'Completed'] as SOStatus[]);
    return {
      id: `so${i + 1}`,
      number: `SAL-ORD-${2000 + i}`,
      customerId: pick(rng, customers).id,
      date: now - rint(rng, 0, 120) * day,
      lines: mkLines(rint(rng, 1, 3)),
      status,
    };
  });

  const purchaseOrders: PurchaseOrder[] = Array.from({ length: 10 }, (_, i) => {
    const status = pick(rng, [...PO_FLOW, 'To Receive', 'Completed'] as POStatus[]);
    return {
      id: `po${i + 1}`,
      number: `PUR-ORD-${3000 + i}`,
      supplierId: pick(rng, suppliers).id,
      date: now - rint(rng, 0, 90) * day,
      lines: mkLines(rint(rng, 1, 3)).map((l) => ({ ...l, rate: itemById[l.itemId].cost })),
      status,
    };
  });

  const woStatuses: WOStatus[] = ['Not Started', 'In Process', 'In Process', 'Completed'];
  const workOrders: WorkOrder[] = Array.from({ length: 8 }, (_, i) => {
    const it = pick(rng, items);
    const qty = rint(rng, 20, 200);
    const status = woStatuses[i % woStatuses.length];
    const produced = status === 'Completed' ? qty : status === 'In Process' ? Math.round(qty * (0.2 + rng() * 0.5)) : 0;
    // A small BOM: 2–3 other items consumed per finished unit.
    const bom: BomLine[] = pickN(rng, items.filter((x) => x.id !== it.id), rint(rng, 2, 3))
      .map((c) => ({ itemId: c.id, qtyPerUnit: rint(rng, 1, 4) }));
    // A short routing: 2–3 sequential operations on their workstations.
    const operations: WorkOrderOperation[] = pickN(rng, OPERATIONS, rint(rng, 2, 3))
      .map(([operation, workstation, hourlyRate]) => ({
        operation, workstation, hourlyRate,
        hoursPerUnit: Math.round((0.1 + rng() * 0.4) * 100) / 100,
      }));
    return {
      id: `wo${i + 1}`,
      number: `MFG-WO-${4000 + i}`,
      itemId: it.id,
      qty,
      produced,
      status,
      due: now + (rint(rng, 0, 40) - 10) * day,
      bom,
      operations,
    };
  });

  // Quotations — some still open, some already turned into sales orders.
  const quoteStatuses: QuoteStatus[] = ['Draft', 'Submitted', 'Submitted', 'Ordered', 'Lost'];
  const quotations: Quotation[] = Array.from({ length: 8 }, (_, i) => {
    const date = now - rint(rng, 0, 60) * day;
    return {
      id: `qt${i + 1}`,
      number: `SAL-QTN-${5000 + i}`,
      customerId: pick(rng, customers).id,
      date,
      validTill: date + 30 * day,
      lines: mkLines(rint(rng, 1, 3)),
      status: quoteStatuses[i % quoteStatuses.length],
    };
  });

  // Material requests — auto-raised for items at/below reorder level.
  const lowItems = items.filter((it) => it.stock <= it.reorder).slice(0, 8);
  const materialRequests: MaterialRequest[] = lowItems.map((it, i) => ({
    id: `mr${i + 1}`,
    number: `MAT-MR-${6000 + i}`,
    itemId: it.id,
    qty: Math.max(it.reorder * 3 - it.stock, it.reorder),
    date: now - rint(rng, 0, 14) * day,
    status: 'Requested',
  }));

  const employees: Employee[] = rawPeople.map((p, i) => {
    const department = DEPARTMENTS[i % DEPARTMENTS.length];
    return {
      id: `emp${i + 1}`,
      name: `${p.first} ${p.last}`,
      avatar: p.avatar,
      department,
      designation: pick(rng, DESIGNATIONS[department]),
      email: p.email,
      joinDate: now - rint(rng, 60, 1500) * day,
      salary: rint(rng, 30, 120) * 1000,
      status: rng() > 0.85 ? 'On Leave' : 'Active',
    };
  });

  const projects: Project[] = Array.from({ length: 6 }, (_, i) => {
    const tasksTotal = rint(rng, 6, 20);
    const percent = pick(rng, [15, 30, 45, 60, 80, 100]);
    const budget = rint(rng, 20, 120) * 1000;
    return {
      id: `pr${i + 1}`,
      name: pick(rng, ['ERP Rollout', 'Warehouse Automation', 'Website Revamp', 'Mobile App', 'Data Migration', 'Compliance Audit']) + ` — ${pick(rng, customers).name.split(' ')[0]}`,
      customerId: pick(rng, customers).id,
      status: percent === 100 ? 'Completed' : rng() > 0.85 ? 'On Hold' : 'Open',
      percent,
      budget,
      spent: Math.round(budget * (percent / 100) * (0.7 + rng() * 0.5)),
      tasksDone: Math.round((tasksTotal * percent) / 100),
      tasksTotal,
    };
  });

  const assets: Asset[] = ASSET_NAMES.map(([name, category, value, life], i) => ({
    id: `as${i + 1}`,
    name,
    category,
    purchaseValue: value,
    purchaseDate: now - rint(rng, 100, 1400) * day,
    life,
    status: rng() > 0.85 ? 'Idle' : 'In Use',
  }));

  // ── Financials ─────────────────────────────────────────────────────────────
  const stockValue = items.reduce((s, it) => s + it.stock * it.cost, 0);
  const receivable = customers.reduce((s, c) => s + c.outstanding, 0);
  const payable = suppliers.reduce((s, c) => s + c.outstanding, 0);

  // Monthly revenue / expenses (seeded) for the last 6 months.
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - i), 1);
    const revenue = rint(rng, 180, 420) * 1000;
    const expenses = Math.round(revenue * (0.6 + rng() * 0.25));
    return { label: d.toLocaleDateString('en-GB', { month: 'short' }), revenue, expenses };
  });
  const revenueYTD = monthly.reduce((s, m) => s + m.revenue, 0);
  const expensesYTD = monthly.reduce((s, m) => s + m.expenses, 0);
  const salaries = Math.round(employees.reduce((s, e) => s + e.salary, 0) / 12);
  const cogs = Math.round(revenueYTD * 0.45);
  const netProfit = revenueYTD - expensesYTD;

  const accounts: Account[] = [
    { name: 'Cash', type: 'Asset', balance: rint(rng, 40, 90) * 1000 },
    { name: 'Bank', type: 'Asset', balance: rint(rng, 200, 500) * 1000 },
    { name: 'Accounts Receivable', type: 'Asset', balance: receivable },
    { name: 'Inventory', type: 'Asset', balance: stockValue },
    { name: 'Fixed Assets', type: 'Asset', balance: assets.reduce((s, a) => s + a.purchaseValue, 0) },
    { name: 'Accounts Payable', type: 'Liability', balance: payable },
    { name: 'Stock Received Not Billed', type: 'Liability', balance: 0 },
    { name: 'VAT Payable', type: 'Liability', balance: 0 },
    { name: 'Payroll Payable', type: 'Liability', balance: 0 },
    { name: 'Loans', type: 'Liability', balance: rint(rng, 50, 200) * 1000 },
    { name: 'Share Capital', type: 'Equity', balance: rint(rng, 200, 400) * 1000 },
    { name: 'Retained Earnings', type: 'Equity', balance: netProfit },
    { name: 'Sales Revenue', type: 'Income', balance: revenueYTD },
    { name: 'Service Revenue', type: 'Income', balance: rint(rng, 40, 120) * 1000 },
    { name: 'Cost of Goods Sold', type: 'Expense', balance: cogs },
    { name: 'Manufacturing Overhead Applied', type: 'Expense', balance: 0 },
    { name: 'Salaries', type: 'Expense', balance: salaries * 6 },
    { name: 'Rent', type: 'Expense', balance: rint(rng, 8, 20) * 1000 * 6 },
    { name: 'Marketing', type: 'Expense', balance: rint(rng, 5, 25) * 1000 },
    { name: 'Utilities', type: 'Expense', balance: rint(rng, 3, 9) * 1000 * 6 },
  ];

  const VOUCHERS = ['Sales Invoice', 'Purchase Invoice', 'Payment Entry', 'Journal Entry', 'Payroll'];
  const journal: JournalEntry[] = Array.from({ length: 12 }, (_, i) => {
    const acct = pick(rng, accounts);
    const amt = rint(rng, 2, 80) * 1000;
    const debit = acct.type === 'Asset' || acct.type === 'Expense';
    return {
      id: `je${i + 1}`,
      date: now - rint(rng, 0, 60) * day,
      voucher: pick(rng, VOUCHERS),
      account: acct.name,
      debit: debit ? amt : 0,
      credit: debit ? 0 : amt,
    };
  }).sort((a, b) => b.date - a.date);

  return {
    items, warehouses: WAREHOUSES, customers, suppliers, quotations, salesOrders,
    materialRequests, purchaseOrders, workOrders, employees, departments: DEPARTMENTS,
    projects, assets, accounts, journal, gl: [], stockLedger: [], payrollRuns: [], monthly,
    productsSource, peopleSource,
  };
}

// ── Live fetch ───────────────────────────────────────────────────────────────
async function fetchProducts(): Promise<{ items: RawItem[]; source: ErpData['productsSource'] }> {
  try {
    const res = await fetch('https://dummyjson.com/products?limit=30&select=title,price,stock,category,brand,thumbnail');
    if (!res.ok) throw new Error(`dummyjson ${res.status}`);
    const json = await res.json();
    const items: RawItem[] = (json.products ?? []).map((p: any) => ({
      title: p.title ?? 'Item',
      price: Number(p.price) || 10,
      stock: Number(p.stock) || 0,
      category: p.category ?? 'general',
      brand: p.brand ?? '',
      thumbnail: p.thumbnail ?? '',
    }));
    if (!items.length) throw new Error('no products');
    return { items, source: 'DummyJSON' };
  } catch {
    return { items: FALLBACK_ITEMS, source: 'fallback' };
  }
}

async function fetchPeople(): Promise<{ people: RawPerson[]; source: ErpData['peopleSource'] }> {
  try {
    const res = await fetch('https://randomuser.me/api/?results=12&seed=langeveldt-erp&inc=name,email,picture');
    if (!res.ok) throw new Error(`randomuser ${res.status}`);
    const json = await res.json();
    const people: RawPerson[] = (json.results ?? []).map((r: any) => ({
      first: r.name?.first ?? 'Unknown',
      last: r.name?.last ?? '',
      email: r.email ?? 'unknown@company.com',
      avatar: r.picture?.large ?? r.picture?.medium ?? '',
    }));
    if (!people.length) throw new Error('no people');
    return { people, source: 'randomuser.me' };
  } catch {
    return { people: FALLBACK_PEOPLE, source: 'fallback' };
  }
}

export async function fetchErpData(): Promise<ErpData> {
  const [prod, ppl] = await Promise.all([fetchProducts(), fetchPeople()]);
  return buildErpData(prod.items, ppl.people, prod.source, ppl.source);
}

// Helpers used across the page.
export const orderTotal = (lines: OrderLine[]) => lines.reduce((s, l) => s + l.qty * l.rate, 0);
