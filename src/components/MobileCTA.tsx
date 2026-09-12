import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';

/**
 * Sticky "Hire me" button shown on mobile only, once the user has
 * scrolled 400px past the top of the page. Hides near the footer.
 * Not rendered on demo/sub-pages — only on the home page.
 */
export default function MobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 400;
      // Also hide when near the bottom (contact section)
      const nearBottom =
        window.scrollY + window.innerHeight > document.body.scrollHeight - 300;
      setVisible(scrolled && !nearBottom);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      href="#contact"
      aria-label="Contact me"
      className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[var(--brand-bright)] px-4 py-3 text-sm font-semibold text-[#0b0d10] shadow-lg transition-all duration-300 sm:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'
      }`}
    >
      <Mail size={15} />
      Hire me
    </a>
  );
}
