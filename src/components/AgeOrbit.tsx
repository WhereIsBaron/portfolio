import { useEffect, useMemo, useRef, useState } from 'react';

// Birthdate anchored to Gaborone time (UTC+2). Time defaults to 00:00.
const BIRTH_MS = Date.parse('1996-09-13T00:00:00+02:00');

const SIZE = 320;
const C = SIZE / 2; // centre

type Ring = {
  key: string;
  label: string;
  radius: number;
  planet: number; // planet radius
  periodS: number; // seconds for one full revolution
  color: string;
};

// Each outer planet completes its orbit more slowly, like an orrery.
const RINGS: Ring[] = [
  { key: 'sec', label: 'Seconds', radius: 42, planet: 4, periodS: 60, color: 'var(--brand-bright)' },
  { key: 'min', label: 'Minutes', radius: 70, planet: 5, periodS: 3600, color: 'var(--brand-bright)' },
  { key: 'hour', label: 'Hours', radius: 98, planet: 6, periodS: 86400, color: 'var(--brand)' },
  { key: 'day', label: 'Days', radius: 126, planet: 7, periodS: 2629800, color: 'var(--brand)' },
  { key: 'year', label: 'Years', radius: 154, planet: 9, periodS: 31557600, color: 'var(--accent)' },
];

type Readout = { years: number; days: number; hh: number; mm: number; ss: number };

const bday = (year: number) => Date.parse(`${year}-09-13T00:00:00+02:00`);

function computeReadout(nowMs: number): Readout {
  let years = new Date(nowMs).getFullYear() - 1996;
  while (bday(1996 + years) > nowMs) years--;
  while (bday(1996 + years + 1) <= nowMs) years++;
  let rem = nowMs - bday(1996 + years);
  const days = Math.floor(rem / 86400000);
  rem -= days * 86400000;
  const hh = Math.floor(rem / 3600000);
  rem -= hh * 3600000;
  const mm = Math.floor(rem / 60000);
  rem -= mm * 60000;
  const ss = Math.floor(rem / 1000);
  return { years, days, hh, mm, ss };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function AgeOrbit() {
  const planetRefs = useRef<Record<string, SVGGElement | null>>({});
  const [readout, setReadout] = useState<Readout>(() => computeReadout(Date.now()));

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    let raf = 0;
    let interval = 0;
    let lastReadoutSec = -1;

    const paint = (nowMs: number) => {
      const elapsedS = (nowMs - BIRTH_MS) / 1000;
      for (const ring of RINGS) {
        const g = planetRefs.current[ring.key];
        if (!g) continue;
        const angle = ((elapsedS % ring.periodS) / ring.periodS) * 360;
        g.setAttribute('transform', `rotate(${angle} ${C} ${C})`);
      }
      // Refresh the text at most once per second.
      const wholeSec = Math.floor(nowMs / 1000);
      if (wholeSec !== lastReadoutSec) {
        lastReadoutSec = wholeSec;
        setReadout(computeReadout(nowMs));
      }
    };

    if (reduced) {
      paint(Date.now());
      interval = window.setInterval(() => paint(Date.now()), 1000);
    } else {
      const loop = () => {
        paint(Date.now());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (interval) clearInterval(interval);
    };
  }, [reduced]);

  return (
    <div className="reveal mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--surface)] to-transparent p-6">
      <p className="text-sm text-[var(--muted)]">Age, live</p>

      <div className="mt-4 flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full max-w-[300px]"
          role="img"
          aria-label={`Live age: ${readout.years} years, ${readout.days} days, ${pad(
            readout.hh
          )}:${pad(readout.mm)}:${pad(readout.ss)}`}
        >
          <defs>
            <radialGradient id="sun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand-bright)" />
              <stop offset="100%" stopColor="var(--brand)" />
            </radialGradient>
          </defs>

          {/* orbit rings */}
          {RINGS.map((r) => (
            <circle
              key={r.key}
              cx={C}
              cy={C}
              r={r.radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          ))}

          {/* sun */}
          <circle cx={C} cy={C} r={14} fill="url(#sun)" />
          <circle cx={C} cy={C} r={14} fill="none" stroke="var(--brand-bright)" strokeOpacity={0.4} strokeWidth={1} />

          {/* planets */}
          {RINGS.map((r) => (
            <g
              key={r.key}
              ref={(el) => {
                planetRefs.current[r.key] = el;
              }}
            >
              <circle cx={C} cy={C - r.radius} r={r.planet} fill={r.color}>
                <title>{r.label}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* live readout */}
      <p className="mt-4 text-center font-display text-2xl font-light text-white tabular-nums">
        {readout.years}
        <span className="text-base text-[var(--muted)]"> yrs </span>
        {readout.days}
        <span className="text-base text-[var(--muted)]"> days </span>
        <span className="text-[var(--brand-bright)]">
          {pad(readout.hh)}:{pad(readout.mm)}:{pad(readout.ss)}
        </span>
      </p>

      {/* legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)]">
        {RINGS.map((r) => (
          <span key={r.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}
