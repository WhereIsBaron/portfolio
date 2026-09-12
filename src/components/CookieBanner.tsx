import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent';

type Consent = 'all' | 'essential' | null;

export default function CookieBanner() {
  const [consent, setConsent] = useState<Consent | 'loading'>('loading');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
      setConsent(stored);
    } catch {
      setConsent(null);
    }
  }, []);

  const accept = (choice: 'all' | 'essential') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {}
    setConsent(choice);
  };

  // Don't render until we've checked storage (prevents flash)
  if (consent === 'loading' || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="cookie-bg fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[#0b0d10]/95 px-5 py-4 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-2xl sm:border"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-bright)]/10 text-[var(--brand-bright)]">
          <Cookie size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">This site uses cookies</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            I use essential cookies for the contact form and optional analytics to understand how people
            find this portfolio. No ads, no third-party tracking.{' '}
            <Link to="/privacy" className="underline hover:text-white">
              Privacy policy
            </Link>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => accept('all')}
          className="flex-1 rounded-xl bg-[var(--brand-bright)] py-2 text-xs font-semibold text-[#0b0d10] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-bright)]"
        >
          Accept all
        </button>
        <button
          onClick={() => accept('essential')}
          className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-[var(--muted)] transition-colors hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30"
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
