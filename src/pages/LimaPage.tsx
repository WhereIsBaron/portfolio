import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useReveal } from '@/hooks/useReveal';

/**
 * LimaPage — a concept marketing site for Lima Consulting, a specialist
 * risk, compliance and finance advisory and training firm in Botswana.
 *
 * This is an independent concept built by Andrew Langeveldt to demonstrate
 * a possible direction for the firm's website. It is NOT the firm's official
 * site and is not affiliated with it. Real named principals are shown by name
 * and role only (no invented portraits); photography is generic architectural
 * atmosphere; no business statistics, testimonials or client logos are invented.
 *
 * Art direction: the "editorial report" direction from the design-taste-frontend
 * skill — the page is laid out like one of Lima's own well set advisory reports,
 * on a strict column axis, with solid colour blocks and a single deep green accent.
 * Type and the stone editorial language are kept from the portfolio brand
 * (Fraunces display, Schibsted Grotesk text); the green accent is Lima's own.
 */

const styles = `
.lima {
  --l-paper: #e9e7e0;
  --l-surface: #e2dfd6;
  --l-band: #dcd9cf;
  --l-ink: #1b1c18;
  --l-invert: #15171a;
  --l-text: #23251e;
  --l-muted: #5d6056;
  --l-line: #c4c1b6;
  --l-accent: #1f6f58;
  --l-accent-ink: #f4f2ea;
  --l-accent-soft: rgba(31, 111, 88, 0.1);
  --l-on-invert: #eceae1;
  --l-on-invert-muted: #9fa096;
  --l-accent-bright: #5ec2a0;
  background-color: var(--l-paper);
  color: var(--l-text);
  font-family: 'Schibsted Grotesk', system-ui, -apple-system, sans-serif;
  letter-spacing: -0.01em;
}
.lima ::selection { background: rgba(31, 111, 88, 0.22); color: var(--l-ink); }
.lima .l-shutter {
  animation: limaShutter 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.lima .l-shutter img { animation: limaShutterImg 1.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes limaShutter {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}
@keyframes limaShutterImg {
  from { transform: scale(1.12); }
  to { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .lima .l-shutter, .lima .l-shutter img { animation: none; }
}
`;

/* Generic architectural atmosphere — one grayscale treatment across the page.
   Served by picsum.photos (Unsplash licence). Never stands in for the firm's
   own people, offices or work. Listed in the handover notes so they can be
   swapped for the firm's own photography. */
const PHOTO = {
  roof: 'https://picsum.photos/id/331/1400/1600?grayscale',
  bridge: 'https://picsum.photos/id/620/1400/1200?grayscale',
  stair: 'https://picsum.photos/id/954/1200/1500?grayscale',
  tower: 'https://picsum.photos/id/693/1200/1400?grayscale',
};

const services = [
  {
    name: 'Risk management',
    line: 'See the exposures before they find you.',
    body: 'We build risk frameworks organisations actually use: a living risk register, clear ownership, and controls sized to the risks that matter, not a binder that sits on a shelf.',
    items: ['Enterprise risk frameworks', 'Risk registers and appetite', 'Control design and testing', 'Board and committee reporting'],
  },
  {
    name: 'Compliance',
    line: 'Meet the standard, and prove it.',
    body: 'We map every obligation to an owner and a review date, align you to local regulation and global standards, and leave you with evidence that holds up when someone asks.',
    items: ['Obligations mapping', 'Regulatory and AML compliance', 'Policy and procedure design', 'Compliance monitoring'],
  },
  {
    name: 'Finance',
    line: 'Numbers you can stand behind.',
    body: 'Practical finance work that builds lasting capability: month end you can trust, independent review where it counts, and reporting that tells the real story to the people who decide.',
    items: ['Financial controls and review', 'Management reporting', 'Budgeting and forecasting', 'Finance capability building'],
  },
  {
    name: 'Training',
    line: 'Capability that stays after we leave.',
    body: 'We train your people so the controls hold without us in the room: governance, risk, compliance and AML, delivered in plain language and grounded in your own work.',
    items: ['Governance and risk training', 'AML and compliance workshops', 'Finance for non finance staff', 'Tailored in house programmes'],
  },
];

const checkQuestions = [
  { q: 'Do you have a current risk register approved by the board?', practice: 'Risk management' },
  { q: 'Is every compliance obligation mapped to an owner and a review date?', practice: 'Compliance' },
  { q: 'Do your month end financial controls include an independent review?', practice: 'Finance' },
  { q: 'Has your team had governance or AML training in the last 12 months?', practice: 'Training' },
  { q: 'Would your controls hold up to an external audit tomorrow?', practice: 'Risk management' },
];

const faqs = [
  {
    q: 'Do you work with smaller organisations?',
    a: 'Yes. Much of our work is with lean teams that need senior judgement without a large firm around it. You work directly with the principals, start to finish.',
  },
  {
    q: 'How do you price an engagement?',
    a: 'By the scope of the work, agreed up front, not by the hour against an open ended retainer. You know what you are paying for and what you will have at the end.',
  },
  {
    q: 'Which standards do you align to?',
    a: 'Global best practice, applied to Botswana. ISO 31000 for risk, King IV for governance, IFRS for reporting, and the local regulatory and AML regime your sector sits under.',
  },
  {
    q: 'Can you train our team as well as advise?',
    a: 'Training is half of what we do. We would rather leave you able to run the controls yourselves than make you depend on us to keep them standing.',
  },
  {
    q: 'Do you work on site?',
    a: 'Where it helps. We are based in Gaborone and work across Botswana, on site for the parts that need us in the room and remotely for the rest.',
  },
];

const principals = [
  { initials: 'BM', name: 'Bupelo Moalusi', role: 'Founder and principal advisor' },
  { initials: 'NM', name: 'Naomi Maswibilili', role: 'Advisor, risk and compliance' },
];

const frameworks = ['ISO 31000', 'King IV', 'IFRS', 'Basel principles', 'FATF and AML', 'Botswana regulation'];

function ReadinessCheck() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const answered = Object.keys(answers).length;
  const yes = Object.values(answers).filter(Boolean).length;

  const result = useMemo(() => {
    if (answered < checkQuestions.length) return null;
    const gaps = checkQuestions.filter((_, i) => !answers[i]);
    const band =
      yes >= 4
        ? { label: 'Well controlled', note: 'A strong base. There is usually still room to sharpen reporting and evidence.' }
        : yes >= 2
        ? { label: 'Some gaps', note: 'The bones are there, but the exposures in the gaps are where audits and regulators look first.' }
        : { label: 'High exposure', note: 'Several core controls are missing. This is the work we do first, and fastest.' };
    const focusName = gaps[0]?.practice ?? 'Risk management';
    return { band, focusName, gaps: gaps.length };
  }, [answered, yes, answers]);

  const pct = Math.round((yes / checkQuestions.length) * 100);

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
      <ol className="space-y-3">
        {checkQuestions.map((item, i) => {
          const val = answers[i];
          return (
            <li
              key={i}
              className="flex flex-col gap-3 bg-[var(--l-surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="max-w-[46ch] text-[17px] leading-snug text-[var(--l-ink)]">{item.q}</span>
              <div className="flex shrink-0 gap-2" role="group" aria-label={item.q}>
                {[true, false].map((opt) => (
                  <button
                    key={String(opt)}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [i]: opt }))}
                    aria-pressed={val === opt}
                    className={`min-w-[64px] px-4 py-2 text-sm font-medium transition-colors ${
                      val === opt
                        ? 'bg-[var(--l-ink)] text-[var(--l-paper)]'
                        : 'bg-[var(--l-band)] text-[var(--l-muted)] hover:text-[var(--l-ink)]'
                    }`}
                  >
                    {opt ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col justify-between bg-[var(--l-invert)] p-7 text-[var(--l-on-invert)]">
        <div>
          <p className="text-[13px] uppercase tracking-[0.14em] text-[var(--l-on-invert-muted)]">Your reading</p>
          <div className="mt-5 h-2 w-full bg-white/10">
            <div
              className="h-full bg-[var(--l-accent-bright)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--l-on-invert-muted)]">
            {answered} of {checkQuestions.length} answered
          </p>

          {result ? (
            <div className="mt-7">
              <p className="font-display text-4xl font-medium leading-tight text-[var(--l-on-invert)]">
                {result.band.label}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--l-on-invert-muted)]">{result.band.note}</p>
              <p className="mt-5 text-[15px] leading-relaxed text-[var(--l-on-invert)]">
                Where we would start with you:{' '}
                <span className="font-medium text-[var(--l-accent-bright)]">{result.focusName}</span>.
              </p>
            </div>
          ) : (
            <p className="mt-7 text-[15px] leading-relaxed text-[var(--l-on-invert-muted)]">
              Answer the five questions and we will show you, roughly, where your control environment stands and where
              we would start.
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center gap-4">
          <a
            href="#talk"
            className="group inline-flex items-center gap-2 bg-[var(--l-accent)] px-5 py-3 text-sm font-medium text-[var(--l-accent-ink)] transition-opacity hover:opacity-90"
          >
            Talk through your reading
            <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          {answered > 0 && (
            <button
              type="button"
              onClick={() => setAnswers({})}
              className="text-sm text-[var(--l-on-invert-muted)] underline-offset-4 hover:text-[var(--l-on-invert)] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LimaPage() {
  usePageTitle('Lima Consulting (concept)');
  useReveal([]);

  const navLinks = [
    { label: 'Services', href: '#services' },
    { label: 'Approach', href: '#approach' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#talk' },
  ];

  return (
    <div className="lima min-h-screen">
      <style>{styles}</style>

      {/* Concept marker — honest about what this is */}
      <div className="bg-[var(--l-invert)] text-[var(--l-on-invert)]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-[13px] sm:px-6">
          <span className="text-[var(--l-on-invert-muted)]">
            Concept website, proposed for Lima Consulting by Andrew Langeveldt
          </span>
          <Link to="/" className="inline-flex items-center gap-1.5 text-[var(--l-on-invert)] underline-offset-4 hover:underline">
            Back to portfolio <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Hero: two by two board ─────────────────────────────── */}
      <header className="px-2 pt-2">
        <div className="mx-auto max-w-[1600px]">
          {/* nav row */}
          <nav className="flex items-stretch gap-2 pb-2">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-[var(--l-ink)] font-display text-2xl font-semibold text-[var(--l-paper)]">
              L
            </span>
            <div className="flex flex-1 items-center gap-6 bg-[var(--l-surface)] px-5 text-[15px]">
              {navLinks.map((l) => (
                <a key={l.label} href={l.href} className="hidden text-[var(--l-muted)] hover:text-[var(--l-ink)] sm:inline">
                  {l.label}
                </a>
              ))}
              <span className="font-display text-lg font-medium text-[var(--l-ink)] sm:hidden">Lima Consulting</span>
            </div>
            <a
              href="#talk"
              className="flex shrink-0 items-center bg-[var(--l-ink)] px-5 text-[15px] font-medium text-[var(--l-paper)] transition-opacity hover:opacity-90"
            >
              Talk to Lima
            </a>
          </nav>

          {/* board */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* name tile */}
            <div className="flex min-h-[200px] items-end bg-[var(--l-paper)] sm:min-h-[300px]">
              <h1 className="font-display font-medium leading-[0.82] tracking-[-0.05em] text-[var(--l-ink)]"
                  style={{ fontSize: 'clamp(84px, 13vw, 190px)' }}>
                Lima
              </h1>
            </div>
            {/* photo tile */}
            <div className="l-shutter relative min-h-[200px] overflow-hidden bg-[var(--l-band)] sm:min-h-[300px]">
              <img
                src={PHOTO.roof}
                alt="Steel framed roof structure"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            {/* second photo */}
            <div className="relative hidden min-h-[240px] overflow-hidden bg-[var(--l-band)] sm:block">
              <img src={PHOTO.bridge} alt="Arched bridge spanning water" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            </div>
            {/* statements split */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex min-h-[160px] items-start bg-[var(--l-invert)] p-6 sm:min-h-[240px]">
                <p className="text-[clamp(18px,1.6vw,24px)] leading-snug text-[var(--l-on-invert)]">
                  Risk, compliance and finance advisory for organisations across Botswana.
                </p>
              </div>
              <div className="flex min-h-[160px] items-start bg-[var(--l-accent)] p-6 sm:min-h-[240px]">
                <p className="text-[clamp(18px,1.6vw,24px)] leading-snug text-[var(--l-accent-ink)]">
                  Work that holds up to scrutiny.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Intro: right half paragraph, lone photo ────────────── */}
      <section className="px-4 py-28 sm:px-6 sm:py-40">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <div className="w-[62%] max-w-[300px] overflow-hidden lg:w-[80%]">
              <img src={PHOTO.stair} alt="Light stairwell within a white building" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <p className="reveal mt-10 max-w-[200px] text-[14px] leading-relaxed text-[var(--l-muted)]">
              A specialist firm, deliberately small, so the people who scope your work are the people who do it.
            </p>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-7">
            <p className="reveal text-[clamp(23px,2.3vw,34px)] leading-[1.3] text-[var(--l-ink)]"
               style={{ textIndent: '2.5em' }}>
              Lima Consulting advises and trains organisations on risk, compliance and finance. We pair global best
              practice with a grounded reading of Botswana's regulatory environment, and we work until the controls are
              real, understood by your people, and able to hold up when someone looks closely.
            </p>
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────── */}
      <section id="services" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="reveal flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <h2 className="font-display text-[clamp(36px,4vw,60px)] font-medium leading-[1.05]">
              <span className="text-[var(--l-muted)]">Four practices,</span>
              <br />
              <span className="text-[var(--l-ink)]">one standard of work.</span>
            </h2>
            <a
              href="#talk"
              className="group inline-flex w-fit items-center gap-2 bg-[var(--l-ink)] px-5 py-3 text-sm font-medium text-[var(--l-paper)] transition-opacity hover:opacity-90"
            >
              Start a conversation
              <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="mt-14 flex flex-col gap-2">
            {services.map((s, i) => (
              <div
                key={s.name}
                className="reveal grid grid-cols-1 gap-6 p-7 sm:p-9 lg:grid-cols-12 lg:gap-8"
                style={{ background: i % 2 === 0 ? 'var(--l-surface)' : 'var(--l-band)' }}
              >
                <div className="lg:col-span-4">
                  <h3 className="font-display text-[26px] font-medium text-[var(--l-ink)]">{s.name}</h3>
                  <p className="mt-2 text-[17px] leading-snug text-[var(--l-accent)]">{s.line}</p>
                </div>
                <p className="text-[16px] leading-relaxed text-[var(--l-muted)] lg:col-span-5">{s.body}</p>
                <ul className="space-y-1.5 text-[15px] text-[var(--l-ink)] lg:col-span-3">
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Readiness check (the live thing) ───────────────────── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <h2 className="reveal max-w-[18ch] font-display text-[clamp(32px,3.6vw,52px)] font-medium leading-[1.05] text-[var(--l-ink)]">
            A quick read on your control environment.
          </h2>
          <p className="reveal mt-5 max-w-[52ch] text-[17px] leading-relaxed text-[var(--l-muted)]">
            Five questions we would ask in a first meeting. Answer honestly and see, roughly, where you stand and where
            we would start.
          </p>
          <ReadinessCheck />
        </div>
      </section>

      {/* ── Approach: lines that step across ───────────────────── */}
      <section id="approach" className="px-4 py-28 sm:px-6 sm:py-40">
        <div className="mx-auto max-w-[1600px]">
          {[
            { line: 'First, we assess.', note: 'We look at what you actually do, not what the policy says, and find the exposures that matter.' },
            { line: 'Then we design the controls.', note: 'Controls sized to the risk and to your team, mapped to the standards your sector answers to.' },
            { line: 'We embed them with your people.', note: 'Owners, review dates and evidence, so the controls run without us standing over them.' },
            { line: 'And we train, so it holds.', note: 'Your people leave able to run and defend the controls themselves, long after we have gone.' },
          ].map((step, i) => (
            <div
              key={step.line}
              className="reveal mb-14 sm:mb-16"
              style={{ marginLeft: `min(${i * 8}vw, ${i * 90}px)` }}
            >
              <p
                className={`font-display font-medium leading-[1.0] ${
                  i === 3 ? 'text-[var(--l-accent)]' : 'text-[var(--l-ink)]'
                }`}
                style={{ fontSize: 'clamp(34px, 4.6vw, 76px)' }}
              >
                {step.line}
              </p>
              <p className="mt-3 max-w-[34ch] text-[17px] leading-relaxed text-[var(--l-muted)]">{step.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── About: side facts, wide paragraph, principals ──────── */}
      <section id="about" className="bg-[var(--l-surface)] px-4 py-28 sm:px-6 sm:py-36">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <dl className="space-y-6">
                {[
                  ['Based in', 'Gaborone, Botswana'],
                  ['Works across', 'Public, private and NGO sectors'],
                  ['Team', 'Two senior advisors, hands on'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[13px] uppercase tracking-[0.12em] text-[var(--l-muted)]">{k}</dt>
                    <dd className="mt-1 text-[18px] text-[var(--l-ink)]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="lg:col-span-8">
              <p className="reveal max-w-[60ch] text-[clamp(20px,1.8vw,26px)] leading-[1.4] text-[var(--l-ink)]">
                Lima is small on purpose. The same senior people scope the work, do the work, and sit across the table
                from your board. That is the point of us: judgement you can reach directly, grounded in Botswana, held to
                a global standard.
              </p>

              <div className="mt-12 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {principals.map((p) => (
                  <div key={p.name} className="flex items-center gap-4 bg-[var(--l-paper)] p-5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-[var(--l-ink)] font-display text-xl font-semibold text-[var(--l-paper)]">
                      {p.initials}
                    </span>
                    <span>
                      <span className="block text-[17px] font-medium text-[var(--l-ink)]">{p.name}</span>
                      <span className="block text-[14px] text-[var(--l-muted)]">{p.role}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <p className="text-[13px] uppercase tracking-[0.12em] text-[var(--l-muted)]">We work to</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {frameworks.map((f) => (
                    <span key={f} className="bg-[var(--l-band)] px-4 py-2 text-[15px] text-[var(--l-ink)]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ: large questions, answers beside ───────────────── */}
      <section className="px-4 py-28 sm:px-6 sm:py-36">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid grid-cols-1 gap-x-10 gap-y-16 lg:grid-cols-12">
            <h2 className="font-display text-[clamp(26px,2.6vw,40px)] font-medium leading-tight text-[var(--l-muted)] lg:col-span-6">
              Questions we are asked.
            </h2>
            <div className="hidden lg:col-span-6 lg:block" />
            {faqs.map((f) => (
              <div key={f.q} className="contents">
                <h3 className="reveal font-display text-[clamp(26px,2.6vw,40px)] font-medium leading-[1.1] text-[var(--l-ink)] lg:col-span-6">
                  {f.q}
                </h3>
                <p className="reveal max-w-[42ch] text-[17px] leading-relaxed text-[var(--l-muted)] lg:col-span-6">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA: the idea again, inverted ──────────────────────── */}
      <section className="bg-[var(--l-invert)] px-4 py-28 sm:px-6 sm:py-40">
        <div className="mx-auto flex min-h-[60svh] max-w-[1600px] flex-col justify-between gap-16">
          <h2 className="max-w-[16ch] font-display font-medium leading-[0.92] text-[var(--l-on-invert)]"
              style={{ fontSize: 'clamp(44px, 9vw, 150px)' }}>
            Build controls that hold.
          </h2>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[40ch] text-[18px] leading-relaxed text-[var(--l-on-invert-muted)]">
              Tell us where your organisation stands today. We will tell you, plainly, what we would do about it.
            </p>
            <a
              href="#talk"
              className="group inline-flex w-fit shrink-0 items-center gap-2 bg-[var(--l-accent)] px-7 py-4 text-[16px] font-medium text-[var(--l-accent-ink)] transition-opacity hover:opacity-90"
            >
              Talk to Lima
              <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────── */}
      <section id="talk" className="px-4 py-28 sm:px-6 sm:py-36">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-start gap-12 lg:grid-cols-12">
          <p className="font-display text-[clamp(26px,3vw,44px)] font-medium leading-[1.1] text-[var(--l-ink)] lg:col-span-5">
            Risk, compliance or finance, we would be glad to hear what you are weighing.
          </p>
          <div className="hidden lg:col-span-3 lg:block">
            <div className="w-[170px] overflow-hidden">
              <img src={PHOTO.tower} alt="Structure rising above the landscape" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[18px] font-medium text-[var(--l-ink)]">Start a conversation</p>
            <div className="mt-4 flex flex-col gap-2 text-[18px]">
              <a
                href="https://www.limaconsulting.co.bw/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-[var(--l-accent)] underline underline-offset-4 hover:opacity-80"
              >
                limaconsulting.co.bw <ArrowUpRight size={15} />
              </a>
              <span className="text-[var(--l-ink)]">hello@limaconsulting.co.bw</span>
            </div>
            <p className="mt-4 text-[14px] text-[var(--l-muted)]">Gaborone, Botswana · replies within two business days</p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-[var(--l-invert)] px-4 pt-20 pb-10 text-[var(--l-on-invert)] sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <p className="font-display font-medium leading-[0.9] text-[var(--l-on-invert)]"
             style={{ fontSize: 'clamp(48px, 14vw, 220px)' }}>
            Lima Consulting
          </p>

          <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1 text-[18px]">
              <a href="https://www.limaconsulting.co.bw/" target="_blank" rel="noreferrer" className="w-fit text-[var(--l-accent-bright)] hover:opacity-80">
                limaconsulting.co.bw
              </a>
              <span className="text-[var(--l-on-invert-muted)]">Gaborone, Botswana</span>
            </div>
            <div className="flex flex-col gap-1.5 text-[15px] text-[var(--l-on-invert-muted)]">
              <a href="#services" className="w-fit hover:text-[var(--l-on-invert)]">Services</a>
              <a href="#approach" className="w-fit hover:text-[var(--l-on-invert)]">Approach</a>
              <a href="#about" className="w-fit hover:text-[var(--l-on-invert)]">About</a>
              <a href="#talk" className="w-fit hover:text-[var(--l-on-invert)]">Contact</a>
            </div>
            <div className="text-[15px] leading-relaxed text-[var(--l-on-invert-muted)] sm:col-span-2 lg:col-span-2">
              <p>
                This is an independent concept website built by{' '}
                <Link to="/" className="text-[var(--l-accent-bright)] hover:opacity-80">Andrew Langeveldt</Link>{' '}
                to show a possible direction for Lima Consulting. It is not the firm's official site and is not affiliated
                with it. Content is illustrative; the firm's real site is{' '}
                <a href="https://www.limaconsulting.co.bw/" target="_blank" rel="noreferrer" className="text-[var(--l-accent-bright)] hover:opacity-80">
                  limaconsulting.co.bw
                </a>.
              </p>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-2 text-[13px] text-[var(--l-on-invert-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>Concept and build by Andrew Langeveldt, 2026.</span>
            <a href="#top" className="w-fit hover:text-[var(--l-on-invert)]">Back to top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
