import { useEffect, useMemo, useRef, useState } from 'react';

// Birthdate anchored to Gaborone time (UTC+2). Time defaults to 00:00.
const BIRTH_MS = Date.parse('1996-09-13T00:00:00+02:00');

const SIZE = 420;
const C = SIZE / 2; // centre

type Ring = {
  key: 'sec' | 'min' | 'hour' | 'day' | 'year';
  unit: string;
  radius: number;
  color: string;
};

// Inner = fast, outer = slow. Each badge's angle matches its number's value,
// like nested clock hands.
const RINGS: Ring[] = [
  { key: 'sec', unit: 'sec', radius: 56, color: 'var(--brand-bright)' },
  { key: 'min', unit: 'min', radius: 92, color: 'var(--brand-bright)' },
  { key: 'hour', unit: 'hr', radius: 128, color: 'var(--brand)' },
  { key: 'day', unit: 'days', radius: 164, color: 'var(--brand)' },
  { key: 'year', unit: 'yrs', radius: 196, color: 'var(--accent)' },
];

// Deterministic faint starfield for a "space" feel.
const STARS = [
  [46, 60], [96, 30], [150, 74], [206, 26], [270, 52], [330, 40], [380, 92],
  [30, 140], [388, 168], [58, 210], [364, 236], [40, 300], [392, 300],
  [86, 360], [150, 392], [214, 372], [286, 384], [344, 356], [372, 120],
  [120, 116], [300, 108], [76, 264], [346, 288], [176, 40],
] as const;

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
  const badgeRefs = useRef<Record<string, SVGGElement | null>>({});
  const numRefs = useRef<Record<string, SVGTextElement | null>>({});
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
    let lastSec = -1;

    const paint = (nowMs: number) => {
      const since = nowMs - BIRTH_MS;
      const totalSec = Math.floor(since / 1000);

      const r = computeReadout(nowMs);
      const bdThis = bday(1996 + r.years);
      const lifeYear = bday(1996 + r.years + 1) - bdThis;
      const yearFrac = (nowMs - bdThis) / lifeYear;

      const state: Record<Ring['key'], { val: number; frac: number }> = {
        sec: { val: totalSec % 60, frac: ((since / 1000) % 60) / 60 },
        min: { val: Math.floor(totalSec / 60) % 60, frac: ((since / 60000) % 60) / 60 },
        hour: { val: Math.floor(totalSec / 3600) % 24, frac: ((since / 3600000) % 24) / 24 },
        day: { val: r.days, frac: yearFrac },
        // Offset half a turn so the year badge never overlaps the day badge
        // (both advance once per year of life).
        year: { val: r.years, frac: (yearFrac + 0.5) % 1 },
      };

      for (const ring of RINGS) {
        const { val, frac } = state[ring.key];
        const theta = frac * 2 * Math.PI;
        const x = C + ring.radius * Math.sin(theta);
        const y = C - ring.radius * Math.cos(theta);
        badgeRefs.current[ring.key]?.setAttribute('transform', `translate(${x} ${y})`);
        const num = numRefs.current[ring.key];
        if (num) num.textContent = String(val);
      }

      if (totalSec !== lastSec) {
        lastSec = totalSec;
        setReadout(r);
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
    <div className="reveal mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--surface)] to-transparent p-6">
      <p className="text-sm text-[var(--muted)]">Age, live</p>

      <div className="mt-4 flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full max-w-[340px]"
          role="img"
          aria-label={`Live age: ${readout.years} years, ${readout.days} days, ${pad(
            readout.hh
          )}:${pad(readout.mm)}:${pad(readout.ss)}`}
        >
          <defs>
            <radialGradient id="ao-space" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.20" />
              <stop offset="45%" stopColor="var(--brand)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--bg)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ao-sun" cx="42%" cy="38%" r="70%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="35%" stopColor="var(--brand-bright)" />
              <stop offset="100%" stopColor="var(--brand)" />
            </radialGradient>
            <radialGradient id="ao-sun-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand-bright)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--brand-bright)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ao-badge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--surface)" />
              <stop offset="100%" stopColor="var(--bg)" />
            </linearGradient>
            <filter id="ao-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="ao-soft" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* nebula background glow */}
          <circle cx={C} cy={C} r={C} fill="url(#ao-space)" />

          {/* starfield */}
          {STARS.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i % 5 === 0 ? 1.6 : 1}
              fill="#fff"
              opacity={i % 3 === 0 ? 0.35 : 0.18}
            />
          ))}

          {/* orbit rings */}
          {RINGS.map((r) => (
            <circle
              key={r.key}
              cx={C}
              cy={C}
              r={r.radius}
              fill="none"
              stroke="rgba(255,255,255,0.09)"
              strokeWidth={1}
            />
          ))}

          {/* slowly rotating dashed accent ring */}
          <circle
            cx={C}
            cy={C}
            r={196}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.25}
            strokeWidth={1}
            strokeDasharray="2 12"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${C} ${C}`}
              to={`360 ${C} ${C}`}
              dur="90s"
              repeatCount="indefinite"
            />
          </circle>

          {/* sun */}
          <circle cx={C} cy={C} r={40} fill="url(#ao-sun-halo)" filter="url(#ao-soft)">
            <animate attributeName="r" values="36;46;36" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx={C} cy={C} r={20} fill="url(#ao-sun)" filter="url(#ao-glow)" />
          <circle
            cx={C}
            cy={C}
            r={20}
            fill="none"
            stroke="#fff"
            strokeOpacity={0.5}
            strokeWidth={1}
          />

          {/* orbiting badges: live number + unit label */}
          {RINGS.map((ring) => (
            <g
              key={ring.key}
              ref={(el) => {
                badgeRefs.current[ring.key] = el;
              }}
              transform={`translate(${C} ${C - ring.radius})`}
            >
              {/* coloured glow halo */}
              <circle r={20} fill={ring.color} opacity={0.22} filter="url(#ao-soft)" />
              <circle
                r={17}
                fill="url(#ao-badge)"
                stroke={ring.color}
                strokeWidth={1.5}
              />
              <text
                ref={(el) => {
                  numRefs.current[ring.key] = el;
                }}
                textAnchor="middle"
                y={-1}
                className="fill-white"
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                0
              </text>
              <text
                textAnchor="middle"
                y={10}
                style={{ fontSize: 7, fill: ring.color, letterSpacing: 0.3 }}
              >
                {ring.unit}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* exact live readout */}
      <p className="mt-4 text-center font-display text-2xl font-light text-white tabular-nums">
        {readout.years}
        <span className="text-base text-[var(--muted)]"> yrs </span>
        {readout.days}
        <span className="text-base text-[var(--muted)]"> days </span>
        <span className="text-[var(--brand-bright)]">
          {pad(readout.hh)}:{pad(readout.mm)}:{pad(readout.ss)}
        </span>
      </p>
    </div>
  );
}
