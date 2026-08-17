import { useEffect, useMemo, useRef } from 'react';

// Birthdate anchored to Gaborone time (UTC+2). Time defaults to 00:00.
const BIRTH_MS = Date.parse('1996-09-13T00:00:00+02:00');
const TZ = 2 * 3600000; // shift so UTC fields read as Gaborone wall-clock time

const SIZE = 570;
const C = SIZE / 2; // centre
const STAR_BOX = 460; // starfield coords were authored in a 460 box; scale to SIZE
const STAR_SCALE = SIZE / STAR_BOX;

type Key = 'sec' | 'min' | 'hour' | 'day' | 'month' | 'year';

type Ring = {
  key: Key;
  unit: string;
  radius: number;
  color: string;
};

// Inner = fast, outer = slow. Each badge's angle matches its number's value,
// like nested clock hands.
const RINGS: Ring[] = [
  { key: 'sec', unit: 'sec', radius: 60, color: 'var(--brand-bright)' },
  { key: 'min', unit: 'min', radius: 98, color: 'var(--brand-bright)' },
  { key: 'hour', unit: 'hr', radius: 136, color: 'var(--brand)' },
  { key: 'day', unit: 'days', radius: 174, color: 'var(--brand)' },
  { key: 'month', unit: 'mo', radius: 212, color: 'var(--accent)' },
  { key: 'year', unit: 'yrs', radius: 250, color: 'var(--accent)' },
];

const OUTER_RADIUS = RINGS[RINGS.length - 1].radius;

// Deterministic faint starfield for a "space" feel (spread over the 460 box).
const STARS = [
  [50, 66], [104, 34], [164, 80], [226, 28], [296, 56], [362, 44], [418, 100],
  [34, 154], [426, 184], [64, 230], [400, 258], [44, 330], [430, 330],
  [94, 396], [164, 430], [236, 408], [314, 422], [378, 392], [408, 132],
  [132, 128], [330, 118], [84, 290], [380, 316], [194, 44], [258, 430], [150, 300],
] as const;

type Breakdown = { year: number; month: number; day: number; hh: number; mm: number; ss: number };
type Frames = { values: Record<Key, number>; fracs: Record<Key, number> };

function compute(nowMs: number): Breakdown & Frames {
  const nUTC = nowMs + TZ;
  const b = new Date(BIRTH_MS + TZ);
  const n = new Date(nUTC);

  // Calendar breakdown (years / months / days / h:m:s since birth).
  let ss = n.getUTCSeconds() - b.getUTCSeconds();
  let mm = n.getUTCMinutes() - b.getUTCMinutes();
  let hh = n.getUTCHours() - b.getUTCHours();
  let day = n.getUTCDate() - b.getUTCDate();
  let month = n.getUTCMonth() - b.getUTCMonth();
  let year = n.getUTCFullYear() - b.getUTCFullYear();
  if (ss < 0) { ss += 60; mm--; }
  if (mm < 0) { mm += 60; hh--; }
  if (hh < 0) { hh += 24; day--; }
  if (day < 0) {
    const prevMonthDays = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 0)).getUTCDate();
    day += prevMonthDays;
    month--;
  }
  if (month < 0) { month += 12; year--; }

  // Continuous fractions for smooth orbit angles.
  const msOfDay = ((nUTC % 86400000) + 86400000) % 86400000;
  const secFrac = (msOfDay % 60000) / 60000;
  const minFrac = (msOfDay % 3600000) / 3600000;
  const hourFrac = msOfDay / 86400000;

  const totalMonths = year * 12 + month;
  const lastMo = Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + totalMonths, b.getUTCDate());
  const nextMo = Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + totalMonths + 1, b.getUTCDate());
  const dayFrac = (nUTC - lastMo) / (nextMo - lastMo);

  const bdThis = Date.UTC(b.getUTCFullYear() + year, b.getUTCMonth(), b.getUTCDate());
  const bdNext = Date.UTC(b.getUTCFullYear() + year + 1, b.getUTCMonth(), b.getUTCDate());
  const yearFrac = (nUTC - bdThis) / (bdNext - bdThis);

  return {
    year, month, day, hh, mm, ss,
    values: { sec: ss, min: mm, hour: hh, day, month, year },
    fracs: {
      sec: secFrac,
      min: minFrac,
      hour: hourFrac,
      day: dayFrac,
      month: yearFrac,
      // Offset half a turn so year never overlaps the month badge.
      year: (yearFrac + 0.5) % 1,
    },
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function AgeOrbit() {
  const badgeRefs = useRef<Record<string, SVGGElement | null>>({});
  const numRefs = useRef<Record<string, SVGTextElement | null>>({});
  const yrRef = useRef<HTMLSpanElement | null>(null);
  const moRef = useRef<HTMLSpanElement | null>(null);
  const dyRef = useRef<HTMLSpanElement | null>(null);
  const clockRef = useRef<HTMLSpanElement | null>(null);

  const init = useMemo(() => compute(Date.now()), []);

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
      const s = compute(nowMs);

      for (const ring of RINGS) {
        const theta = s.fracs[ring.key] * 2 * Math.PI;
        const x = C + ring.radius * Math.sin(theta);
        const y = C - ring.radius * Math.cos(theta);
        badgeRefs.current[ring.key]?.setAttribute('transform', `translate(${x} ${y})`);
        const num = numRefs.current[ring.key];
        const v = String(s.values[ring.key]);
        if (num && num.textContent !== v) num.textContent = v;
      }

      // Readout text only needs a refresh once per second (no React re-render).
      const wholeSec = Math.floor(nowMs / 1000);
      if (wholeSec !== lastSec) {
        lastSec = wholeSec;
        if (yrRef.current) yrRef.current.textContent = String(s.year);
        if (moRef.current) moRef.current.textContent = String(s.month);
        if (dyRef.current) dyRef.current.textContent = String(s.day);
        if (clockRef.current)
          clockRef.current.textContent = `${pad(s.hh)}:${pad(s.mm)}:${pad(s.ss)}`;
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
          className="h-auto w-full max-w-[460px]"
          role="img"
          aria-label={`Live age: ${init.year} years, ${init.month} months, ${init.day} days`}
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
              cx={x * STAR_SCALE}
              cy={y * STAR_SCALE}
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
            r={OUTER_RADIUS}
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
              dur="120s"
              repeatCount="indefinite"
            />
          </circle>

          {/* sun */}
          <circle cx={C} cy={C} r={28} fill="url(#ao-sun-halo)" filter="url(#ao-soft)">
            <animate attributeName="r" values="28;36;28" dur="4.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="4.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={C} cy={C} r={22} fill="url(#ao-sun)" filter="url(#ao-glow)" />
          <circle cx={C} cy={C} r={22} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1} />

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
              <circle r={21} fill={ring.color} opacity={0.22} filter="url(#ao-soft)" />
              <circle r={17.5} fill="url(#ao-badge)" stroke={ring.color} strokeWidth={1.5} />
              <text
                ref={(el) => {
                  numRefs.current[ring.key] = el;
                }}
                textAnchor="middle"
                y={0}
                className="fill-white"
                style={{ fontSize: 14, fontWeight: 700 }}
              >
                {init.values[ring.key]}
              </text>
              <text
                textAnchor="middle"
                y={11}
                style={{ fontSize: 7.5, fill: ring.color, letterSpacing: 0.3 }}
              >
                {ring.unit}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* exact live readout */}
      <p className="mt-4 text-center font-display text-xl font-light text-white tabular-nums sm:text-2xl">
        <span ref={yrRef}>{init.year}</span>
        <span className="text-sm text-[var(--muted)] sm:text-base"> yrs </span>
        <span ref={moRef}>{init.month}</span>
        <span className="text-sm text-[var(--muted)] sm:text-base"> mo </span>
        <span ref={dyRef}>{init.day}</span>
        <span className="text-sm text-[var(--muted)] sm:text-base"> d </span>
        <span ref={clockRef} className="text-[var(--brand-bright)]">
          {pad(init.hh)}:{pad(init.mm)}:{pad(init.ss)}
        </span>
      </p>
    </div>
  );
}
