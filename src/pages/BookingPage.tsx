import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  Briefcase,
  Camera,
  Stethoscope,
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarClock,
  Layers,
  Settings2,
  BellRing,
  CreditCard,
  LayoutDashboard,
} from 'lucide-react';
import { verticals, type Vertical, type Resource } from '@/data/booking';
import Footer from '@/components/Footer';

const ICONS: Record<Vertical['icon'], React.ComponentType<{ size?: number; className?: string }>> = {
  hotel: BedDouble,
  consultant: Briefcase,
  photography: Camera,
  clinic: Stethoscope,
  appointment: CalendarDays,
};

const input =
  'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-4 py-2.5 text-white placeholder:text-[var(--muted)]/50 focus:border-[var(--brand-bright)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bright)]';

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
          <span className="text-right font-medium text-white">{v}</span>
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            Andrew<span className="text-[var(--brand-bright)]">.</span>Langeveldt
          </Link>
          <Link
            to="/#work"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> Back to portfolio
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bright)]" /> Live front-end demo
        </span>
        <h1 className="mt-6 max-w-3xl font-display text-4xl font-light leading-[1.1] text-white sm:text-6xl">
          One booking engine, <span className="text-[var(--brand-bright)]">any business.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          A universal booking system any business can drop in and run. Configure the resources,
          availability, and fields once, and the same flow adapts to hotels, clinics, consultants,
          studios, or anything that runs on appointments. Switch the business type below to see it
          reconfigure itself.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]/70">
          This is the front end. The Firebase backend for real availability, storage, and
          confirmations is next.
        </p>
      </section>

      {/* Vertical picker */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {verticals.map((v) => {
            const VIcon = ICONS[v.icon];
            const on = v.id === vertId;
            return (
              <button
                key={v.id}
                onClick={() => selectVertical(v.id)}
                className={`flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  on
                    ? 'border-[var(--brand-bright)]/50 bg-[var(--brand)]/10'
                    : 'border-white/10 bg-[var(--surface)] hover:border-white/20'
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    on ? 'bg-[var(--brand-bright)] text-[#0b0d10]' : 'bg-white/5 text-[var(--brand-bright)]'
                  }`}
                >
                  <VIcon size={18} />
                </span>
                <span className="text-sm font-medium text-white">{v.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Booking widget */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-6 sm:p-8 lg:col-span-3">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand)]/15 text-[var(--brand-bright)]">
                <Icon size={20} />
              </span>
              <div>
                <h2 className="font-display text-xl text-white">{vert.name}</h2>
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
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      on
                        ? 'border-[var(--brand-bright)]/50 bg-[var(--brand)]/10'
                        : 'border-white/10 bg-[var(--bg-soft)] hover:border-white/20'
                    }`}
                  >
                    <div className="text-sm font-medium text-white">{r.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">{r.detail}</div>
                    <div className="mt-2 text-xs font-medium text-[var(--brand-bright)]">{r.price}</div>
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
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        slot === t
                          ? 'border-[var(--brand-bright)] bg-[var(--brand-bright)] text-[#0b0d10]'
                          : 'border-white/10 text-[var(--muted)] hover:text-white'
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
            <div className="sticky top-24 rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--surface)] to-transparent p-6 sm:p-8">
              {ref ? (
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-bright)] text-[#0b0d10]">
                    <Check size={26} />
                  </span>
                  <h3 className="mt-4 font-display text-xl text-white">Booking confirmed</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Reference {ref}</p>
                  <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-[var(--bg-soft)] p-4 text-left text-sm">
                    <SummaryRows vert={vert} resource={resource} startDate={startDate} endDate={endDate} slot={slot} party={party} name={name} />
                  </div>
                  <p className="mt-4 text-xs text-[var(--muted)]/70">
                    Demo only, nothing was saved. Firebase will store real bookings and send a confirmation.
                  </p>
                  <button
                    onClick={() => setRef(null)}
                    className="mt-5 w-full rounded-xl border border-white/10 py-2.5 text-sm text-white transition-colors hover:border-white/30"
                  >
                    Make another booking
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-lg text-white">Your booking</h3>
                  <div className="mt-4 space-y-2 text-sm">
                    <SummaryRows vert={vert} resource={resource} startDate={startDate} endDate={endDate} slot={slot} party={party} name={name} />
                  </div>
                  {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                  <button
                    onClick={book}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bright)] py-3 text-sm font-medium text-[#0b0d10] transition-colors hover:bg-white"
                  >
                    {vert.cta} <ArrowRight size={16} />
                  </button>
                  <p className="mt-3 text-center text-xs text-[var(--muted)]/60">No payment taken in this demo.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="font-display text-2xl text-white">Why it is universal</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[var(--brand-bright)]">
                  <f.icon size={18} />
                </span>
                {f.soon && (
                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    With backend
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
