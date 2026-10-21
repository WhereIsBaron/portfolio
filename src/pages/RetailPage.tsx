import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Store, ShoppingCart, Plus, Minus, Trash2, Receipt,
  CreditCard, Banknote, Boxes, TrendingUp, Package, AlertTriangle,
  Monitor, Wifi, WifiOff, RefreshCw, CheckCircle2, X, ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import Footer from '@/components/Footer';

// ─────────────────────────────────────────────────────────────────────────
// Retail Operations Console — focused single-page demo.
//
// A simulated store-operations cockpit for a multi-branch retailer, built for
// the kind of work an in-store IT officer does: a working POS register, live
// sales overview, multi-store inventory with replenishment, and POS terminal
// fleet health. Seeded from a fixed PRNG so figures are reproducible. Prices
// are in Botswana Pula (P) with 14% VAT.
//
// Reference system (UX/feature study only — no code reused): Odoo POS &
// Inventory. All logic, data and UI here are original.
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

const VAT = 0.14;
const money = (n: number) => `P${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money0 = (n: number) => `P${Math.round(n).toLocaleString('en-ZA')}`;

// ── Stores ──────────────────────────────────────────────────────────────────

type Store = { id: string; name: string; city: string };
const STORES: Store[] = [
  { id: 'GBE', name: 'Game City',        city: 'Gaborone' },
  { id: 'AJ',  name: 'Airport Junction', city: 'Gaborone' },
  { id: 'FTN', name: 'Francistown',      city: 'Francistown' },
  { id: 'MUN', name: 'Maun Mall',        city: 'Maun' },
];

// ── Catalogue ─────────────────────────────────────────────────────────────────

type Product = { sku: string; name: string; category: string; price: number };
const PRODUCTS: Product[] = [
  { sku: 'AP-1001', name: 'Classic Cotton Tee',     category: 'Apparel',     price: 189 },
  { sku: 'AP-1002', name: 'Denim Jacket',           category: 'Apparel',     price: 749 },
  { sku: 'AP-1003', name: 'Chino Trousers',         category: 'Apparel',     price: 429 },
  { sku: 'AP-1004', name: 'Knit Hoodie',            category: 'Apparel',     price: 549 },
  { sku: 'FW-2001', name: 'Canvas Sneakers',        category: 'Footwear',    price: 659 },
  { sku: 'FW-2002', name: 'Leather Boots',          category: 'Footwear',    price: 1299 },
  { sku: 'FW-2003', name: 'Running Shoes',          category: 'Footwear',    price: 899 },
  { sku: 'AC-3001', name: 'Leather Belt',           category: 'Accessories', price: 229 },
  { sku: 'AC-3002', name: 'Beanie',                 category: 'Accessories', price: 129 },
  { sku: 'AC-3003', name: 'Canvas Tote',            category: 'Accessories', price: 179 },
  { sku: 'AC-3004', name: 'Aviator Sunglasses',     category: 'Accessories', price: 349 },
  { sku: 'HM-4001', name: 'Cotton Throw Blanket',   category: 'Home',        price: 399 },
  { sku: 'HM-4002', name: 'Scented Candle',         category: 'Home',        price: 149 },
  { sku: 'HM-4003', name: 'Ceramic Mug Set',        category: 'Home',        price: 259 },
];
const CATEGORIES = ['All', ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];

// ── Seeded stock (product × store) ──────────────────────────────────────────────

const stockRng = mulberry32(48048);
const STOCK: Record<string, Record<string, number>> = {};
for (const p of PRODUCTS) {
  STOCK[p.sku] = {};
  for (const s of STORES) {
    // Some cells deliberately low to drive the replenishment view.
    STOCK[p.sku][s.id] = stockRng() > 0.82 ? rint(stockRng, 0, 4) : rint(stockRng, 6, 40);
  }
}
const REORDER_POINT = 5;

// ── Seeded sales for the overview ───────────────────────────────────────────────

const salesRng = mulberry32(1948);
const HOURS = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
const HOURLY_SALES = HOURS.map((h) => {
  // Lunchtime + evening peaks.
  const base = Number(h) >= 12 && Number(h) <= 14 ? 1.6 : Number(h) >= 17 ? 1.4 : 1;
  return { hour: h, revenue: Math.round(base * (2200 + salesRng() * 4200)) };
});
const DAY_REVENUE = HOURLY_SALES.reduce((a, b) => a + b.revenue, 0);
const DAY_TXNS = rint(salesRng, 180, 240);

const STORE_PERF = STORES.map((s) => ({
  store: s,
  revenue: Math.round(DAY_REVENUE * (0.18 + salesRng() * 0.17)),
  txns: rint(salesRng, 28, 72),
})).sort((a, b) => b.revenue - a.revenue);

const TOP_PRODUCTS = [...PRODUCTS]
  .map((p) => ({ product: p, units: rint(salesRng, 4, 46) }))
  .sort((a, b) => b.units - a.units)
  .slice(0, 6);

// ── Seeded POS terminal fleet ───────────────────────────────────────────────────

type Terminal = {
  id: string;
  store: Store;
  status: 'online' | 'offline' | 'syncing';
  lastTxnMin: number;
  version: string;
};
const termRng = mulberry32(777);
const TERMINALS: Terminal[] = STORES.flatMap((s, si) =>
  Array.from({ length: si === 0 ? 3 : 2 }, (_, i) => {
    const roll = termRng();
    const status: Terminal['status'] = roll > 0.88 ? 'offline' : roll > 0.78 ? 'syncing' : 'online';
    return {
      id: `${s.id}-POS${i + 1}`,
      store: s,
      status,
      lastTxnMin: status === 'offline' ? rint(termRng, 40, 180) : rint(termRng, 0, 12),
      version: termRng() > 0.3 ? '4.2.1' : '4.1.7',
    };
  })
);

// ── Shared UI ─────────────────────────────────────────────────────────────────

const card = 'rounded-2xl border border-white/10 bg-[var(--surface)]';

function Kpi({ label, value, sub, Icon }: { label: string; value: string; sub: string; Icon: LucideIcon }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon size={14} className="text-[var(--brand-bright)]" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
      <p className="mt-1 text-[10px] text-[var(--muted)]/70">{sub}</p>
    </div>
  );
}

// ── POS Register (interactive) ───────────────────────────────────────────────────

type CartLine = { product: Product; qty: number };

function PosRegister() {
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tender, setTender] = useState<{ method: 'Cash' | 'Card'; paid: number } | null>(null);

  const shown = useMemo(() => (cat === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat)), [cat]);

  const add = (p: Product) =>
    setCart((c) => {
      const found = c.find((l) => l.product.sku === p.sku);
      return found
        ? c.map((l) => (l.product.sku === p.sku ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { product: p, qty: 1 }];
    });
  const bump = (sku: string, d: number) =>
    setCart((c) =>
      c.flatMap((l) => (l.product.sku === sku ? (l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d }]) : [l]))
    );
  const remove = (sku: string) => setCart((c) => c.filter((l) => l.product.sku !== sku));

  const subtotal = cart.reduce((a, l) => a + l.product.price * l.qty, 0);
  const vat = subtotal * VAT;
  const total = subtotal + vat;
  const units = cart.reduce((a, l) => a + l.qty, 0);

  const pay = (method: 'Cash' | 'Card') => {
    // Cash rounds up to the next P20 note; card is exact.
    const paid = method === 'Cash' ? Math.ceil(total / 20) * 20 : total;
    setTender({ method, paid });
  };

  const newSale = () => {
    setCart([]);
    setTender(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Catalogue */}
      <div className={`${card} lg:col-span-3`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
          <ShoppingCart size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Register · Game City</h3>
          <div className="ml-auto flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  cat === c ? 'bg-white/10 text-white' : 'text-[var(--muted)] hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          {shown.map((p) => (
            <button
              key={p.sku}
              onClick={() => add(p)}
              className="group flex flex-col rounded-xl border border-white/10 bg-[var(--bg-soft)] p-3 text-left transition-colors hover:border-[var(--brand-bright)]/40"
            >
              <span className="font-mono text-[10px] text-[var(--muted)]/70">{p.sku}</span>
              <span className="mt-0.5 text-xs font-medium text-white">{p.name}</span>
              <span className="mt-2 font-display text-sm text-[var(--brand-bright)]">{money(p.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className={`${card} flex flex-col lg:col-span-2`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Receipt size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Current sale</h3>
          {units > 0 && <span className="ml-auto text-xs text-[var(--muted)]">{units} item{units > 1 ? 's' : ''}</span>}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 320 }}>
          {cart.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-[var(--muted)]">
              <ShoppingCart size={28} className="mb-2 opacity-30" />
              Tap a product to start a sale.
            </div>
          ) : (
            cart.map((l) => (
              <div key={l.product.sku} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--bg-soft)] p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{l.product.name}</p>
                  <p className="text-[10px] text-[var(--muted)]">{money(l.product.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => bump(l.product.sku, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[var(--muted)] hover:bg-white/15 hover:text-white"><Minus size={11} /></button>
                  <span className="w-5 text-center font-mono text-xs text-white">{l.qty}</span>
                  <button onClick={() => bump(l.product.sku, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[var(--muted)] hover:bg-white/15 hover:text-white"><Plus size={11} /></button>
                </div>
                <span className="w-16 text-right font-mono text-xs text-white">{money(l.product.price * l.qty)}</span>
                <button onClick={() => remove(l.product.sku)} className="text-[var(--muted)]/60 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[var(--muted)]"><span>Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
            <div className="flex justify-between text-[var(--muted)]"><span>VAT (14%)</span><span className="font-mono">{money(vat)}</span></div>
            <div className="flex justify-between pt-1 text-sm font-semibold text-white"><span>Total</span><span className="font-mono">{money(total)}</span></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => pay('Cash')}
              disabled={cart.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-medium text-white transition-colors hover:border-white/30 disabled:opacity-40"
            >
              <Banknote size={14} /> Cash
            </button>
            <button
              onClick={() => pay('Card')}
              disabled={cart.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-bright)] py-2 text-xs font-medium text-[#0b0d10] transition-colors hover:bg-white disabled:opacity-40"
            >
              <CreditCard size={14} /> Card
            </button>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {tender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={newSale}>
          <div className={`${card} w-full max-w-sm p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Sale complete</p>
                  <p className="text-[10px] text-[var(--muted)]">Paid by {tender.method}</p>
                </div>
              </div>
              <button onClick={newSale} className="text-[var(--muted)] hover:text-white"><X size={18} /></button>
            </div>

            <div className="rounded-xl border border-dashed border-white/15 bg-[var(--bg-soft)] p-4 font-mono text-[11px] text-[var(--muted)]">
              <p className="mb-2 text-center text-white">Andrew.POS · Game City</p>
              {cart.map((l) => (
                <div key={l.product.sku} className="flex justify-between">
                  <span>{l.qty}× {l.product.name}</span>
                  <span>{money(l.product.price * l.qty)}</span>
                </div>
              ))}
              <div className="my-2 border-t border-white/10" />
              <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span>VAT 14%</span><span>{money(vat)}</span></div>
              <div className="flex justify-between text-white"><span>TOTAL</span><span>{money(total)}</span></div>
              <div className="flex justify-between"><span>{tender.method}</span><span>{money(tender.paid)}</span></div>
              {tender.method === 'Cash' && (
                <div className="flex justify-between text-[var(--brand-bright)]"><span>Change</span><span>{money(tender.paid - total)}</span></div>
              )}
            </div>

            <button onClick={newSale} className="mt-4 w-full rounded-xl bg-[var(--brand-bright)] py-2 text-xs font-medium text-[#0b0d10] transition-colors hover:bg-white">
              New sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────────

function OverviewTab() {
  const maxHour = Math.max(...HOURLY_SALES.map((h) => h.revenue));
  const maxTop = Math.max(...TOP_PRODUCTS.map((t) => t.units));
  const online = TERMINALS.filter((t) => t.status === 'online').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Revenue today" value={money0(DAY_REVENUE)} sub="across 4 stores" Icon={TrendingUp} />
        <Kpi label="Transactions" value={String(DAY_TXNS)} sub={`avg basket ${money0(DAY_REVENUE / DAY_TXNS)}`} Icon={Receipt} />
        <Kpi label="Units sold" value={String(TOP_PRODUCTS.reduce((a, t) => a + t.units, 0) + 54)} sub="SKUs moving" Icon={Package} />
        <Kpi label="Terminals online" value={`${online}/${TERMINALS.length}`} sub="POS fleet" Icon={Monitor} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hourly sales */}
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <TrendingUp size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">Sales by hour</h3>
            <span className="ml-auto text-[10px] text-[var(--muted)]">today · all stores</span>
          </div>
          <div className="flex items-end gap-2 px-5 py-6" style={{ height: 220 }}>
            {HOURLY_SALES.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-[var(--brand-bright)]/70 transition-all hover:bg-[var(--brand-bright)]"
                  style={{ height: `${(h.revenue / maxHour) * 150}px` }}
                  title={money0(h.revenue)}
                />
                <span className="text-[9px] text-[var(--muted)]">{h.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className={card}>
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <Package size={15} className="text-[var(--brand-bright)]" />
            <h3 className="text-sm font-semibold text-white">Top sellers</h3>
          </div>
          <div className="space-y-3 p-5">
            {TOP_PRODUCTS.map((t) => (
              <div key={t.product.sku}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-white">{t.product.name}</span>
                  <span className="text-[var(--muted)]">{t.units}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--brand-bright)]/70" style={{ width: `${(t.units / maxTop) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Store performance */}
      <div className={card}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Store size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Store performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-[var(--muted)]">
                <th className="px-5 py-2 font-medium">Store</th>
                <th className="px-2 py-2 font-medium">City</th>
                <th className="px-2 py-2 text-right font-medium">Transactions</th>
                <th className="px-5 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {STORE_PERF.map((s) => (
                <tr key={s.store.id} className="border-b border-white/5">
                  <td className="px-5 py-2 font-medium text-white">{s.store.name}</td>
                  <td className="px-2 py-2 text-[var(--muted)]">{s.store.city}</td>
                  <td className="px-2 py-2 text-right font-mono text-[var(--muted)]">{s.txns}</td>
                  <td className="px-5 py-2 text-right font-mono text-white">{money0(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Inventory tab ─────────────────────────────────────────────────────────────────

function InventoryTab() {
  const [showLowOnly, setShowLowOnly] = useState(false);

  const rows = PRODUCTS.map((p) => {
    const perStore = STORES.map((s) => STOCK[p.sku][s.id]);
    const total = perStore.reduce((a, b) => a + b, 0);
    const lowAt = STORES.filter((s) => STOCK[p.sku][s.id] <= REORDER_POINT);
    return { product: p, perStore, total, lowAt };
  });
  const lowCount = rows.filter((r) => r.lowAt.length > 0).length;
  const shown = showLowOnly ? rows.filter((r) => r.lowAt.length > 0) : rows;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="SKUs tracked" value={String(PRODUCTS.length)} sub={`across ${STORES.length} stores`} Icon={Boxes} />
        <Kpi label="Low-stock SKUs" value={String(lowCount)} sub={`≤ ${REORDER_POINT} units somewhere`} Icon={AlertTriangle} />
        <Kpi label="Units on hand" value={rows.reduce((a, r) => a + r.total, 0).toLocaleString()} sub="chain-wide" Icon={Package} />
        <Kpi label="Reorder point" value={String(REORDER_POINT)} sub="per store/SKU" Icon={ArrowLeftRight} />
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
          <Boxes size={15} className="text-[var(--brand-bright)]" />
          <h3 className="text-sm font-semibold text-white">Stock on hand</h3>
          <button
            onClick={() => setShowLowOnly((v) => !v)}
            className={`ml-auto rounded-lg px-3 py-1.5 text-xs transition-colors ${
              showLowOnly ? 'bg-amber-500/15 text-amber-400' : 'border border-white/10 text-[var(--muted)] hover:text-white'
            }`}
          >
            {showLowOnly ? 'Showing low stock' : 'Low stock only'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-[var(--muted)]">
                <th className="px-5 py-2 font-medium">Product</th>
                {STORES.map((s) => <th key={s.id} className="px-2 py-2 text-center font-medium" title={s.name}>{s.id}</th>)}
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="px-5 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.product.sku} className="border-b border-white/5">
                  <td className="px-5 py-2">
                    <span className="font-medium text-white">{r.product.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-[var(--muted)]/60">{r.product.sku}</span>
                  </td>
                  {STORES.map((s) => {
                    const q = STOCK[r.product.sku][s.id];
                    const low = q <= REORDER_POINT;
                    return (
                      <td key={s.id} className="px-2 py-2 text-center">
                        <span className={`font-mono ${low ? 'rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-400' : 'text-[var(--muted)]'}`}>{q}</span>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right font-mono text-white">{r.total}</td>
                  <td className="px-5 py-2 text-right">
                    {r.lowAt.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-bright)]/10 px-2 py-1 text-[10px] text-[var(--brand-bright)]">
                        <ArrowLeftRight size={11} /> Replenish {r.lowAt.map((s) => s.id).join(', ')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Terminals tab ─────────────────────────────────────────────────────────────────

const TERM_STATUS: Record<Terminal['status'], { Icon: LucideIcon; colour: string; bg: string; label: string }> = {
  online:  { Icon: Wifi,        colour: '#34d399', bg: 'bg-emerald-500/15 text-emerald-400', label: 'Online' },
  syncing: { Icon: RefreshCw,   colour: '#60a5fa', bg: 'bg-blue-500/15 text-blue-400',       label: 'Syncing' },
  offline: { Icon: WifiOff,     colour: '#f87171', bg: 'bg-red-500/15 text-red-400',         label: 'Offline' },
};

function TerminalsTab() {
  const offline = TERMINALS.filter((t) => t.status === 'offline');
  return (
    <div className="space-y-6">
      {offline.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">{offline.length} terminal{offline.length > 1 ? 's' : ''} offline</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {offline.map((t) => t.id).join(', ')} stopped reporting. Last sale {Math.min(...offline.map((t) => t.lastTxnMin))}+ min ago —
              check the store's network uplink and the terminal's offline-queue depth before reconnecting.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TERMINALS.map((t) => {
          const st = TERM_STATUS[t.status];
          return (
            <div key={t.id} className={`${card} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-[var(--muted)]" />
                  <span className="font-mono text-sm text-white">{t.id}</span>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg}`}>
                  <st.Icon size={10} className={t.status === 'syncing' ? 'animate-spin' : ''} /> {st.label}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{t.store.name} · {t.store.city}</p>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--muted)]/70">
                <span>POS v{t.version}</span>
                <span>last sale {t.lastTxnMin === 0 ? 'just now' : `${t.lastTxnMin} min ago`}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'pos' | 'inventory' | 'terminals';

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'overview',  label: 'Overview',     Icon: TrendingUp },
  { key: 'pos',       label: 'POS register', Icon: ShoppingCart },
  { key: 'inventory', label: 'Inventory',    Icon: Boxes },
  { key: 'terminals', label: 'Terminals',    Icon: Monitor },
];

export default function RetailPage() {
  usePageTitle('Retail Operations Console');
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
              Andrew<span className="text-[var(--brand-bright)]">.</span>POS
            </Link>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs text-[var(--muted)] sm:block">Retail Operations Console</span>
          </div>
          <Link to="/#work" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-white">
            <ArrowLeft size={15} /> Portfolio
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Simulated · 4 stores · Botswana Pula
        </span>
        <h1 className="mt-5 font-display text-4xl font-light text-white sm:text-5xl">
          Retail Operations <span className="text-[var(--brand-bright)]">Console</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          A store-operations cockpit for a multi-branch retailer — a working POS register that rings up a
          real basket with VAT and change, a live sales overview, multi-store inventory with replenishment
          flags, and POS terminal fleet health. All figures come from a fixed seed, so the console is reproducible.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
          <Store size={13} className="text-[var(--brand-bright)]" />
          <span>UX studied from Odoo POS &amp; Inventory — all logic and data here are original.</span>
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

        {tab === 'overview' && <OverviewTab />}
        {tab === 'pos' && <PosRegister />}
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'terminals' && <TerminalsTab />}

        <p className="mt-8 text-center text-xs text-[var(--muted)]/60">
          Multi-store POS · perpetual inventory · replenishment flags · terminal fleet health — simulated client-side
        </p>
      </main>

      <Footer />
    </div>
  );
}
