import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Session key so a visit is counted once per browser session (a refresh or
// Vite HMR reload reads the total instead of inflating it).
const SESSION_KEY = 'al-visit-counted';

/**
 * Returns the global site-visit total, or null while loading / if it can't be
 * fetched. On the first load of a browser session it POSTs to the `track`
 * serverless function (which records the visit against the real server-side IP
 * and returns the new total); on later loads it just reads the total.
 */
export function useVisitCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const alreadyCounted = (() => {
      try {
        return sessionStorage.getItem(SESSION_KEY) === '1';
      } catch {
        return false; // private mode / storage blocked → just read below
      }
    })();

    const run = async () => {
      if (!alreadyCounted) {
        // First visit this session → record it server-side (captures real IP).
        try {
          const res = await fetch('/.netlify/functions/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrer: document.referrer || '',
              path: window.location.pathname || '/',
            }),
          });
          const data = await res.json();
          try {
            sessionStorage.setItem(SESSION_KEY, '1');
          } catch {
            /* ignore */
          }
          if (!cancelled && typeof data?.total === 'number') {
            setCount(data.total);
            return;
          }
        } catch {
          /* fall through to a plain read below */
        }
      }

      // Already counted (or the track call didn't return a number) → read total.
      if (!supabase) return;
      const { data, error } = await supabase.rpc('get_site_visits');
      if (cancelled || error) return;
      setCount(typeof data === 'number' ? data : Number(data));
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
