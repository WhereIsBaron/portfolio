import { ArrowDown, MapPin, Github, Linkedin } from 'lucide-react';
import { profile } from '@/data/cv';

const codeLines = [
  { t: 'const ', v: 'andrew', c: 'text-[var(--brand-bright)]' },
  { t: ' = ', v: 'engineer', c: 'text-[#e0b25c]' },
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden pt-28"
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-[var(--brand)]/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[var(--accent)]/10 blur-[120px]" />
        <div className="grain absolute inset-0 opacity-[0.04]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="reveal mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-[var(--muted)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-bright)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-bright)]" />
            </span>
            {profile.availability}
          </div>

          <p className="reveal mb-3 font-display text-lg text-[var(--muted)]">
            Hi, I’m {profile.shortName}.
          </p>
          <h1 className="reveal font-display text-5xl font-light leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            Software engineer
            <br />
            building
            <span className="italic text-[var(--brand-bright)]">
              {' '}
              real solutions
            </span>
            <br />
            across the stack.
          </h1>

          <p className="reveal mt-7 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            {profile.tagline}
          </p>

          <div className="reveal mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#work"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--brand-bright)] px-6 py-3 text-sm font-medium text-[#0b0d10] transition-all hover:bg-white"
            >
              View projects
              <ArrowDown
                size={16}
                className="transition-transform group-hover:translate-y-0.5"
              />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-white/40"
            >
              Get in touch
            </a>
          </div>

          <div className="reveal mt-8 flex flex-wrap items-center gap-5 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} className="text-[var(--brand-bright)]" />
              {profile.location}
            </span>
            <a
              href={profile.socials[0].href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-white"
            >
              <Github size={15} /> GitHub
            </a>
            <a
              href={profile.socials[1].href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-white"
            >
              <Linkedin size={15} /> LinkedIn
            </a>
          </div>
        </div>

        {/* Code window */}
        <div className="lg:col-span-5">
          <div className="reveal relative mx-auto max-w-md">
            <div className="absolute -inset-3 rounded-[2rem] border border-white/10" />
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[var(--accent)]/20 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e1117] shadow-2xl">
              {/* window bar */}
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                <span className="ml-3 text-xs text-[var(--muted)]">
                  engineer.ts
                </span>
              </div>
              {/* code */}
              <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed">
                <code className="font-mono">
                  <span className="text-[var(--muted)]">{'// Software engineer\n'}</span>
                  <span className="text-[#c678dd]">const </span>
                  <span className="text-[var(--brand-bright)]">andrew</span>
                  <span className="text-white"> = {'{'}</span>
                  {'\n'}
                  {'  '}<span className="text-[#e0b25c]">name</span>
                  <span className="text-white">: </span>
                  <span className="text-[#98c379]">'Andrew P.J. Langeveldt'</span>
                  <span className="text-white">,</span>
                  {'\n'}
                  {'  '}<span className="text-[#e0b25c]">role</span>
                  <span className="text-white">: </span>
                  <span className="text-[#98c379]">'Full-Stack Developer'</span>
                  <span className="text-white">,</span>
                  {'\n'}
                  {'  '}<span className="text-[#e0b25c]">stack</span>
                  <span className="text-white">: [</span>
                  <span className="text-[#98c379]">'React'</span>
                  <span className="text-white">, </span>
                  <span className="text-[#98c379]">'Laravel'</span>
                  <span className="text-white">, </span>
                  <span className="text-[#98c379]">'Flutter'</span>
                  <span className="text-white">,</span>
                  {'\n'}
                  {'         '}<span className="text-[#98c379]">'Motoko'</span>
                  <span className="text-white">],</span>
                  {'\n'}
                  {'  '}<span className="text-[#e0b25c]">based</span>
                  <span className="text-white">: </span>
                  <span className="text-[#98c379]">'Gaborone, Botswana'</span>
                  <span className="text-white">,</span>
                  {'\n'}
                  {'  '}<span className="text-[#e0b25c]">available</span>
                  <span className="text-white">: </span>
                  <span className="text-[#56b6c2]">true</span>
                  <span className="text-white">,</span>
                  {'\n'}
                  <span className="text-white">{'}'}</span>
                  {'\n\n'}
                  <span className="text-[#c678dd]">async function </span>
                  <span className="text-[var(--brand-bright)]">build</span>
                  <span className="text-white">({'('}</span>
                  <span className="text-[#e0b25c]">idea</span>
                  <span className="text-white">{') {'}</span>
                  {'\n'}
                  {'  '}<span className="text-[#c678dd]">return</span>
                  <span className="text-white"> await </span>
                  <span className="text-[var(--brand-bright)]">ship</span>
                  <span className="text-white">(</span>
                  <span className="text-[#e0b25c]">idea</span>
                  <span className="text-white">)</span>
                  {'\n'}
                  <span className="text-white">{'}'}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#about"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[var(--muted)] transition-colors hover:text-white lg:flex"
        aria-label="Scroll down"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white/60" />
        </span>
      </a>
    </section>
  );
}
