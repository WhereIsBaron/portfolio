# Demo coverage — CRM & ERP vs the source systems

Honest map of how far the in-app **CRM** (`/crm`) and **ERP** (`/erp`) demos go
against the real systems they're modelled on (EspoCRM + ERPNext CRM, and
ERPNext). The goal was never to clone those systems — it was to capture the
**architectural spine** (the flows that prove the concepts are understood).
This file records what's in, what's deliberately out, and the best next steps,
so we don't re-derive it each session.

_Last updated: 2026-09-08._

---

## Guiding principle

Reproduce the **80/20 that reads as credible engineering** — ledger integrity,
cascading documents, perpetual inventory, SLA logic, weighted forecasting —
not the long tail of doctypes. Chasing "everything" would mean reimplementing
an ERP and would dilute the demo. Both demos are client-side, seeded
(mulberry32) with some real data pulled from public APIs (DummyJSON products,
randomuser.me people, DiceBear avatars); in-memory state resets on reload.

---

## ERP (`/erp`) — modelled on ERPNext

### Captured (the backbone)
- **Live double-entry general ledger** — every action posts balanced entries;
  P&L, balance sheet and chart of accounts are **derived** from the ledger +
  opening balances (not seeded). Balance sheet stays in balance via a
  retained-earnings plug. (`accountBalances` in `src/data/erpSeed.ts`.)
- **Order-to-cash chain with VAT** — Sales Order → Delivery Note → Tax Invoice
  → Payment Entry. Output VAT (15%) splits AR into net revenue + VAT Payable.
- **Procure-to-pay chain with VAT** — Purchase Order → Receipt → Bill → Payment,
  using a "Stock Received Not Billed" clearing account; input VAT reclaims
  against VAT Payable.
- **Perpetual stock ledger** — every delivery/receipt/manufacture posts valued
  movements; per-item running balance; Inventory has an Items / Stock-ledger
  sub-view.
- **Manufacturing** — BOM **+ routing** (workstation operations w/ hourly
  rates). Producing a batch consumes components, applies labour/overhead, and
  values the finished good at **material + operating cost**, posting a balanced
  Manufacture entry (Dr FG Inventory / Cr raw Inventory / Cr Manufacturing
  Overhead Applied).
- **Payroll run** — one salary slip per active employee (gross → PAYE 18% + UIF
  1% → net), posted as Dr Salaries / Cr Bank / Cr Payroll Payable.
- Quotation → Sales Order, Material Request → Purchase Order (low-stock raised).
- HR, Projects, Assets (with straight-line depreciation), Inventory +
  warehouses, Reports, Dashboard.

### Deliberately NOT built (real ERPNext depth we skipped)
- Multi-currency
- Tax **templates** (beyond a flat 15% VAT), item/customer tax categories
- Pricing rules / discounts / price lists
- Batch / serial / lot tracking
- Actual inter-warehouse **transfer** entries (warehouses exist but stock isn't
  moved between them)
- Subcontracting
- Production Plan + capacity planning / job-card scheduling
- Quality inspection
- Bank reconciliation
- Budgets / cost centers / dimensions
- Credit notes & sales/purchase **returns**
- Partial-payment reconciliation (payments are full-amount only)
- HR depth: leave, attendance, expense claims, timesheets
- Fixed-asset depreciation **posting to the GL** (depreciation is display-only)

---

## CRM (`/crm`) — modelled on EspoCRM + ERPNext CRM

### Captured
- **Lead → one-click conversion** (lead becomes contact + company + opportunity)
- **Deal pipeline** with **weighted forecast** (committed + Σ open×stage-prob,
  best case, win rate), lost-reason + competitor tracking
- **Cases + SLA board** — response & resolution targets by priority, live
  Met / On track / Due soon / Breached states with countdowns
- Per-contact **activity timeline** (ContactDrawer)
- Campaigns with open/click **funnels**
- Contacts, companies, tasks, calendar, email inbox + templates, invoicing,
  automations, reports, settings, dashboard

### Deliberately NOT built (real system depth we skipped)
- Real email **send** / IMAP sync (inbox is simulated)
- An **executing** workflow/automation builder (automations are illustrative)
- Role-based access control / permissions
- Customer/self-service portal
- Telephony / call logging
- Knowledge base

---

## Best next additions (highest interview signal, if we revisit)

Ranked by payoff relative to effort:
1. **Credit notes / sales returns** (ERP) — completes the order-to-cash story
   and exercises reverse GL + stock postings.
2. **Pricing rules & discounts** (ERP) — visible, realistic, touches invoicing.
3. **An executing automation rule** (CRM) — e.g. "stage = Won → create invoice
   task", proving the workflow concept actually runs.
4. Partial-payment reconciliation (ERP) — makes AR/AP feel real.

Not planned unless asked: multi-currency, batch/serial, subcontracting,
portal, telephony — high effort, low demo payoff.

---

## Key files
- ERP data/logic: `src/data/erpSeed.ts`, `src/pages/ErpPage.tsx`
- CRM data/logic: `src/data/crmSeed.ts`, `src/pages/CrmPage.tsx`
- Project card copy: `src/data/cv.ts`
- Chatbot site knowledge: `netlify/functions/chat.ts`
