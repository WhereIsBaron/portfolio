import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page Not Found');
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <SearchX size={36} className="text-[var(--brand-bright)]" />
      </div>

      <p className="mb-2 font-mono text-sm text-[var(--brand-bright)]">404</p>
      <h1 className="mb-3 font-display text-4xl font-light text-white sm:text-5xl">
        Page not found.
      </h1>
      <p className="mb-8 max-w-sm text-[var(--muted)]">
        This page doesn't exist or may have been moved. Head back to the portfolio.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm text-[var(--muted)] transition-colors hover:border-white/30 hover:text-white"
        >
          <ArrowLeft size={15} /> Go back
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-full bg-[var(--brand-bright)] px-5 py-2.5 text-sm font-medium text-[#0b0d10] transition-opacity hover:opacity-90"
        >
          Home
        </button>
      </div>
    </div>
  );
}
