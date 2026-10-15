import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { profile, projects, skillGroups, education } from '@/data/cv';
import { toTicket } from '@/lib/ticket';

type Line = { id: number; node: ReactNode };

const PROMPT = 'guest@andrew:~$';

// Commands listed by `help` and shown as tappable chips. Easter eggs (sudo,
// ping, …) are deliberately left out of both.
const COMMANDS: { name: string; about: string }[] = [
  { name: 'help', about: 'list available commands' },
  { name: 'whoami', about: 'who I am, in one screen' },
  { name: 'projects', about: 'everything I’ve built (try: projects 2, projects --stack react)' },
  { name: 'cv', about: 'open my printable CV' },
  { name: 'skills', about: 'languages, frameworks & tools' },
  { name: 'education', about: 'degrees' },
  { name: 'contact', about: 'how to reach me' },
  { name: 'clear', about: 'clear the screen' },
];

// Inside the terminal the window stays dark in both themes, so pin the
// palette tokens it reads to their dark values.
const darkTokens = {
  '--muted': '#9aa4b2',
  '--brand-bright': '#6cd0cf',
  '--accent': '#e0b25c',
} as CSSProperties;

const muted = 'text-[var(--muted)]';
const hl = 'text-[var(--brand-bright)]';

function TermLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith('http');
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={`${hl} underline-offset-2 hover:underline`}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={`${hl} underline-offset-2 hover:underline`}
    >
      {children}
    </a>
  );
}

function run(input: string): ReactNode | 'clear' {
  const [cmd = '', ...args] = input.trim().split(/\s+/);
  switch (cmd.toLowerCase()) {
    case '':
      return null;
    case 'help':
      return (
        <div>
          {COMMANDS.map((c) => (
            <div key={c.name} className="flex gap-3">
              <span className={`${hl} w-20 shrink-0`}>{c.name}</span>
              <span className={muted}>{c.about}</span>
            </div>
          ))}
          <div className={`mt-2 ${muted}`}>Tip: ↑/↓ for history, Tab to autocomplete. There may be a few hidden ones.</div>
        </div>
      );
    case 'whoami':
      return (
        <div>
          <div className="text-white">{profile.name}</div>
          <div className={hl}>{profile.title}</div>
          <div className={`mt-1 ${muted}`}>{profile.tagline}</div>
          <div className={`mt-1 ${muted}`}>
            📍 {profile.location} · {profile.availability}
          </div>
        </div>
      );
    case 'projects': {
      if (args[0] === '--stack') {
        const term = args.slice(1).join(' ').toLowerCase();
        if (!term) {
          const all = Array.from(new Set(projects.flatMap((p) => p.tags))).sort((a, b) => a.localeCompare(b));
          return (
            <div>
              <div className={muted}>usage: projects --stack &lt;tech&gt;. Known stacks:</div>
              <div className={hl}>{all.join(', ')}</div>
            </div>
          );
        }
        const hits = projects
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => p.tags.some((t) => t.toLowerCase().includes(term)));
        if (!hits.length) {
          return <span className={muted}>no projects match “{term}”. Try <span className={hl}>projects --stack</span> for the list.</span>;
        }
        return (
          <div>
            {hits.map(({ p, i }) => (
              <div key={p.name} className="flex gap-3">
                <span className={`${muted} w-6 shrink-0 text-right`}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="text-white">{p.name}</span>{' '}
                  <span className={muted}>({p.tags.filter((t) => t.toLowerCase().includes(term)).join(', ')})</span>
                </span>
              </div>
            ))}
            <div className={`mt-2 ${muted}`}>
              {hits.length} match{hits.length > 1 ? 'es' : ''}. Run <span className={hl}>projects &lt;n&gt;</span> for details.
            </div>
          </div>
        );
      }
      const n = Number(args[0]);
      if (args[0] && Number.isInteger(n) && n >= 1 && n <= projects.length) {
        const p = projects[n - 1];
        const t = toTicket(p);
        return (
          <div>
            <div>
              <span className={muted}>#{t.id}</span> <span className="text-emerald-400">[{t.status}]</span>{' '}
              <span className="text-white">{p.name}</span>
            </div>
            <div className={muted}>
              {p.category} · {p.year}
            </div>
            <div className={`mt-1 ${muted}`}>{t.resolution}</div>
            <div className={`mt-1 ${hl}`}>stack: {t.stack.join(', ')}</div>
            {p.route && (
              <div className="mt-1">
                → <TermLink href={p.route}>open the live demo</TermLink>
              </div>
            )}
            {p.link && p.link !== '#' && (
              <div className="mt-1">
                → <TermLink href={p.link}>{p.link}</TermLink>
              </div>
            )}
          </div>
        );
      }
      return (
        <div>
          {projects.map((p, i) => (
            <div key={p.name} className="flex gap-3">
              <span className={`${muted} w-6 shrink-0 text-right`}>{i + 1}</span>
              <span className="min-w-0">
                <span className="text-white">{p.name}</span>{' '}
                <span className={muted}>
                  ({p.category}, {p.year})
                </span>
              </span>
            </div>
          ))}
          <div className={`mt-2 ${muted}`}>
            Run <span className={hl}>projects &lt;n&gt;</span> for details, or{' '}
            <TermLink href="#work">scroll to the ticket board</TermLink>.
          </div>
        </div>
      );
    }
    case 'skills':
      return (
        <div className="space-y-1">
          {skillGroups.map((g) => (
            <div key={g.category}>
              <span className={hl}>{g.category}:</span> <span className={muted}>{g.items.join(', ')}</span>
            </div>
          ))}
        </div>
      );
    case 'education':
      return (
        <div className="space-y-1">
          {education.map((e) => (
            <div key={e.degree}>
              <div className="text-white">{e.degree}</div>
              <div className={muted}>
                {e.institution} · {e.period} · {e.status}
              </div>
            </div>
          ))}
        </div>
      );
    case 'contact':
      return (
        <div>
          <div>
            <span className={`${muted} inline-block w-20`}>email</span>
            <TermLink href={`mailto:${profile.email}`}>{profile.email}</TermLink>
          </div>
          <div>
            <span className={`${muted} inline-block w-20`}>phone</span>
            <TermLink href={`tel:${profile.phone.replace(/\s/g, '')}`}>{profile.phone}</TermLink>
          </div>
          {profile.socials.map((s) => (
            <div key={s.label}>
              <span className={`${muted} inline-block w-20`}>{s.label.toLowerCase()}</span>
              <TermLink href={s.href}>{s.href.replace(/^https?:\/\/(www\.)?/, '')}</TermLink>
            </div>
          ))}
          <div className={`mt-1 ${muted}`}>
            Or use the <TermLink href="#contact">contact form</TermLink>.
          </div>
        </div>
      );
    case 'cv':
      return (
        <span>
          → <TermLink href={profile.resumeUrl}>open the printable CV</TermLink>{' '}
          <span className={muted}>(use “Save as PDF” to download)</span>
        </span>
      );
    case 'clear':
      return 'clear';
    // ── easter eggs ──
    case 'sudo':
      return <span className="text-[var(--accent)]">guest is not in the sudoers file. This incident will be reported. 🚨</span>;
    case 'ping': {
      const host = args[0] || 'andrew';
      const ms = () => (8 + Math.random() * 20).toFixed(1);
      return (
        <div className={muted}>
          <div>PING {host}: 56 data bytes</div>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              64 bytes from {host}: icmp_seq={i} time={ms()} ms
            </div>
          ))}
          <div className={hl}>{host} is up and available for work.</div>
        </div>
      );
    }
    case 'ls':
      return <span className={muted}>{COMMANDS.map((c) => c.name).join('  ')}</span>;
    case 'exit':
      return <span className={muted}>There is no escape. Try <span className={hl}>contact</span> instead.</span>;
    case 'hire':
      return (
        <span>
          Excellent choice. → <TermLink href={`mailto:${profile.email}`}>{profile.email}</TermLink>
        </span>
      );
    default:
      return (
        <span className={muted}>
          command not found: {cmd}. Type <span className={hl}>help</span>.
        </span>
      );
  }
}

export default function Terminal() {
  const nextId = useRef(0);
  const makeLine = (node: ReactNode): Line => ({ id: nextId.current++, node });

  const [lines, setLines] = useState<Line[]>(() => [
    makeLine(
      <span className={muted}>
        Welcome! Type <span className={hl}>help</span> to get started, or tap a command below.
      </span>
    ),
  ]);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null); // index into history while browsing
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the newest output in view without scrolling the page itself.
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const execute = (raw: string) => {
    const input = raw.trim();
    const result = run(input);
    if (input) setHistory((h) => (h[h.length - 1] === input ? h : [...h, input]));
    setCursor(null);
    setValue('');
    if (result === 'clear') {
      setLines([]);
      return;
    }
    const echo = makeLine(
      <span>
        <span className={hl}>{PROMPT}</span> <span className="text-white">{input}</span>
      </span>
    );
    setLines((ls) => (result ? [...ls, echo, makeLine(result)] : [...ls, echo]));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      execute(value);
    } else if (e.key === 'ArrowUp') {
      if (!history.length) return;
      e.preventDefault();
      const i = cursor === null ? history.length - 1 : Math.max(cursor - 1, 0);
      setCursor(i);
      setValue(history[i]);
    } else if (e.key === 'ArrowDown') {
      if (cursor === null) return;
      e.preventDefault();
      const i = cursor + 1;
      if (i >= history.length) {
        setCursor(null);
        setValue('');
      } else {
        setCursor(i);
        setValue(history[i]);
      }
    } else if (e.key === 'Tab') {
      const partial = value.trim().toLowerCase();
      if (!partial || partial.includes(' ')) return;
      const match = COMMANDS.map((c) => c.name).filter((n) => n.startsWith(partial));
      if (match.length === 1) {
        e.preventDefault(); // only trap Tab when it completes something, so focus can still leave
        setValue(match[0] + ' ');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <section id="terminal" className="relative px-4 py-24 sm:px-5">
      <div className="mx-auto max-w-6xl border-t border-[var(--border)] pt-6">
        <p className="reveal mb-12 text-[13px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Terminal
        </p>

        <h2 className="reveal mb-10 max-w-2xl font-display text-4xl font-medium leading-tight text-[var(--ink)] sm:text-5xl">
          Prefer the command line? Ask me anything.
        </h2>

        <div className="reveal mx-auto max-w-3xl">
          <div
            className="preserve-dark overflow-hidden rounded-xl border border-[var(--border)] bg-[#0e1117]"
            style={darkTokens}
          >
            {/* window bar */}
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              <span className="ml-3 text-xs text-[var(--muted)]">andrew — zsh</span>
            </div>

            {/* output — clicking it (outside a link) focuses the prompt */}
            <div
              ref={outputRef}
              role="log"
              aria-live="polite"
              aria-label="Terminal output"
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('a') && !window.getSelection()?.toString()) {
                  inputRef.current?.focus({ preventScroll: true });
                }
              }}
              className="h-80 overflow-y-auto break-words p-4 font-mono text-[13px] leading-relaxed text-white sm:h-96 sm:p-5"
            >
              {lines.map((l) => (
                <div key={l.id} className="mb-1.5">
                  {l.node}
                </div>
              ))}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  execute(value);
                }}
                className="flex items-center gap-2"
              >
                <label htmlFor="terminal-input" className={`${hl} shrink-0`}>
                  <span className="hidden sm:inline">{PROMPT}</span>
                  <span className="sm:hidden">$</span>
                </label>
                <input
                  id="terminal-input"
                  ref={inputRef}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setCursor(null);
                  }}
                  onKeyDown={onKeyDown}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  aria-label="Terminal command"
                  className="min-w-0 flex-1 bg-transparent font-mono text-base text-white caret-[var(--brand-bright)] outline-none sm:text-[13px]"
                />
              </form>
            </div>

            {/* tappable commands — the touch-friendly way in, handy with a mouse too */}
            <div className="flex flex-wrap gap-2 border-t border-white/5 px-4 py-3">
              {COMMANDS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => execute(c.name)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-[var(--muted)] transition-colors hover:border-[var(--brand-bright)]/60 hover:text-white focus-visible:border-[var(--brand-bright)] focus-visible:outline-none"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
