import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Circle, ChevronRight, ChevronDown, ChevronUp,
  FlaskConical, ShieldCheck, Users, Package, TrendingUp, ClipboardList,
  AlertTriangle, XCircle, Info, Calculator, BookOpen, Award, Zap, X,
} from 'lucide-react';
import {
  DemoShell, Masthead, TabNav, Meter, AccentButton, GhostButton,
  fieldLabel, cx, type TabDef,
} from '@/components/demo/kit';

/* ─────────────────────────────────────────────────────────────────────────
   Operations / Production Supervisor Training — /production — Andrew.OPS

   An interactive onboarding programme for a chemical-plant production
   supervisor: six lessons (daily management, QC, safety, leadership,
   inventory, continuous improvement) with scenario decisions, an inline
   glossary, and a live OEE calculator. Progress persists in localStorage.
   Rebuilt on the homepage "Stone & blueprint" editorial theme via the
   shared demo kit; all lesson content and logic are original.
   ──────────────────────────────────────────────────────────────────────── */

type ModuleId = 'production' | 'quality' | 'safety' | 'leadership' | 'inventory' | 'improvement';

interface GlossaryEntry { term: string; definition: string; example?: string; }
interface ScenarioChoice { label: string; correct: boolean; feedback: string; }
interface Scenario { situation: string; question: string; choices: ScenarioChoice[]; }

/* ─── Glossary (shown in modal on term click) ───────────────────────────── */
const GLOSSARY: Record<string, GlossaryEntry> = {
  OEE: {
    term: 'OEE — Overall Equipment Effectiveness',
    definition: 'The gold-standard KPI for manufacturing productivity. It measures how efficiently a production line uses its planned time. OEE = Availability × Performance × Quality. A score of 100% means producing only good product, as fast as possible, with no downtime.',
    example: 'A line running 92% of planned time, at 95% of max speed, producing 99% good product = 86.5% OEE (world-class is >85%).',
  },
  PPE: {
    term: 'PPE — Personal Protective Equipment',
    definition: 'Any equipment worn by a worker to minimise exposure to hazards — chemical, physical, or biological. PPE is the LAST line of defence (after engineering controls and procedures). Wearing it correctly is non-negotiable in a chemical plant.',
    example: 'Nitrile gloves + safety goggles + chemical apron required before handling caustic soda (NaOH).',
  },
  GHS: {
    term: 'GHS — Globally Harmonized System of Classification and Labelling of Chemicals',
    definition: 'The international standard for communicating chemical hazards. GHS uses 9 standardised pictograms (red diamond border, white background) on every chemical label and Safety Data Sheet. The same symbol means the same hazard worldwide.',
    example: 'GHS05 (corrosive symbol) on a drum tells any worker, in any country, that the chemical attacks skin and metal.',
  },
  SDS: {
    term: 'SDS — Safety Data Sheet (formerly MSDS)',
    definition: 'A 16-section document required for every hazardous chemical on site. It tells you what the chemical is, its hazards, safe handling & storage conditions, PPE required, what to do in an emergency, and how to dispose of it. Must be accessible to all workers at all times.',
    example: 'If an operator is splashed with an unknown chemical, Section 4 of its SDS tells you exactly what first aid to give.',
  },
  PTW: {
    term: 'PTW — Permit to Work',
    definition: 'A formal written authorisation for hazardous non-routine work. Before any PTW-required task begins, the supervisor assesses the risk, specifies controls, issues the permit, and signs it. Work must stop immediately if the permit expires or conditions change.',
    example: 'Changing a caustic soda drum requires a PTW specifying: full face shield, acid-resistant apron, gloves, spill kit nearby, second person present.',
  },
  LTI: {
    term: 'LTI — Lost Time Injury',
    definition: 'A work-related injury or illness that causes the worker to miss their next scheduled shift or beyond. The LTI count resets to zero after each incident. "Days since last LTI" is one of the most visible safety culture indicators in any plant.',
    example: 'If a worker burns their hand with a chemical on Monday and cannot work Tuesday, that is an LTI. A minor cut treated with a bandage and no missed work is a First Aid Case, not an LTI.',
  },
  CFU: {
    term: 'CFU/mL — Colony Forming Units per Millilitre',
    definition: 'A measurement of microbial (bacterial/fungal) contamination in a liquid product. One CFU represents one microorganism that can grow into a visible colony on a lab plate. Lower is always safer for personal-care and antibacterial products.',
    example: 'Cosmetic regulations: <100 CFU/mL. Antibacterial hand soap: <10 CFU/mL. A sanitizer failing this test poses a public health risk.',
  },
  FPY: {
    term: 'FPY — First-Pass Yield',
    definition: 'The percentage of batches (or units) that pass quality control on the very first test, without any rework or re-testing. It is a direct measure of process stability and operator skill. High rework is expensive: it ties up equipment, wastes materials, and delays delivery.',
    example: 'If 18 of 20 batches this month passed QC first time, FPY = 90%. A world-class chemical plant targets >95%.',
  },
  CoA: {
    term: 'CoA — Certificate of Analysis',
    definition: 'A document supplied by a raw material supplier confirming that a specific lot of material meets agreed specifications. It lists test results (purity, pH, density, appearance) against the required spec. NEVER use a raw material without a CoA — if the supplier cannot provide one, reject the delivery.',
    example: 'A CoA for SLS (Sodium Lauryl Sulfate) shows: purity 97.2% (spec: >95%), pH 7.1 (spec: 6.5–8.0), lot number SLS-2026-0344.',
  },
  Kaizen: {
    term: 'Kaizen — Continuous Improvement',
    definition: 'A Japanese philosophy meaning "change for better." In manufacturing it means every person, every day, looks for small improvements to how work is done. Kaizen improvements are typically low-cost, fast to implement, and owned by the people doing the work — not management.',
    example: 'An operator notices the quality check form requires walking to a separate room to find a pen. Kaizen fix: attach a pen to each QC station. Saves 2 minutes per batch, 12 minutes per shift.',
  },
};

/* Inline glossary-term button. */
function Term({ id, children, open }: { id: string; children: React.ReactNode; open: (id: string) => void }) {
  return (
    <button
      onClick={() => open(id)}
      className="inline-flex items-center gap-1 border border-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 align-baseline font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
    >
      {children} <Info size={9} />
    </button>
  );
}

/* ─── Reusable blocks ─────────────────────────────────────────────────── */

function Lede({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="mb-2 font-display text-lg font-medium leading-tight text-[var(--ink)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{children}</p>
    </div>
  );
}

function PanelBox({ label, icon, children, className }: { label: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('border border-[var(--border)] bg-[var(--surface)]', className)}>
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
        {icon && <span className="text-[var(--accent)]">{icon}</span>}
        <p className={fieldLabel}>{label}</p>
      </div>
      {children}
    </div>
  );
}

function ScenarioBlock({ scenario }: { scenario: Scenario }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const result = chosen !== null ? scenario.choices[chosen] : null;
  return (
    <div className="border border-[var(--warn)] bg-[var(--warn-bg)] p-5">
      <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--warn)]">
        <Zap size={12} /> Scenario — what would you do?
      </p>
      <p className="mb-3 text-sm font-medium text-[var(--ink)]">{scenario.situation}</p>
      <p className="mb-3 text-xs text-[var(--muted)]">{scenario.question}</p>
      <div className="space-y-2">
        {scenario.choices.map((c, i) => {
          const isChosen = chosen === i;
          const cls = !isChosen
            ? 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]'
            : c.correct
              ? 'border-[var(--ok)] bg-[var(--ok-bg)]'
              : 'border-[var(--danger)] bg-[var(--danger-bg)]';
          const txt = isChosen ? (c.correct ? 'text-[var(--ok)]' : 'text-[var(--danger)]') : 'text-[var(--ink)]';
          return (
            <button
              key={i}
              onClick={() => setChosen(i)}
              disabled={chosen !== null}
              className={cx('w-full border px-4 py-3 text-left text-xs transition-colors', cls, chosen === null ? 'cursor-pointer' : 'cursor-default')}
            >
              <span className={cx('font-semibold', txt)}>{String.fromCharCode(65 + i)}. {c.label}</span>
            </button>
          );
        })}
      </div>
      {result && (
        <div className={cx('mt-4 border p-4 text-xs leading-relaxed',
          result.correct ? 'border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok)]' : 'border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)]')}>
          {result.correct ? <CheckCircle2 size={14} className="mb-1 inline" /> : <XCircle size={14} className="mb-1 inline" />}
          {' '}<strong>{result.correct ? 'Correct. ' : 'Not quite. '}</strong>{result.feedback}
        </div>
      )}
    </div>
  );
}

function ConceptCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[var(--bg-soft)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-[var(--ink)]">{title}</span>
        {open ? <ChevronUp size={15} className="text-[var(--muted)]" /> : <ChevronDown size={15} className="text-[var(--muted)]" />}
      </button>
      {open && <div className="space-y-2 border-t border-[var(--border)] px-4 pb-4 pt-3 text-xs leading-relaxed text-[var(--muted)]">{children}</div>}
    </div>
  );
}

/* ─── Module: Daily Production Management ───────────────────────────────── */
function ModuleProduction() {
  return (
    <div className="space-y-5">
      <Lede title="What does a Production Supervisor actually do all day?">
        Your job is to ensure the right products are made to the right quality, on time, safely, every shift. You are the link between the production plan on paper and the reality on the factory floor. You don't make the product — you create the conditions where your operators can make it well, consistently, and safely.
      </Lede>

      <PanelBox label="The Supervisor's Daily Routine">
        <div className="divide-y divide-[var(--border)]">
          {[
            { time: '–30 min', action: 'Arrive early. Read the outgoing supervisor\'s handover notes before you take over. Know the status of every batch, any equipment issues, any open safety actions, and any personnel matters. Never walk into a shift blind.' },
            { time: 'Shift start', action: 'Run a 5-minute shift briefing with ALL operators: safety topic of the day, production targets, any schedule changes, any new procedures. This sets the tone. Energy in this briefing determines the shift\'s culture.' },
            { time: 'First hour', action: 'Walk every line. Talk to each operator. Check PPE compliance, housekeeping, batch progress, machine status. You\'re not inspecting — you\'re building relationships and catching problems before they escalate.' },
            { time: 'Ongoing', action: 'Monitor production rate vs. plan every hour. If output falls >10% behind plan, investigate immediately — don\'t wait for the end of shift to discover a problem.' },
            { time: 'Mid-shift', action: 'Review all QC results. Sign off on batch releases or place holds. Escalate any out-of-spec results to quality manager within 30 minutes of receiving the lab result.' },
            { time: 'Last 30 min', action: 'Prepare your handover: batch statuses, any holds, open safety actions, pending maintenance, materials that need ordering. Write it down. Verbal handover is not enough.' },
          ].map((item) => (
            <div key={item.time} className="flex gap-4 px-5 py-3">
              <span className="w-20 shrink-0 pt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{item.time}</span>
              <p className="text-xs leading-relaxed text-[var(--muted)]">{item.action}</p>
            </div>
          ))}
        </div>
      </PanelBox>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConceptCard icon={<ClipboardList size={18} />} title="Reading the Production Schedule">
          <p>Every shift you receive a production schedule: which products to make, how much, on which line, by when. Your job is to execute it and flag conflicts early.</p>
          <p className="mt-2">Key questions to ask before the shift:</p>
          <ul className="ml-3 mt-1 list-disc space-y-1">
            <li>Do we have enough raw materials for every batch?</li>
            <li>Is all equipment in working order (no outstanding maintenance)?</li>
            <li>Are we fully staffed, or do I need to redeploy operators between lines?</li>
            <li>Are there any batches from the previous shift still in QC or on hold?</li>
          </ul>
        </ConceptCard>
        <ConceptCard icon={<TrendingUp size={18} />} title="Monitoring Production Rate">
          <p>Production rate = volume (or units) produced per hour. You track this against the plan.</p>
          <p className="mt-2 font-semibold text-[var(--warn)]">Rule of thumb: if you're behind plan by end of hour 2, the shift will not recover without intervention.</p>
          <p className="mt-2">When you're behind: identify the constraint (machine, material, or person), fix or escalate it, communicate the revised forecast to your manager. Don't hide bad news — it only gets worse.</p>
        </ConceptCard>
        <ConceptCard icon={<AlertTriangle size={18} />} title="Escalation — When and Who">
          <p>Supervisors escalate to the Production Manager when:</p>
          <ul className="ml-3 mt-1 list-disc space-y-1">
            <li>A batch will miss its delivery commitment</li>
            <li>Equipment failure cannot be resolved within 30 minutes</li>
            <li>Any safety incident (near-miss or actual)</li>
            <li>A batch fails QC and you're unsure how to proceed</li>
            <li>A raw material shortage threatens the next shift's schedule</li>
          </ul>
          <p className="mt-2 text-[var(--warn)]">Never escalate a problem without also bringing your proposed solution.</p>
        </ConceptCard>
        <ConceptCard icon={<Users size={18} />} title="Staffing & Redeployment">
          <p>Operators call in sick. Equipment breaks down. Your job is to keep production moving with what you have.</p>
          <p className="mt-2">Strategies: Cross-train your best operators on multiple lines so they can cover. Know which batches are highest priority for delivery. Know which line can tolerate running at reduced capacity without affecting customer orders.</p>
        </ConceptCard>
      </div>

      <ScenarioBlock scenario={{
        situation: "It is 09:00, two hours into your day shift. Line B is producing Vehicle Wash Concentrate at 160 L/hr — the plan is 220 L/hr. The operator says 'it's always a bit slow at the start.' The batch is due for QC at 11:00.",
        question: "What do you do right now?",
        choices: [
          { label: "Accept the operator's explanation — it will probably pick up.", correct: false, feedback: "A 27% shortfall at hour 2 will not recover on its own. Accepting this without investigation means you'll miss the target and discover it too late to act." },
          { label: "Investigate the constraint now: check the mixing speed, temperature, raw material feed rate, and ask the operator what changed since last shift.", correct: true, feedback: "Correct. Identify the bottleneck (mechanical, material, or method), fix what you can, escalate what you can't, and update the plan. You still have time to recover or reschedule." },
          { label: "Stop Line B and reassign the operator to Line A which is running fine.", correct: false, feedback: "This abandons a batch mid-process, risks product quality, and creates waste. Always investigate first before stopping production." },
        ],
      }} />
    </div>
  );
}

/* ─── Module: Quality Control ───────────────────────────────────────────── */
function ModuleQuality({ openGlossary }: { openGlossary: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="mb-2 font-display text-lg font-medium leading-tight text-[var(--ink)]">Quality is YOUR responsibility — not just the lab's</h3>
        <p className="text-sm leading-relaxed text-[var(--muted)]">Many supervisors think quality is the quality department's job. Wrong. The supervisor signs the batch release. The lab tests parameters — but you decide what to do with the results. You are accountable for every litre that leaves your line. A batch that slips through out-of-spec is a customer complaint, a recall risk, or a regulatory violation with your name on it.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Term id="FPY" open={openGlossary}>First-Pass Yield</Term>
          <Term id="CFU" open={openGlossary}>CFU/mL</Term>
        </div>
      </div>

      <PanelBox label="QC Parameters — What They Mean & Why They Matter">
        <div className="divide-y divide-[var(--border)]">
          {[
            { param: 'pH Level', range: '0–14 scale', what: 'Measures acidity/alkalinity of the product. pH 7 = neutral. Below 7 = acidic. Above 7 = alkaline (basic).', why: 'Wrong pH means the product won\'t work and may be hazardous. A degreaser too low in pH becomes corrosive to skin. A hand soap too high in pH strips natural skin oils and causes irritation. pH is often the first indicator that something went wrong in formulation.' },
            { param: 'Viscosity', range: 'Measured in cP (centipoise)', what: 'Resistance to flow. Water = 1 cP. Honey ≈ 10,000 cP. Your product has a target viscosity for pourability and feel.', why: 'Too thin: product runs off surfaces immediately (cleaning products won\'t dwell long enough to work). Too thick: product is hard to dispense, pumps struggle, fill lines jam. Both are customer complaints.' },
            { param: 'Active Ingredient %', range: 'Product-specific spec', what: 'The concentration of the chemical that actually does the cleaning, degreasing, sanitizing, or foaming.', why: 'Too low = product is ineffective (customer complaint). Too high = product is over-concentrated, increases cost, and may be hazardous or damage surfaces. Regulatory compliance for sanitizers and biocides has legal minimum concentrations.' },
            { param: 'CFU/mL', range: '<100 (cosmetics), <10 (sanitizers)', what: 'Colony Forming Units per millilitre — a count of live bacteria or fungi in the product.', why: 'Contaminated product poses direct public health risk. For antibacterial soaps and sanitizers, it\'s a regulatory breach. Caused by: contaminated water, dirty equipment, incorrect preservative level, or cross-contamination between products. NEVER release a product that fails microbial spec.' },
            { param: 'Density / Specific Gravity', range: 'g/mL, product-specific', what: 'Mass per unit volume. A simple, fast measurement that acts as a fingerprint for the formulation.', why: 'If density is wrong, the formulation is wrong — something was left out, added too much, or the wrong raw material was used. Density is a cheap, quick early-warning check before the full lab panel is ready.' },
            { param: 'Colour & Appearance', range: 'Visual standard', what: 'Compared against a reference standard (a reference bottle or Pantone card). Also includes clarity, haze, and separation check.', why: 'A customer sees the colour before they see any spec. Colour variation between batches = quality inconsistency. Haze or separation = formulation instability (the product may separate on the shelf). Never underestimate visual QC.' },
          ].map((row) => (
            <div key={row.param} className="grid gap-2 px-5 py-4 sm:grid-cols-[140px_1fr_1fr]">
              <div>
                <p className="text-xs font-bold text-[var(--ink)]">{row.param}</p>
                <p className="font-mono text-[10px] text-[var(--muted)]">{row.range}</p>
              </div>
              <div>
                <p className={cx('mb-0.5', fieldLabel)}>What it is</p>
                <p className="text-xs text-[var(--muted)]">{row.what}</p>
              </div>
              <div>
                <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--warn)]">Why it matters</p>
                <p className="text-xs text-[var(--muted)]">{row.why}</p>
              </div>
            </div>
          ))}
        </div>
      </PanelBox>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { status: 'Approved', tone: 'ok' as const, icon: <CheckCircle2 size={16} />, desc: 'All parameters within spec. Batch released for bottling/packaging. Supervisor signs batch record. Document the lot numbers of every raw material used.' },
          { status: 'Hold', tone: 'warn' as const, icon: <AlertTriangle size={16} />, desc: 'One or more parameters out of spec. Batch is quarantined — it cannot move or be used until resolved. Investigate root cause, rework if possible, re-test before re-submitting to QC.' },
          { status: 'Reject', tone: 'danger' as const, icon: <XCircle size={16} />, desc: 'Batch cannot be reworked to spec (e.g. microbial failure, wrong active ingredient, chemical incompatibility). Batch is destroyed or returned to raw material. Document everything — this data drives process improvement.' },
        ].map((item) => (
          <div key={item.status} className="border p-4" style={{ borderColor: `var(--${item.tone})`, background: `var(--${item.tone}-bg)` }}>
            <div className="mb-2 flex items-center gap-2" style={{ color: `var(--${item.tone})` }}>{item.icon}<span className="text-sm font-bold">{item.status}</span></div>
            <p className="text-xs leading-relaxed text-[var(--muted)]">{item.desc}</p>
          </div>
        ))}
      </div>

      <ScenarioBlock scenario={{
        situation: "A batch of Surface Sanitizer comes back from the lab: Ethanol content 68% (spec: 70–80%). pH 6.9 (spec: 6.0–7.5) — pass. All other parameters pass. The batch is needed for a delivery leaving at 14:00 today.",
        question: "What is the correct action?",
        choices: [
          { label: "Release the batch — it's only 2% below spec and the delivery is urgent.", correct: false, feedback: "Never release out-of-spec product. A surface sanitizer at 68% ethanol has reduced antimicrobial efficacy. Releasing it is a regulatory violation and a public health risk. Urgency never overrides spec." },
          { label: "Place the batch on HOLD, authorise an ethanol top-up to bring it to 72%, then re-test before release.", correct: true, feedback: "Correct. This is a reworkable failure — a calculated top-up of pure ethanol can bring it into spec. Document the rework, re-test the full panel, and only release once it passes. Inform logistics of the delay." },
          { label: "Place the batch on HOLD and reject it immediately.", correct: false, feedback: "Rejection is not necessary here — the batch is reworkable. Immediate rejection wastes product and cost when a controlled rework is viable. Rejection is reserved for batches that cannot be brought into spec." },
        ],
      }} />
    </div>
  );
}

/* ─── Module: Safety ─────────────────────────────────────────────────────── */
function ModuleSafety({ openGlossary }: { openGlossary: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="border border-[var(--danger)] bg-[var(--danger-bg)] p-5">
        <h3 className="mb-2 font-display text-lg font-medium leading-tight text-[var(--ink)]">Safety is a culture — not a checklist</h3>
        <p className="text-sm leading-relaxed text-[var(--muted)]">A chemical plant where people follow safety rules only when the supervisor is watching is one incident away from a serious injury. Your job is to build an environment where operators follow procedures because they understand why — not because they fear a write-up. That means explaining the reason behind every rule, leading by example, and responding to near-misses with curiosity, not blame.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['PPE', 'GHS', 'SDS', 'PTW', 'LTI'] as const).map((id) => (
            <Term key={id} id={id} open={openGlossary}>{id}</Term>
          ))}
        </div>
      </div>

      {/* PPE */}
      <PanelBox label="PPE — Personal Protective Equipment" icon={<ShieldCheck size={14} />}>
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {[
            { item: 'Safety Goggles / Face Shield', icon: '🥽', hazard: 'Chemical splash to eyes', detail: 'Required ANY time you handle liquids that are not plain water. Chemical burns to the cornea can cause permanent blindness within seconds. A face shield covers the full face and is required when handling corrosives (acids, alkalis) or pressurised liquids.' },
            { item: 'Nitrile Gloves', icon: '🧤', hazard: 'Skin contact & absorption', detail: 'Nitrile resists a broad range of chemicals including detergents, oils, and mild acids/alkalis. Latex is unsuitable (allergy risk). Cut-resistant gloves are for mechanical hazards. Check gloves for holes before each use — a pinhole in a glove handling NaOH can cause a serious burn.' },
            { item: 'Chemical-Resistant Apron', icon: '🦺', hazard: 'Body splashes & drips', detail: 'Covers torso and upper legs. Required for drum handling, bulk transfer, and any task where large-volume spills are possible. Fabric aprons are useless against corrosives — always use PVC or rubber-coated aprons in chemical areas.' },
            { item: 'Safety Boots (Steel Toe)', icon: '🥾', hazard: 'Dropped containers, chemical floor spills', detail: 'Steel or composite toe cap protects against heavy drums falling on feet (a 25 L drum of NaOH weighs ~30 kg). Chemical-resistant soles prevent slipping on spills. Never wear open shoes in a production environment.' },
            { item: 'Hard Hat', icon: '⛑️', hazard: 'Falling objects from above', detail: 'Required in areas where overhead work occurs (maintenance on elevated equipment, racking areas). Also protects against hitting your head on low-hanging pipes and structures. Check for cracks — a hard hat with a crack provides zero protection.' },
            { item: 'Respirator / Dust Mask', icon: '😷', hazard: 'Vapours, dusts & fumes', detail: 'A basic dust mask (FFP2) is for powders (citric acid, SLS powder). A half-face respirator with chemical cartridges is required for volatile solvents (ethanol, fragrances in high concentration, aerosol generation). Match the cartridge type to the specific chemical — read the SDS Section 8.' },
          ].map((ppe) => (
            <div key={ppe.item} className="bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">{ppe.icon}</span>
                <span className="text-xs font-bold text-[var(--ink)]">{ppe.item}</span>
              </div>
              <p className="mb-1.5 inline-flex bg-[var(--warn-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warn)]">Protects against: {ppe.hazard}</p>
              <p className="text-xs leading-relaxed text-[var(--muted)]">{ppe.detail}</p>
            </div>
          ))}
        </div>
      </PanelBox>

      {/* GHS */}
      <PanelBox label="GHS — The 9 Hazard Pictograms">
        <div className="border-b border-[var(--border)] px-5 py-2 text-[10px] text-[var(--muted)]">These appear on every chemical label worldwide. As a supervisor you must recognise all 9 instantly.</div>
        <div className="grid grid-cols-3 gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-5">
          {[
            { code: 'GHS01', symbol: '💥', name: 'Explosive', desc: 'Can explode from heat, shock, or friction. Detonators, certain organic peroxides.' },
            { code: 'GHS02', symbol: '🔥', name: 'Flammable', desc: 'Catches fire easily. Ethanol, acetone, fragrances, aerosols. Keep away from ignition sources.' },
            { code: 'GHS03', symbol: '⭕', name: 'Oxidising', desc: 'Provides oxygen to other burning materials — makes fires worse. Hydrogen peroxide, bleach.' },
            { code: 'GHS04', symbol: '🛢️', name: 'Compressed Gas', desc: 'Container under pressure. Can explode if heated or damaged. CO₂ cylinders, aerosol cans.' },
            { code: 'GHS05', symbol: '🔴', name: 'Corrosive', desc: 'Destroys skin, eyes, and metal on contact. Caustic soda (NaOH), hydrochloric acid. Full PPE always.' },
            { code: 'GHS06', symbol: '☠️', name: 'Acute Toxicity', desc: 'Can cause death or serious injury from a single exposure. Skull & crossbones. Treat as life-threatening.' },
            { code: 'GHS07', symbol: '⚠️', name: 'Irritant / Harmful', desc: 'Causes skin/eye irritation or mild health effects. SLS, citric acid. Use basic PPE.' },
            { code: 'GHS08', symbol: '🫁', name: 'Health Hazard', desc: 'Serious long-term health effects: carcinogen, reproductive toxin, respiratory sensitiser. Read SDS carefully.' },
            { code: 'GHS09', symbol: '🌿', name: 'Environmental', desc: 'Harmful to aquatic life or the environment. Never pour down drains. Follow disposal SOP.' },
          ].map((g) => (
            <div key={g.code} className="bg-[var(--surface)] p-3 text-center">
              <div className="mb-1 text-2xl">{g.symbol}</div>
              <p className="font-mono text-[10px] text-[var(--accent)]">{g.code}</p>
              <p className="text-xs font-bold text-[var(--ink)]">{g.name}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">{g.desc}</p>
            </div>
          ))}
        </div>
      </PanelBox>

      {/* SDS + PTW + LTI */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ConceptCard icon={<BookOpen size={18} />} title="SDS — Safety Data Sheet">
          <p>Required for every chemical on site. 16 sections. The 5 you must know cold:</p>
          <ul className="ml-3 mt-2 list-disc space-y-1.5">
            <li><strong className="text-[var(--ink)]">Section 2</strong> — Hazard identification (the GHS codes)</li>
            <li><strong className="text-[var(--ink)]">Section 4</strong> — First aid measures (what to do if someone is exposed)</li>
            <li><strong className="text-[var(--ink)]">Section 7</strong> — Handling & storage conditions</li>
            <li><strong className="text-[var(--ink)]">Section 8</strong> — PPE required (exactly which gloves, respirator type, etc.)</li>
            <li><strong className="text-[var(--ink)]">Section 13</strong> — Disposal (how to legally dispose of waste)</li>
          </ul>
          <p className="mt-2 text-[var(--warn)]">SDS must be physically accessible to operators at all times — not just in a locked office.</p>
        </ConceptCard>
        <ConceptCard icon={<ClipboardList size={18} />} title="PTW — Permit to Work">
          <p>A signed document authorising hazardous non-routine work. The supervisor is responsible for issuing AND closing PTWs.</p>
          <p className="mt-2 font-semibold text-[var(--ink)]">When is a PTW required?</p>
          <ul className="ml-3 mt-1 list-disc space-y-1">
            <li>Confined space entry (tanks, vessels, pits)</li>
            <li>Hot work (welding, grinding near flammables)</li>
            <li>Bulk chemical transfer / drum changes</li>
            <li>Electrical maintenance on live panels</li>
            <li>Working at height (&gt;2 metres)</li>
          </ul>
          <p className="mt-2 font-semibold text-[var(--danger)]">If a PTW expires while work is in progress, work must STOP until a new PTW is issued.</p>
        </ConceptCard>
        <ConceptCard icon={<Award size={18} />} title="LTI & Near-Miss Culture">
          <p><strong className="text-[var(--ink)]">LTI (Lost Time Injury)</strong> = a work injury causing the worker to miss their next scheduled shift. The "days since last LTI" counter is a visible symbol of safety culture.</p>
          <p className="mt-2"><strong className="text-[var(--ink)]">Near-miss</strong> = an event that could have caused injury but didn't. Near-misses are gold — they reveal hazards before anyone gets hurt.</p>
          <p className="mt-2 text-[var(--warn)]">Rule: never punish near-miss reporters. Every reported near-miss prevented a future LTI. Build a culture where reporting is rewarded, not blamed.</p>
          <p className="mt-2">Heinrich's Triangle: for every 1 fatal accident, there are ~30 LTIs, ~300 near-misses. Eliminating near-misses eliminates fatalities.</p>
        </ConceptCard>
      </div>

      <ScenarioBlock scenario={{
        situation: "You walk into the chemical storage area and find an operator handling a 25 L drum of caustic soda (NaOH — GHS05 Corrosive). He is wearing nitrile gloves but NO safety goggles. He says 'I'll be done in two minutes, it's fine.'",
        question: "What do you do?",
        choices: [
          { label: "Let him finish — stopping him mid-task might cause a spill which is more dangerous.", correct: false, feedback: "Wrong. Caustic soda can blind someone in under 10 seconds on eye contact. No task justifies working without required PPE. Stopping is always the right call." },
          { label: "Stop work immediately, calmly instruct him to step back, hand him goggles, explain why they are required, and let him continue once correctly equipped.", correct: true, feedback: "Correct. Stop → equip → explain → continue. Do it calmly, not publicly in a way that humiliates him. The explanation (GHS05 = corrosive, immediate eye damage) turns this into a learning moment, not a punishment." },
          { label: "Let him finish this time but make a note to address it in the next team briefing.", correct: false, feedback: "Wrong. A PPE violation is a live hazard. Waiting compounds the risk. Address it immediately, every time. Inconsistent enforcement teaches operators that rules are optional." },
        ],
      }} />
    </div>
  );
}

/* ─── Module: Team Leadership ───────────────────────────────────────────── */
function ModuleLeadership() {
  return (
    <div className="space-y-5">
      <Lede title="People are your production line">
        The best batch schedule, the finest equipment, and the strictest procedures mean nothing if your operators don't trust you. Trust is built in small moments: learning their names, listening to their concerns, being consistent in your decisions, giving credit when deserved, and having the difficult conversation when standards slip. A supervisor who is only seen when something goes wrong is not a leader — they are an alarm.
      </Lede>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConceptCard icon={<Users size={18} />} title="Building Operator Relationships">
          <p className="font-semibold text-[var(--ink)]">Practical steps for your first 30 days:</p>
          <ul className="ml-3 mt-2 list-disc space-y-1.5">
            <li>Learn every operator's name by the end of week 1. Use it.</li>
            <li>Do daily floor walks — stop and genuinely ask "how's it going?" Don't rush past.</li>
            <li>Ask experienced operators how things were done before you arrived. Their institutional knowledge is invaluable. Listen before you change.</li>
            <li>When an operator raises a problem, act on it within 24 hours — even if only to explain why you can't fix it. Silence kills trust faster than bad news.</li>
            <li>Never criticise an operator's work in front of their peers. Take it private.</li>
          </ul>
        </ConceptCard>
        <ConceptCard icon={<ClipboardList size={18} />} title="The Shift Handover — Your Most Important 15 Minutes">
          <p>A good handover prevents the next supervisor from walking into problems blind. Always provide:</p>
          <ul className="ml-3 mt-2 list-disc space-y-1.5">
            <li><strong className="text-[var(--ink)]">Batch status</strong> — every batch: where it is in the process, any issues</li>
            <li><strong className="text-[var(--ink)]">Equipment status</strong> — anything broken, running rough, or under maintenance</li>
            <li><strong className="text-[var(--ink)]">QC holds</strong> — any batches awaiting results or rework</li>
            <li><strong className="text-[var(--ink)]">Open PTWs</strong> — permits still active that carry over to the next shift</li>
            <li><strong className="text-[var(--ink)]">People issues</strong> — any operator who was spoken to, any performance concern</li>
            <li><strong className="text-[var(--ink)]">Materials</strong> — anything running low that may affect the next shift</li>
          </ul>
          <p className="mt-2 font-semibold text-[var(--warn)]">Write it down. Verbal handovers get forgotten.</p>
        </ConceptCard>
        <ConceptCard icon={<TrendingUp size={18} />} title="Shift Briefing — Setting the Tone">
          <p>Every shift starts with a 5-minute briefing — all operators present, no exceptions.</p>
          <p className="mt-2">A good briefing covers:</p>
          <ol className="ml-3 mt-1 list-decimal space-y-1">
            <li>Safety: one safety topic (near-miss from yesterday, a reminder about PPE in chem store, etc.)</li>
            <li>Production: today's targets, any schedule changes, which lines run what</li>
            <li>Quality: any batches on hold, any spec changes, any customer feedback</li>
            <li>People: any announcements (training, visitor, celebration)</li>
          </ol>
          <p className="mt-2 text-[var(--accent)]">The briefing sets the shift's energy. If you're rushed and dismissive, so is the shift.</p>
        </ConceptCard>
        <ConceptCard icon={<AlertTriangle size={18} />} title="Performance Management — The 3-Step Process">
          <p>When an operator is consistently not meeting expectations:</p>
          <ul className="ml-3 mt-2 list-disc space-y-2">
            <li><strong className="text-[var(--ink)]">Step 1 — Verbal coaching:</strong> Private, calm, specific. "I've noticed X three times this week. Here's why it matters. Here's what I need from you. Can you commit to that?" Document that this conversation happened.</li>
            <li><strong className="text-[var(--ink)]">Step 2 — Written warning:</strong> If behaviour continues. HR is involved. Formal document signed by both parties. Be factual, not emotional.</li>
            <li><strong className="text-[var(--ink)]">Step 3 — Escalate to HR/management:</strong> If no improvement after step 2. You have documented everything. This is HR's process now.</li>
          </ul>
          <p className="mt-2 text-[var(--warn)]">Most issues never get past Step 1 if you address them early and respectfully.</p>
        </ConceptCard>
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className={cx('mb-3', fieldLabel)}>New vs. Experienced Operators — Different Approaches</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--ink)]">New Operator (0–6 months)</p>
            <ul className="ml-3 list-disc space-y-1 text-xs text-[var(--muted)]">
              <li>Pair with a buddy (experienced operator) for the first month</li>
              <li>Follow procedures step by step — don't let shortcuts develop early</li>
              <li>Check in frequently. Ask what's unclear, not "do you understand?" (they'll always say yes)</li>
              <li>Praise correct behaviour specifically: "You checked the batch card before starting — that's exactly right."</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--ink)]">Experienced Operator (2+ years)</p>
            <ul className="ml-3 list-disc space-y-1 text-xs text-[var(--muted)]">
              <li>Involve them in solving problems — they know things you don't</li>
              <li>Assign ownership: "You're responsible for Line B's output this shift"</li>
              <li>Watch for complacency — experienced operators skip steps they "know" are unnecessary. Re-anchor to the why of the SOP</li>
              <li>Give them development opportunities: mentor new operators, lead a Kaizen, represent the team in a quality review</li>
            </ul>
          </div>
        </div>
      </div>

      <ScenarioBlock scenario={{
        situation: "James, your most experienced operator (7 years on the line), has been openly dismissive of a new SOP that requires a double-check signature before starting any new batch. He says 'I've done this 500 times, I don't need a babysitter.' Two other operators are watching.",
        question: "How do you handle this?",
        choices: [
          { label: "Back down in front of the team — James knows what he's doing and the SOP may be unnecessary.", correct: false, feedback: "Wrong. Backing down publicly in front of other operators tells everyone that SOPs are optional if you're experienced enough. You've lost the authority to enforce any procedure." },
          { label: "Publicly issue James a written warning immediately for insubordination.", correct: false, feedback: "Too severe for a first occurrence, and public discipline humiliates and damages the relationship. James's experience is valuable. This approach turns him into an enemy." },
          { label: "Acknowledge James's experience calmly in front of the team, ask him to follow the SOP for now, then speak to him privately to understand his concern and explain the reason for the new procedure.", correct: true, feedback: "Correct. Public: brief, calm, firm (the SOP applies to everyone). Private: listen to his concern, explain that the double-check was introduced after a batch released with wrong formulation (the reason matters). Ask for his input on improving it. His buy-in is worth far more than his compliance." },
        ],
      }} />
    </div>
  );
}

/* ─── Module: Inventory & Materials ─────────────────────────────────────── */
function ModuleInventory({ openGlossary }: { openGlossary: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="mb-2 font-display text-lg font-medium leading-tight text-[var(--ink)]">Never let materials stop your line</h3>
        <p className="text-sm leading-relaxed text-[var(--muted)]">A production supervisor who runs out of a raw material mid-shift has failed at their job — it's a preventable problem. You are responsible for monitoring stock levels, raising purchase requisitions before you hit the minimum, and ensuring that every delivery is checked against its <Term id="CoA" open={openGlossary}>CoA</Term> before it enters the production area.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConceptCard icon={<Package size={18} />} title="Min/Max Stock Levels — How They Work">
          <p><strong className="text-[var(--ink)]">Minimum stock (reorder point)</strong> = the level at which you must raise a purchase order. It is calculated as: (Average daily usage × Supplier lead time in days) + Safety buffer.</p>
          <p className="mt-2">Example: You use 50 kg of SLS per day. Your supplier takes 5 days to deliver. Safety buffer = 2 days. Minimum stock = (50 × 5) + (50 × 2) = 350 kg. When stock hits 350 kg, raise the order.</p>
          <p className="mt-2"><strong className="text-[var(--ink)]">Maximum stock</strong> = dictated by storage space, shelf life, and cash flow. Don't over-order perishable materials.</p>
        </ConceptCard>
        <ConceptCard icon={<ClipboardList size={18} />} title="Certificate of Analysis (CoA)">
          <p>Every delivery of raw material must arrive with a CoA from the supplier — a document showing the test results for that specific lot.</p>
          <p className="mt-2">What to check on a CoA:</p>
          <ul className="ml-3 mt-1 list-disc space-y-1">
            <li>Does the lot number on the document match the lot number on the drum/bag?</li>
            <li>Does the supplier's test result meet YOUR internal specification? (Supplier's spec and your spec may differ)</li>
            <li>Is the CoA dated recently? (Some suppliers recycle old CoAs)</li>
            <li>Is it signed by a qualified person at the supplier?</li>
          </ul>
          <p className="mt-2 font-semibold text-[var(--danger)]">No CoA = reject the delivery. No exceptions.</p>
        </ConceptCard>
        <ConceptCard icon={<TrendingUp size={18} />} title="FEFO vs. FIFO — Using Materials Correctly">
          <p><strong className="text-[var(--ink)]">FIFO (First In, First Out)</strong> — use the oldest stock first. Standard for materials without a fixed expiry.</p>
          <p className="mt-2"><strong className="text-[var(--ink)]">FEFO (First Expired, First Out)</strong> — use the stock with the earliest expiry date first, regardless of when it arrived. Used for preservatives, fragrances, and active ingredients with shelf-life limits.</p>
          <p className="mt-2 text-[var(--warn)]">Using expired raw material is a quality failure. Check expiry dates at each stock count.</p>
        </ConceptCard>
        <ConceptCard icon={<BookOpen size={18} />} title="Lot Traceability — Why Every Batch Records Its Ingredients">
          <p>Every finished goods batch must record the lot number of every raw material used. If a quality issue is discovered after the product ships, you need to be able to answer:</p>
          <ul className="ml-3 mt-1 list-disc space-y-1">
            <li>Which batches were made with that suspect lot?</li>
            <li>Which customers received those batches?</li>
            <li>Were all affected products recalled?</li>
          </ul>
          <p className="mt-2">Without lot traceability, a recall becomes a guessing game — potentially pulling back all stock instead of just the affected lots. Traceability is both a quality requirement and a legal requirement in chemical and personal-care manufacturing.</p>
        </ConceptCard>
      </div>

      <PanelBox label="The Receiving Check — What to Do When a Delivery Arrives">
        <div className="divide-y divide-[var(--border)]">
          {[
            { step: '1', action: 'Check the delivery note matches the purchase order — correct material, quantity, and supplier.' },
            { step: '2', action: 'Physically inspect drums/bags: no damage, no leaks, correct labels (GHS hazard pictograms present), no signs of tampering.' },
            { step: '3', action: 'Verify the CoA is present and matches the lot number on the containers.' },
            { step: '4', action: 'Check the CoA results against your internal spec — not just the supplier\'s spec.' },
            { step: '5', action: 'Quarantine the material in a designated \'Goods In\' area until QC approves it for use. Label clearly: "HOLD — Awaiting QC Release".' },
            { step: '6', action: 'Once QC approves, move to the correct storage location. Apply FEFO/FIFO — place new stock at the back, old stock at the front.' },
            { step: '7', action: 'Update the stock management system. Record the lot number, quantity, and approval date.' },
          ].map((row) => (
            <div key={row.step} className="flex gap-4 px-5 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">{row.step}</span>
              <p className="pt-0.5 text-xs leading-relaxed text-[var(--muted)]">{row.action}</p>
            </div>
          ))}
        </div>
      </PanelBox>

      <ScenarioBlock scenario={{
        situation: "A driver delivers 10 drums of Sodium Lauryl Sulfate (SLS). The drums are correctly labelled and undamaged. However, the Certificate of Analysis is missing — the driver says the supplier will 'email it tomorrow'.",
        question: "What do you do?",
        choices: [
          { label: "Accept the delivery and hold the drums in a quarantine area until the CoA arrives by email.", correct: true, feedback: "Correct. You can accept receipt (the supplier gets paid when you sign the delivery note) but the material cannot enter production until the CoA is received, verified, and QC has approved the lot. Label all drums 'HOLD — Awaiting CoA'. If the CoA doesn't arrive within 24 hours, escalate to your manager and consider returning the delivery." },
          { label: "Reject the delivery entirely and send it back.", correct: false, feedback: "Not necessarily wrong, but premature. A missing CoA at delivery is common. Accepting under quarantine, then following up urgently, is the practical approach. Return only if the CoA never arrives or fails your spec." },
          { label: "Accept the delivery and use the SLS in today's batches — the supplier is reliable and SLS is always fine.", correct: false, feedback: "Wrong. 'The supplier is usually fine' is not a quality system. You have no way of knowing this specific lot meets spec without the CoA. Using unverified raw material is a quality violation and could cause batch failures or customer harm." },
        ],
      }} />
    </div>
  );
}

/* ─── Module: Continuous Improvement + OEE Calculator ───────────────────── */
function ModuleImprovement({ openGlossary }: { openGlossary: (id: string) => void }) {
  const [avail, setAvail] = useState(92);
  const [perf, setPerf] = useState(95);
  const [qual, setQual] = useState(98);
  const oee = Math.round((avail * perf * qual) / 10000);
  const oeeVar = oee >= 85 ? 'var(--ok)' : oee >= 65 ? 'var(--warn)' : 'var(--danger)';
  const oeeLabel = oee >= 85 ? 'World Class ✓' : oee >= 65 ? 'Average — room to improve' : 'Below Average — urgent action needed';

  return (
    <div className="space-y-5">
      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="mb-2 font-display text-lg font-medium leading-tight text-[var(--ink)]">Every supervisor should be making the job easier tomorrow than it is today</h3>
        <p className="text-sm leading-relaxed text-[var(--muted)]">Continuous improvement isn't a programme you run once a year — it's a daily habit. The best supervisors carry a notebook and write down every small friction they observe: a form in the wrong place, a step that always takes longer than it should, a question operators ask repeatedly because the SOP is unclear. Those small observations become <Term id="Kaizen" open={openGlossary}>Kaizen</Term> improvements that compound over time.</p>
      </div>

      {/* OEE Calculator */}
      <PanelBox label="Interactive OEE Calculator" icon={<Calculator size={14} />}>
        <div className="p-5">
          <div className="mb-6 text-center">
            <p className={fieldLabel}>OEE = Availability × Performance × Quality</p>
            <p className="mt-2 font-display text-5xl font-semibold leading-none" style={{ color: oeeVar }}>{oee}%</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: oeeVar }}>{oeeLabel}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { label: 'Availability', value: avail, set: setAvail, desc: '(Planned time − Downtime) ÷ Planned time', what: 'Are machines running when they should be? Losses: breakdowns, changeovers, planned maintenance.' },
              { label: 'Performance', value: perf, set: setPerf, desc: 'Actual output ÷ Max possible output at full speed', what: 'When running, is the line going as fast as it can? Losses: slow speeds, micro-stops, jams.' },
              { label: 'Quality', value: qual, set: setQual, desc: 'Good product ÷ Total product made', what: 'Of all product made, how much was first-pass good? Losses: rework, QC failures, startup waste.' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">{item.label}</span>
                  <span className="font-mono text-sm font-bold text-[var(--accent)]">{item.value}%</span>
                </div>
                <input type="range" min={0} max={100} value={item.value} onChange={(e) => item.set(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
                <p className="mt-1 text-[10px] text-[var(--muted)]">{item.desc}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">{item.what}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-px bg-[var(--border)] text-center text-xs">
            <div className="bg-[var(--danger-bg)] p-2"><p className="text-[10px] text-[var(--muted)]">Below average</p><p className="font-bold text-[var(--danger)]">&lt; 65%</p></div>
            <div className="bg-[var(--warn-bg)] p-2"><p className="text-[10px] text-[var(--muted)]">Typical plant</p><p className="font-bold text-[var(--warn)]">65–84%</p></div>
            <div className="bg-[var(--ok-bg)] p-2"><p className="text-[10px] text-[var(--muted)]">World class</p><p className="font-bold text-[var(--ok)]">≥ 85%</p></div>
          </div>
        </div>
      </PanelBox>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConceptCard icon={<TrendingUp size={18} />} title="The 5 Whys — Root Cause Analysis">
          <p>When something goes wrong, don't stop at the first answer. Ask "Why?" five times to reach the real cause.</p>
          <div className="mt-2 space-y-1.5 text-xs">
            <p><span className="font-bold text-[var(--accent)]">Problem:</span> Batch BT-0443 failed pH spec.</p>
            <p><span className="text-[var(--warn)]">Why?</span> Caustic soda was under-dosed by 2 kg.</p>
            <p><span className="text-[var(--warn)]">Why?</span> Operator weighed 48 kg instead of 50 kg.</p>
            <p><span className="text-[var(--warn)]">Why?</span> Weighing scale displayed in pounds, operator assumed kilograms.</p>
            <p><span className="text-[var(--warn)]">Why?</span> Scale settings were changed during calibration last week and not reset.</p>
            <p><span className="text-[var(--warn)]">Why?</span> There is no post-calibration checklist to verify scale units before returning to service.</p>
            <p className="mt-2 font-semibold text-[var(--ok)]">Root cause: Missing post-calibration verification procedure. Fix: add checklist step. This prevents every future batch from failing for the same reason.</p>
          </div>
        </ConceptCard>
        <ConceptCard icon={<Zap size={18} />} title="PDCA — The Improvement Cycle">
          <p>Every improvement follows the same loop:</p>
          <div className="mt-2 space-y-2">
            {[
              { step: 'Plan', desc: 'Define the problem with data. What\'s happening? How often? What does good look like? Identify the root cause. Design a solution.' },
              { step: 'Do', desc: 'Implement the solution on a small scale first (one line, one shift, one operator). Don\'t change everything at once.' },
              { step: 'Check', desc: 'Measure the result against the baseline. Did the problem reduce? Did anything unexpected happen? Use data, not opinion.' },
              { step: 'Act', desc: 'If it worked: standardise it (update the SOP, train all operators). If it didn\'t work: go back to Plan with new information.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">{s.step[0]}</span>
                <div><p className="text-xs font-bold text-[var(--ink)]">{s.step}</p><p className="text-xs text-[var(--muted)]">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </ConceptCard>
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className={cx('mb-3', fieldLabel)}>The 6 Big OEE Losses — Know What's Hurting You</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { loss: 'Unplanned Downtime', category: 'Availability', tone: 'accent', example: 'Mixer motor failure mid-batch', fix: 'Preventive maintenance schedule, operator basic maintenance training' },
            { loss: 'Planned Downtime', category: 'Availability', tone: 'accent', example: 'Line changeover, cleaning, shift changeover', fix: 'SMED (Single Minute Exchange of Die) — organise everything needed before the line stops' },
            { loss: 'Reduced Speed', category: 'Performance', tone: 'warn', example: 'Running at 80% of rated speed due to "caution"', fix: 'Establish and display the correct running parameters. Remove guesswork.' },
            { loss: 'Minor Stoppages', category: 'Performance', tone: 'warn', example: 'Frequent 2-minute jams on the bottling line', fix: 'Map where jams occur. Often one mechanical adjustment eliminates 80% of them.' },
            { loss: 'Startup Waste', category: 'Quality', tone: 'danger', example: 'First 50 litres of each batch discarded during line priming', fix: 'Optimise startup procedure. Recirculate rather than discard where safe.' },
            { loss: 'Production Defects', category: 'Quality', tone: 'danger', example: 'Batches failing QC and requiring rework', fix: 'Drive FPY improvements through the 5 Whys and consistent operator training.' },
          ].map((l) => (
            <div key={l.loss} className="border border-[var(--border)] bg-[var(--bg-soft)] p-3">
              <span className="mb-1.5 inline-block px-2 py-0.5 text-[10px] font-semibold" style={{ color: `var(--${l.tone})`, background: `var(--${l.tone}-bg)` }}>{l.category}</span>
              <p className="text-xs font-bold text-[var(--ink)]">{l.loss}</p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">e.g. {l.example}</p>
              <p className="mt-1 text-[10px] text-[var(--ok)]">Fix: {l.fix}</p>
            </div>
          ))}
        </div>
      </div>

      <ScenarioBlock scenario={{
        situation: "Your line changeover between Heavy-Duty Degreaser and Vehicle Wash Concentrate takes 65 minutes. The production manager wants it under 30 minutes. You have no budget for new equipment.",
        question: "What is your Kaizen approach?",
        choices: [
          { label: "Tell the manager 30 minutes is impossible without investment in new equipment.", correct: false, feedback: "This closes the problem before you've even looked at it. 65→30 minutes is achievable through organisation alone in most chemical plants. 'No budget' Kaizen solutions are the point — not equipment purchases." },
          { label: "Time every step of the current changeover, identify which steps can be done in parallel or before the line stops, standardise the sequence, and trial the new process.", correct: true, feedback: "Correct. This is SMED (Single Minute Exchange of Die) applied to a chemical line. Typically: 40% of changeover time is 'internal' (done while line is stopped) but could be 'external' (done while line is still running). Moving external steps — gathering materials, labelling drums, preparing QC forms — before the line stops often achieves 40–50% reduction without any investment." },
          { label: "Increase the shift to 10 hours to absorb the changeover time without impacting output.", correct: false, feedback: "This treats the symptom (lost production time) not the cause (inefficient changeover). Longer shifts increase fatigue, cost, and safety risk. Solve the process, not the clock." },
        ],
      }} />
    </div>
  );
}

/* ─── Glossary Modal ────────────────────────────────────────────────────── */
function GlossaryModal({ termId, onClose }: { termId: string; onClose: () => void }) {
  const entry = GLOSSARY[termId];
  if (!entry) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <span className={fieldLabel}>Definition</span>
          <button onClick={onClose} className="text-[var(--muted)] transition-colors hover:text-[var(--ink)]"><X size={18} /></button>
        </div>
        <h3 className="mb-3 font-display text-lg font-medium leading-tight text-[var(--ink)]">{entry.term}</h3>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{entry.definition}</p>
        {entry.example && (
          <div className="mt-4 border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className={cx('mb-1', fieldLabel)}>Real Example</p>
            <p className="text-xs leading-relaxed text-[var(--muted)]">{entry.example}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
const MODULES: { id: ModuleId; title: string; tagline: string }[] = [
  { id: 'production', title: 'Daily Production', tagline: 'Schedules, floor walks, escalation' },
  { id: 'quality', title: 'Quality Control', tagline: 'QC ownership, parameters, batch release' },
  { id: 'safety', title: 'Safety & Compliance', tagline: 'PPE, GHS, SDS, PTW, LTI' },
  { id: 'leadership', title: 'Team Leadership', tagline: 'Relationships, handover, performance' },
  { id: 'inventory', title: 'Inventory & Materials', tagline: 'CoA, min/max, FEFO, traceability' },
  { id: 'improvement', title: 'Continuous Improvement', tagline: 'OEE, Kaizen, 5 Whys, PDCA' },
];

export default function ProductionPage() {
  const [active, setActive] = useState<ModuleId>('production');
  const [completed, setCompleted] = useState<Set<ModuleId>>(new Set());
  const [glossaryOpen, setGlossaryOpen] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('prodTraining_completed');
      if (stored) setCompleted(new Set(JSON.parse(stored)));
    } catch {
      /* storage unavailable or corrupt; start fresh */
    }
  }, []);

  const markComplete = useCallback((id: ModuleId) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('prodTraining_completed', JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });
    const idx = MODULES.findIndex((m) => m.id === id);
    if (idx < MODULES.length - 1) setActive(MODULES[idx + 1].id);
  }, []);

  const openGlossary = useCallback((id: string) => setGlossaryOpen(id), []);
  const progress = Math.round((completed.size / MODULES.length) * 100);
  const current = MODULES.find((m) => m.id === active)!;

  const TABS: TabDef<ModuleId>[] = MODULES.map((m) => ({ id: m.id, label: m.title }));

  const renderModule = () => {
    switch (active) {
      case 'production': return <ModuleProduction />;
      case 'quality': return <ModuleQuality openGlossary={openGlossary} />;
      case 'safety': return <ModuleSafety openGlossary={openGlossary} />;
      case 'leadership': return <ModuleLeadership />;
      case 'inventory': return <ModuleInventory openGlossary={openGlossary} />;
      case 'improvement': return <ModuleImprovement openGlossary={openGlossary} />;
    }
  };

  return (
    <DemoShell title="Production Supervisor Training" wordmark="OPS" revealKey={active}>
      <Masthead
        eyebrow="Operations training · Meridian Chemicals"
        title="Run the floor before you run the floor."
        lede="An interactive onboarding programme for a chemical-plant production supervisor — six lessons covering daily management, quality ownership, safety culture, leading operators, materials, and continuous improvement. Each lesson ends in a real decision; a live OEE calculator and an inline glossary back up the theory."
        facts={[
          { label: 'Lessons', value: `${MODULES.length} modules` },
          { label: 'Format', value: 'Scenario-led' },
          { label: 'Progress', value: `${completed.size} / ${MODULES.length} complete` },
          { label: 'Reference', value: 'WCM · Lean' },
        ]}
      />

      <TabNav tabs={TABS} active={active} onChange={setActive} />

      {/* Progress band */}
      <div className="mt-6 flex items-center gap-4 border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Your progress</p>
        <Meter value={progress} max={100} tone={progress === 100 ? 'ok' : 'accent'} className="flex-1" />
        <p className="shrink-0 font-mono text-xs tabular-nums text-[var(--ink)]">{progress}%</p>
      </div>

      <div className="pt-7">
        <div className="mb-5">
          <p className={fieldLabel}>Lesson {MODULES.findIndex((m) => m.id === active) + 1} of {MODULES.length}</p>
          <h2 className="mt-1 font-display text-[clamp(1.375rem,2.6vw,1.75rem)] font-medium leading-tight text-[var(--ink)]">{current.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{current.tagline}</p>
        </div>

        {renderModule()}

        {/* Module footer */}
        <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
          <div className="text-xs text-[var(--muted)]">
            {completed.has(active) ? (
              <span className="flex items-center gap-1.5 text-[var(--ok)]"><CheckCircle2 size={14} /> Lesson complete</span>
            ) : 'Work through the scenario above, then mark this lesson done.'}
          </div>
          {completed.has(active) ? (
            <GhostButton onClick={() => markComplete(active)}><CheckCircle2 size={15} /> Done</GhostButton>
          ) : (
            <AccentButton onClick={() => markComplete(active)}><ChevronRight size={15} /> Mark complete & continue</AccentButton>
          )}
        </div>
      </div>

      {/* Completion banner */}
      {completed.size === MODULES.length && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 border border-[var(--ok)] bg-[var(--ok-bg)] px-6 py-4 shadow-2xl backdrop-blur-sm">
          <Award size={20} className="shrink-0 text-[var(--ok)]" />
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">Training complete</p>
            <p className="text-xs text-[var(--ok)]">All {MODULES.length} production-supervisor lessons finished.</p>
          </div>
        </div>
      )}

      {glossaryOpen && <GlossaryModal termId={glossaryOpen} onClose={() => setGlossaryOpen(null)} />}

      <p className="mt-10 flex items-center gap-2 border-t border-[var(--border)] pt-6 text-[11px] leading-relaxed text-[var(--muted)]">
        <ShieldCheck size={13} className="shrink-0 text-[var(--accent)]" />
        A scenario-led supervisor onboarding programme for chemical manufacturing — training structure modelled on World-Class Manufacturing and Lean practice; all lessons, scenarios and the OEE model are original.
      </p>
    </DemoShell>
  );
}
