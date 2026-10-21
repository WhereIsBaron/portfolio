import { useMemo, useState } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Receipt, CreditCard, Banknote,
  Boxes, Package, AlertTriangle, Monitor, Wifi, WifiOff, RefreshCw,
  CheckCircle2, X, ArrowLeftRight, TrendingUp,
} from 'lucide-react';
import {
  DemoShell, Masthead, TabNav, Panel, Section, Stat, StatusTag, Meter,
  AccentButton, GhostButton, fieldLabel, cx, type TabDef, type Tone,
} from '@/components/demo/kit';

// ─────────────────────────────────────────────────────────────────────────
// Retail Operations Console (/retail) — Andrew.POS
//
// A store-operations console for a multi-branch retailer: a working POS
// register that rings up a live basket with VAT and change, the day's sales
// built hour by hour, perpetual inventory across branches with purchase-order
// replenishment, and POS terminal fleet health. Figures come from a fixed
// seed, so the console is fully reproducible. Prices are in Botswana Pula (P)
// with 14% VAT.
//
// UX patterns studied from Odoo POS & Inventory — all logic, data and UI
// here are original.
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
const rint = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

const VAT = 0.14;
const money = (n: number) =>
  `P${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  { sku: 'AP-1001', name: 'Classic Cotton Tee',   category: 'Apparel',     price: 189 },
  { sku: 'AP-1002', name: 'Denim Jacket',         category: 'Apparel',     price: 749 },
  { sku: 'AP-1003', name: 'Chino Trousers',       category: 'Apparel',     price: 429 },
  { sku: 'AP-1004', name: 'Knit Hoodie',          category: 'Apparel',     price: 549 },
  { sku: 'FW-2001', name: 'Canvas Sneakers',      category: 'Footwear',    price: 659 },
  { sku: 'FW-2002', name: 'Leather Boots',        category: 'Footwear',    price: 1299 },
  { sku: 'FW-2003', name: 'Running Shoes',        category: 'Footwear',    price: 899 },
  { sku: 'AC-3001', name: 'Leather Belt',         category: 'Accessories', price: 229 },
  { sku: 'AC-3002', name: 'Beanie',               category: 'Accessories', price: 129 },
  { sku: 'AC-3003', name: 'Canvas Tote',          category: 'Accessories', price: 179 },
  { sku: 'AC-3004', name: 'Aviator Sunglasses',   category: 'Accessories', price: 349 },
  { sku: 'HM-4001', name: 'Cotton Throw Blanket', category: 'Home',        price: 399 },
  { sku: 'HM-4002', name: 'Scented Candle',       category: 'Home',        price: 149 },
  { sku: 'HM-4003', name: 'Ceramic Mug Set',      category: 'Home',        price: 259 },
];
const CATEGORIES = ['All', ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];

// ── Seeded stock (product × store) ──────────────────────────────────────────────

const stockRng = mulberry32(48048);
const STOCK: Record<string, Record<string, number>> = {};
for (const p of PRODUCTS) {
  STOCK[p.sku] = {};
  for (const s of STORES) {
    STOCK[p.sku][s.id] = stockRng() > 0.82 ? rint(stockRng, 0, 4) : rint(stockRng, 6, 40);
  }
}
const REORDER_POINT = 5;

// ── Seeded sales for the overview ───────────────────────────────────────────────

const salesRng = mulberry32(1948);
const HOURS = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
const HOURLY_SALES = HOURS.map((h) => {
  const base = Number(h) >= 12 && Number(h) <= 14 ? 1.6 : Number(h) >= 17 ? 1.4 : 1;
  return { hour: h, revenue: Math.round(base * (2200 + salesRng() * 4200)) };
});
const DAY_REVENUE = HOURLY_SALES.reduce((a, b) => a + b.revenue, 0);
const DAY_TXNS = rint(salesRng, 180, 240);
const VAT_COLLECTED = DAY_REVENUE - DAY_REVENUE / (1 + VAT);

const STORE_PERF = STORES.map((s) => ({
  store: s,
  revenue: Math.round(DAY_REVENUE * (0.18 + salesRng() * 0.17)),
  txns: rint(salesRng, 28, 72),
})).sort((a, b) => b.revenue - a.revenue);

const TOP_PRODUCTS = [...PRODUCTS]
  .map((p) => ({ product: p, units: rint(salesRng, 4, 46) }))
  .sort((a, b) => b.units - a.units)
  .slice(0, 6);

// Payment mix (seeded, by transaction count).
const payRng = mulberry32(5150);
const CARD_TXNS = Math.round(DAY_TXNS * (0.54 + payRng() * 0.16));
const MOBILE_TXNS = Math.round(DAY_TXNS * (0.08 + payRng() * 0.06));
const CASH_TXNS = Math.max(0, DAY_TXNS - CARD_TXNS - MOBILE_TXNS);
const PAY_MIX: { label: string; txns: number; tone: Tone }[] = [
  { label: 'Card', txns: CARD_TXNS, tone: 'accent' },
  { label: 'Cash', txns: CASH_TXNS, tone: 'ok' },
  { label: 'Mobile money', txns: MOBILE_TXNS, tone: 'warn' },
];

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
const TERMINALS_ONLINE = TERMINALS.filter((t) => t.status === 'online').length;

// ── POS Register (interactive) ───────────────────────────────────────────────────

type CartLine = { product: Product; qty: number };

function PosRegister() {
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tender, setTender] = useState<{ method: 'Cash' | 'Card'; paid: number } | null>(null);

  const shown = useMemo(
    () => (cat === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat)),
    [cat]
  );

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
    const paid = method === 'Cash' ? Math.ceil(total / 20) * 20 : total;
    setTender({ method, paid });
  };

  const newSale = () => {
    setCart([]);
    setTender(null);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Catalogue */}
      <Panel
        className="lg:col-span-3"
        bodyClassName="p-0"
        label="Register · Game City · POS1"
        title="Catalogue"
        actions={
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cx(
                  'px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors',
                  cat === c
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3">
          {shown.map((p) => (
            <button
              key={p.sku}
              onClick={() => add(p)}
              className="group flex flex-col bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--bg-soft)]"
            >
              <span className="font-mono text-[10px] tracking-wide text-[var(--muted)]">{p.sku}</span>
              <span className="mt-1 text-sm font-medium text-[var(--ink)]">{p.name}</span>
              <span className="mt-3 font-display text-base font-medium text-[var(--accent)]">
                {money(p.price)}
              </span>
            </button>
          ))}
        </div>
      </Panel>

      {/* Cart */}
      <div className="flex flex-col border border-[var(--border)] bg-[var(--surface)] lg:col-span-2">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className={fieldLabel}>Current sale</p>
            <h2 className="mt-1 font-display text-xl font-medium text-[var(--ink)]">Basket</h2>
          </div>
          {units > 0 && (
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {units} item{units > 1 ? 's' : ''}
            </span>
          )}
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 340 }}>
          {cart.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-sm text-[var(--muted)]">
              <ShoppingCart size={28} className="mb-3 opacity-30" />
              Tap a product to start a sale.
            </div>
          ) : (
            cart.map((l) => (
              <div
                key={l.product.sku}
                className="flex items-center gap-2 border border-[var(--border)] bg-[var(--bg)] p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--ink)]">{l.product.name}</p>
                  <p className="text-[10px] text-[var(--muted)]">{money(l.product.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => bump(l.product.sku, -1)}
                    aria-label="Decrease quantity"
                    className="flex h-6 w-6 items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-5 text-center font-mono text-xs tabular-nums text-[var(--ink)]">
                    {l.qty}
                  </span>
                  <button
                    onClick={() => bump(l.product.sku, 1)}
                    aria-label="Increase quantity"
                    className="flex h-6 w-6 items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <span className="w-16 text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                  {money(l.product.price * l.qty)}
                </span>
                <button
                  onClick={() => remove(l.product.sku)}
                  aria-label="Remove line"
                  className="text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[var(--muted)]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>VAT (14%)</span>
              <span className="font-mono tabular-nums">{money(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1.5 text-sm font-semibold text-[var(--ink)]">
              <span>Total</span>
              <span className="font-mono tabular-nums">{money(total)}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <GhostButton onClick={() => pay('Cash')} disabled={cart.length === 0} className="py-2 text-xs">
              <Banknote size={14} /> Cash
            </GhostButton>
            <AccentButton onClick={() => pay('Card')} disabled={cart.length === 0} className="py-2 text-xs">
              <CreditCard size={14} /> Card
            </AccentButton>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {tender && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={newSale}
        >
          <div
            className="w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center bg-[var(--ok-bg)]">
                  <CheckCircle2 size={18} className="text-[var(--ok)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Sale complete</p>
                  <p className="text-[11px] text-[var(--muted)]">Paid by {tender.method}</p>
                </div>
              </div>
              <button onClick={newSale} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
                <X size={18} />
              </button>
            </div>

            <div className="border border-dashed border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-[11px] text-[var(--muted)]">
              <p className="mb-2 text-center font-semibold text-[var(--ink)]">Andrew.POS · Game City</p>
              {cart.map((l) => (
                <div key={l.product.sku} className="flex justify-between">
                  <span>{l.qty}× {l.product.name}</span>
                  <span>{money(l.product.price * l.qty)}</span>
                </div>
              ))}
              <div className="my-2 border-t border-[var(--border)]" />
              <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span>VAT 14%</span><span>{money(vat)}</span></div>
              <div className="flex justify-between font-semibold text-[var(--ink)]">
                <span>TOTAL</span><span>{money(total)}</span>
              </div>
              <div className="flex justify-between"><span>{tender.method}</span><span>{money(tender.paid)}</span></div>
              {tender.method === 'Cash' && (
                <div className="flex justify-between text-[var(--accent)]">
                  <span>Change</span><span>{money(tender.paid - total)}</span>
                </div>
              )}
            </div>

            <AccentButton onClick={newSale} className="mt-5 w-full py-2 text-xs">
              New sale
            </AccentButton>
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

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        <Stat label="Revenue today" value={money0(DAY_REVENUE)} sub="4 stores" tone="accent" />
        <Stat label="Transactions" value={String(DAY_TXNS)} sub={`avg basket ${money0(DAY_REVENUE / DAY_TXNS)}`} />
        <Stat label="VAT collected" value={money0(VAT_COLLECTED)} sub="remittable" />
        <Stat
          label="Terminals online"
          value={`${TERMINALS_ONLINE}/${TERMINALS.length}`}
          sub={TERMINALS_ONLINE === TERMINALS.length ? 'all reporting' : 'attention needed'}
          tone={TERMINALS_ONLINE === TERMINALS.length ? 'ok' : 'warn'}
        />
      </div>

      <Section label="Trading" title="The day so far">
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2" label="Revenue by hour" title="Sales curve">
            <div className="flex items-end gap-2" style={{ height: 200 }}>
              {HOURLY_SALES.map((h) => (
                <div key={h.hour} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full bg-[var(--accent)] opacity-80 transition-opacity group-hover:opacity-100"
                      style={{ height: `${Math.max(4, (h.revenue / maxHour) * 160)}px` }}
                      title={money0(h.revenue)}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-[var(--muted)]">{h.hour}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Units sold" title="Top sellers">
            <div className="space-y-3.5">
              {TOP_PRODUCTS.map((t) => (
                <div key={t.product.sku}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="truncate text-[var(--ink)]">{t.product.name}</span>
                    <span className="font-mono tabular-nums text-[var(--muted)]">{t.units}</span>
                  </div>
                  <Meter value={t.units} max={maxTop} tone="accent" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Section>

      <Section label="Network" title="By store & tender">
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2" bodyClassName="p-0" label="Branches" title="Store performance">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    <th className={cx('px-5 py-3 font-medium', fieldLabel)}>Store</th>
                    <th className={cx('px-2 py-3 font-medium', fieldLabel)}>City</th>
                    <th className={cx('px-2 py-3 text-right font-medium', fieldLabel)}>Txns</th>
                    <th className={cx('px-5 py-3 text-right font-medium', fieldLabel)}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {STORE_PERF.map((s) => (
                    <tr key={s.store.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-5 py-3 font-medium text-[var(--ink)]">{s.store.name}</td>
                      <td className="px-2 py-3 text-[var(--muted)]">{s.store.city}</td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-[var(--muted)]">{s.txns}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-[var(--ink)]">{money0(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel label="Today" title="Payment mix">
            <div className="space-y-4">
              {PAY_MIX.map((p) => (
                <div key={p.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{p.label}</span>
                    <span className="font-mono tabular-nums text-[var(--muted)]">
                      {p.txns} · {Math.round((p.txns / DAY_TXNS) * 100)}%
                    </span>
                  </div>
                  <Meter value={p.txns} max={DAY_TXNS} tone={p.tone} />
                </div>
              ))}
              <p className="border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                Card is the default tender; cash is still ~{Math.round((CASH_TXNS / DAY_TXNS) * 100)}% of
                baskets, so every till keeps a float and rounds change to the nearest P20 note.
              </p>
            </div>
          </Panel>
        </div>
      </Section>
    </div>
  );
}

// ── Inventory tab ─────────────────────────────────────────────────────────────────

function InventoryTab() {
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [ordered, setOrdered] = useState<Set<string>>(new Set());

  const rows = PRODUCTS.map((p) => {
    const perStore = STORES.map((s) => STOCK[p.sku][s.id]);
    const total = perStore.reduce((a, b) => a + b, 0);
    const lowAt = STORES.filter((s) => STOCK[p.sku][s.id] <= REORDER_POINT);
    return { product: p, perStore, total, lowAt };
  });
  const lowCount = rows.filter((r) => r.lowAt.length > 0).length;
  const shown = showLowOnly ? rows.filter((r) => r.lowAt.length > 0) : rows;

  const raisePo = (sku: string) =>
    setOrdered((prev) => {
      const next = new Set(prev);
      next.add(sku);
      return next;
    });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        <Stat label="SKUs tracked" value={String(PRODUCTS.length)} sub={`across ${STORES.length} stores`} />
        <Stat
          label="Low-stock SKUs"
          value={String(lowCount)}
          sub={`≤ ${REORDER_POINT} units somewhere`}
          tone={lowCount > 0 ? 'warn' : 'ok'}
        />
        <Stat label="Units on hand" value={rows.reduce((a, r) => a + r.total, 0).toLocaleString()} sub="chain-wide" />
        <Stat
          label="POs raised"
          value={String(ordered.size)}
          sub={ordered.size ? 'this session' : 'none yet'}
          tone={ordered.size ? 'accent' : 'neutral'}
        />
      </div>

      <Panel
        bodyClassName="p-0"
        label="Perpetual inventory"
        title="Stock on hand"
        actions={
          <GhostButton
            onClick={() => setShowLowOnly((v) => !v)}
            className={cx(
              'px-3 py-1.5 text-xs',
              showLowOnly && 'border-[var(--warn)] text-[var(--warn)] hover:border-[var(--warn)] hover:text-[var(--warn)]'
            )}
          >
            {showLowOnly ? 'Showing low stock' : 'Low stock only'}
          </GhostButton>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className={cx('px-5 py-3 font-medium', fieldLabel)}>Product</th>
                {STORES.map((s) => (
                  <th key={s.id} className={cx('px-2 py-3 text-center font-medium', fieldLabel)} title={s.name}>
                    {s.id}
                  </th>
                ))}
                <th className={cx('px-2 py-3 text-right font-medium', fieldLabel)}>Total</th>
                <th className={cx('px-5 py-3 text-right font-medium', fieldLabel)}>Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const isOrdered = ordered.has(r.product.sku);
                return (
                  <tr key={r.product.sku} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-medium text-[var(--ink)]">{r.product.name}</span>
                      <span className="ml-2 font-mono text-[10px] text-[var(--muted)]">{r.product.sku}</span>
                    </td>
                    {STORES.map((s) => {
                      const q = STOCK[r.product.sku][s.id];
                      const low = q <= REORDER_POINT;
                      return (
                        <td key={s.id} className="px-2 py-3 text-center">
                          <span
                            className={cx(
                              'font-mono tabular-nums',
                              low ? 'bg-[var(--warn-bg)] px-1.5 py-0.5 text-[var(--warn)]' : 'text-[var(--muted)]'
                            )}
                          >
                            {q}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-3 text-right font-mono tabular-nums text-[var(--ink)]">{r.total}</td>
                    <td className="px-5 py-3 text-right">
                      {r.lowAt.length === 0 ? (
                        <span className="text-[11px] text-[var(--muted)]">—</span>
                      ) : isOrdered ? (
                        <StatusTag tone="ok">PO raised · {r.lowAt.map((s) => s.id).join(', ')}</StatusTag>
                      ) : (
                        <button
                          onClick={() => raisePo(r.product.sku)}
                          className="inline-flex items-center gap-1.5 bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                        >
                          <ArrowLeftRight size={11} /> Raise PO · {r.lowAt.map((s) => s.id).join(', ')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ── Terminals tab ─────────────────────────────────────────────────────────────────

const TERM_META: Record<Terminal['status'], { Icon: typeof Wifi; tone: Tone; label: string }> = {
  online:  { Icon: Wifi,      tone: 'ok',      label: 'Online' },
  syncing: { Icon: RefreshCw, tone: 'accent',  label: 'Syncing' },
  offline: { Icon: WifiOff,   tone: 'danger',  label: 'Offline' },
};

function TerminalsTab() {
  const offline = TERMINALS.filter((t) => t.status === 'offline');
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        <Stat label="Terminals" value={String(TERMINALS.length)} sub="fleet-wide" />
        <Stat label="Online" value={String(TERMINALS_ONLINE)} sub="reporting" tone="ok" />
        <Stat
          label="Offline"
          value={String(offline.length)}
          sub={offline.length ? 'investigate' : 'clear'}
          tone={offline.length ? 'danger' : 'ok'}
        />
        <Stat label="Current build" value="v4.2.1" sub="target version" />
      </div>

      {offline.length > 0 && (
        <div className="flex items-start gap-3 border border-[var(--danger)] bg-[var(--danger-bg)] px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--danger)]">
              {offline.length} terminal{offline.length > 1 ? 's' : ''} offline
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {offline.map((t) => t.id).join(', ')} stopped reporting — last sale{' '}
              {Math.min(...offline.map((t) => t.lastTxnMin))}+ min ago. Check the store's network uplink and
              the terminal's offline-queue depth before reconnecting.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TERMINALS.map((t) => {
          const m = TERM_META[t.status];
          return (
            <Panel key={t.id} bodyClassName="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-[var(--muted)]" />
                  <span className="font-mono text-sm text-[var(--ink)]">{t.id}</span>
                </div>
                <StatusTag tone={m.tone} dot={false}>
                  <m.Icon size={11} className={t.status === 'syncing' ? 'animate-spin' : ''} /> {m.label}
                </StatusTag>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">{t.store.name} · {t.store.city}</p>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
                <span>POS v{t.version}</span>
                <span>last sale {t.lastTxnMin === 0 ? 'just now' : `${t.lastTxnMin}m ago`}</span>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'pos' | 'inventory' | 'terminals';

const TABS: TabDef<Tab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'pos', label: 'POS register' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'terminals', label: 'Terminals', count: TERMINALS.length - TERMINALS_ONLINE || undefined },
];

export default function RetailPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <DemoShell title="Retail Operations Console" wordmark="POS" revealKey={tab}>
      <Masthead
        eyebrow="Retail operations · Botswana"
        live="Interactive register"
        title="One console for every till, every store."
        lede="A store-operations console for a multi-branch retailer: ring up a live basket with VAT and change, watch the day's revenue build hour by hour, hold perpetual inventory across branches with purchase-order replenishment, and keep the POS terminal fleet healthy."
        facts={[
          { label: 'Scope', value: `${STORES.length} stores · ${PRODUCTS.length} SKUs` },
          { label: 'Register', value: 'Live POS · 14% VAT' },
          { label: 'Currency', value: 'Botswana Pula' },
          { label: 'Reference', value: 'Odoo POS (UX only)' },
        ]}
      />

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      <div className="pt-10">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'pos' && <PosRegister />}
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'terminals' && <TerminalsTab />}
      </div>

      <p className="mt-12 flex items-center gap-2 border-t border-[var(--border)] pt-6 text-[11px] leading-relaxed text-[var(--muted)]">
        <TrendingUp size={13} className="shrink-0 text-[var(--accent)]" />
        Seeded, reproducible data. Multi-store POS, perpetual inventory, replenishment and terminal health —
        UX patterns studied from Odoo POS &amp; Inventory; all logic, data and UI are original.
      </p>
    </DemoShell>
  );
}
