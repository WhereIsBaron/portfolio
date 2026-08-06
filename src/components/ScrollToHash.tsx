import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// On route change, scroll to the hash target (e.g. "/#work") if present, otherwise
// jump to the top. Lets a link from another page land on the right section.
export default function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
