import { useMemo, useState } from 'react';
import {
  BedDouble,
  Briefcase,
  Camera,
  Stethoscope,
  CalendarDays,
  ArrowRight,
  Check,
  CalendarClock,
  Layers,
  Settings2,
  BellRing,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import { verticals, type Vertical, type Resource } from '@/data/booking';
import { DemoShell, Masthead } from '@/components/demo/kit';

const ICONS: Record<Vertical['icon'], LucideIcon> = {
  hotel: BedDouble,
  consultant: Briefcase,
  photography: Camera,
  clinic: Stethoscope,
  appointment: CalendarDays,
};

const input =
  'w-full  border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-[var(--ink)] placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

const todayStr = () => new Date().toISOString().slice(0, 10);

const FEATURES = [
  { icon: Settings2, title: 'Configure per business', body: 'Rename resources, switch between date-range and time-slot mode, and add custom fields. Moving from a hotel to a clinic needs no code change.' },
  { icon: CalendarClock, title: 'Availability & slots', body: 'Date ranges for stays, time slots for appointments. Real availability rules plug in with the backend.' },
  { icon: Layers, title: 'Any number of resources', body: 'Rooms, staff, packages, or services, each with its own detail and price.' },
  { icon: BellRing, title: 'Confirmations & reminders', body: 'Email or SMS confirmations and reminders once the backend is wired.', soon: true },
  { icon: CreditCard, title: 'Payments', body: 'Take a deposit or full payment at checkout through a gateway.', soon: true },
  { icon: LayoutDashboard, title: 'Owner dashboard', body: 'A place for the business to see and manage incoming bookings.', soon: true },
];

function SummaryRows({
  vert,
  resource,
  startDate,
  endDate,
  slot,
  party,
  name,
}: {
  vert: Vertical;
  resource: Resource | undefined;
  startDate: string;
  endDate: string;
  slot: string;
  party: number;
  name: string;
}) {
  const rows: Array<[string, string]> = [
    ['Business type', vert.name],
    [vert.resourceLabel, resource ? resource.name : '-'],
  ];
  if (vert.dateMode === 'range') {
    rows.push(['Dates', startDate && endDate ? `${startDate} to ${endDate}` : startDate || '-']);
  } else {
    rows.push(['Date', startDate || '-']);
    rows.push(['Time', slot || '-']);
  }
  if (vert.partyLabel) rows.push([vert.partyLabel, String(party)]);
  if (resource) rows.push(['Price', resource.price]);
  if (name.trim()) rows.push(['Name', name.trim()]);

  return (
    <>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4">
          <span className="text-[var(--muted)]">{k}</span>
          <span className="text-right font-medium text-[var(--ink)]">{v}</span>
        </div>
      ))}
    </>
  );
}

export default function BookingPage() {
  const [vertId, setVertId] = useState(verticals[0].id);
  const vert = useMemo(() => verticals.find((v) => v.id === vertId) || verticals[0], [vertId]);

  const [resourceId, setResourceId] = useState(vert.resources[0].id);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');
  const [slot, setSlot] = useState('');
  const [party, setParty] = useState(1);
  const [extraVals, setExtraVals] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);

  const resource = vert.resources.find((r) => r.id === resourceId);

  const selectVertical = (id: string) => {
    const v = verticals.find((x) => x.id === id) || verticals[0];
    setVertId(id);
    setResourceId(v.resources[0].id);
    setStartDate(todayStr());
    setEndDate('');
    setSlot('');
    setParty(1);
    setExtraVals({});
    setError(null);
    setRef(null);
  };

  const book = () => {
    if (!resource) return setError(`Pick a ${vert.resourceLabel.toLowerCase()}.`);
    if (!startDate) return setError('Choose a date.');
    if (vert.dateMode === 'range' && (!endDate || endDate <= startDate)) {
      return setError('Choose a check-out date after check-in.');
    }
    if (vert.dateMode === 'slot' && !slot) return setError('Pick a time slot.');
    if (!name.trim() || !email.trim()) return setError('Add your name and email.');
    setError(null);
    setRef('BKG-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  };

  const Icon = ICONS[vert.icon];

  return (
    <DemoShell title="Universal Booking System" wordmark="Booking">
      <Masthead
        eyebrow="Product demo · configurable booking engine"
        title={
          <>
            One booking engine, <span className="text-[var(--accent)]">any business.</span>
          </>
        }
        lede="A universal booking system any business can drop in and run. Configure the resources, availability and fields once, and the same flow adapts to hotels, clinics, consultants, studios, or anything that runs on appointments. Switch the business type below to watch it reconfigure itself — the Firebase backend for real availability, storage and confirmations is the next build."
        facts={[
          { label: 'Business types', value: verticals.length },
          { label: 'Booking modes', value: 'Range · Slot' },
          { label: 'Setup', value: 'No code' },
          { label: 'Backend', value: 'Firebase · next' },
        ]}
        live="Live front-end demo"
      />

      {/* Vertical picker */}
      <section className="pt-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {verticals.map((v) => {
            const VIcon = ICONS[v.icon];
            const on = v.id === vertId;
            return (
              <button
                key={v.id}
                onClick={() => selectVertical(v.id)}
                className={`flex flex-col items-start gap-3  border p-4 text-left transition-colors ${
                  on
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]'
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center  ${
                    on ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-[var(--bg-soft)] text-[var(--accent)]'
                  }`}
                >
                  <VIcon size={18} />
                </span>
                <span className="text-sm font-medium text-[var(--ink)]">{v.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Booking widget */}
      <section className="pt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className=" border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 lg:col-span-3">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center  bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon size={20} />
              </span>
              <div>
                <h2 className="font-display text-xl text-[var(--ink)]">{vert.name}</h2>
                <p className="text-sm text-[var(--muted)]">{vert.blurb}</p>
              </div>
            </div>

            <label className="mb-2 block text-sm text-[var(--muted)]">{vert.resourceLabel}</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {vert.resources.map((r) => {
                const on = r.id === resourceId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setResourceId(r.id)}
                    className={` border p-3 text-left transition-colors ${
                      on
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--bg-soft)] hover:border-[var(--border)]'
                    }`}
                  >
                    <div className="text-sm font-medium text-[var(--ink)]">{r.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">{r.detail}</div>
                    <div className="mt-2 text-xs font-medium text-[var(--accent)]">{r.price}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">
                  {vert.dateMode === 'range' ? 'Check in' : 'Date'}
                </label>
                <input
                  type="date"
                  min={todayStr()}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={input}
                />
              </div>
              {vert.dateMode === 'range' && (
                <div>
                  <label className="mb-2 block text-sm text-[var(--muted)]">Check out</label>
                  <input
                    type="date"
                    min={startDate || todayStr()}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={input}
                  />
                </div>
              )}
              {vert.partyLabel && (
                <div>
                  <label className="mb-2 block text-sm text-[var(--muted)]">{vert.partyLabel}</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={party}
                    onChange={(e) => setParty(Math.max(1, Number(e.target.value) || 1))}
                    className={input}
                  />
                </div>
              )}
            </div>

            {vert.dateMode === 'slot' && vert.timeSlots && (
              <div className="mt-6">
                <label className="mb-2 block text-sm text-[var(--muted)]">Time</label>
                <div className="flex flex-wrap gap-2">
                  {vert.timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSlot(t)}
                      className={` border px-3 py-1.5 text-sm transition-colors ${
                        slot === t
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {vert.extra?.map((f) => (
              <div key={f.name} className="mt-6">
                <label className="mb-2 block text-sm text-[var(--muted)]">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    placeholder={f.placeholder}
                    value={extraVals[f.name] || ''}
                    onChange={(e) => setExtraVals((s) => ({ ...s, [f.name]: e.target.value }))}
                    className={`${input} resize-none`}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={extraVals[f.name] || ''}
                    onChange={(e) => setExtraVals((s) => ({ ...s, [f.name]: e.target.value }))}
                    className={input}
                  />
                )}
              </div>
            ))}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">Your name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={input} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@email.com" className={input} />
              </div>
            </div>
          </div>

          {/* Summary / confirmation */}
          <div className="lg:col-span-2">
            <div className="sticky top-24  border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
              {ref ? (
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                    <Check size={26} />
                  </span>
                  <h3 className="mt-4 font-display text-xl text-[var(--ink)]">Booking confirmed</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Reference {ref}</p>
                  <div className="mt-5 space-y-2  border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-left text-sm">
                    <SummaryRows vert={vert} resource={resource} startDate={startDate} endDate={endDate} slot={slot} party={party} name={name} />
                  </div>
                  <p className="mt-4 text-xs text-[var(--muted)]">
                    Demo only, nothing was saved. Firebase will store real bookings and send a confirmation.
                  </p>
                  <button
                    onClick={() => setRef(null)}
                    className="mt-5 w-full  border border-[var(--border)] py-2.5 text-sm text-[var(--ink)] transition-colors hover:border-[var(--border)]"
                  >
                    Make another booking
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-lg text-[var(--ink)]">Your booking</h3>
                  <div className="mt-4 space-y-2 text-sm">
                    <SummaryRows vert={vert} resource={resource} startDate={startDate} endDate={endDate} slot={slot} party={party} name={name} />
                  </div>
                  {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
                  <button
                    onClick={book}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2  bg-[var(--accent)] py-3 text-sm font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90"
                  >
                    {vert.cta} <ArrowRight size={16} />
                  </button>
                  <p className="mt-3 text-center text-xs text-[var(--muted)]">No payment taken in this demo.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-10 border-t border-[var(--border)] pt-8 pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Capabilities</p>
        <h2 className="mt-2 font-display text-[clamp(1.375rem,2.6vw,1.75rem)] font-medium leading-tight text-[var(--ink)]">Why it is universal</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className=" border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center  bg-[var(--bg-soft)] text-[var(--accent)]">
                  <f.icon size={18} />
                </span>
                {f.soon && (
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    With backend
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-[var(--ink)]">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </DemoShell>
  );
}
