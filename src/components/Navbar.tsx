import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#work' },
  { label: 'Education', href: '#education' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/5 bg-[#0b0d10]/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-white"
        >
          Andrew<span className="text-[var(--brand-bright)]">.</span>Langeveldt
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="group relative text-sm text-[var(--muted)] transition-colors hover:text-white"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--brand-bright)] transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#contact"
          className="hidden rounded-full bg-white px-5 py-2 text-sm font-medium text-[#0b0d10] transition-transform hover:scale-[1.03] active:scale-95 md:inline-flex"
        >
          Get in touch
        </a>

        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/5 bg-[#0b0d10]/95 backdrop-blur-xl transition-[max-height] duration-400 ease-out md:hidden ${
          open ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <ul className="flex flex-col px-6 py-3">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-base text-[var(--muted)] transition-colors hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="my-2 block rounded-full bg-white px-5 py-2.5 text-center text-sm font-medium text-[#0b0d10]"
            >
              Get in touch
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
