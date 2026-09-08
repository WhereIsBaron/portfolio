import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Session key so a visit is counted once per browser session (a refresh or
// Vite HMR reload reads the total instead of inflating it).
const SESSION_KEY = 'al-visit-counted';
// Persistent marker for an owner's own device. The first time the owner signs
// in on a browser it is flagged, and from then on that browser's visits are
// never counted — even when signed out — so the owner's own traffic (and any
// admin/testing) doesn't inflate the public total.
const OWNER_DEVICE_KEY = 'al-owner-device';

const readFlag = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const setFlag = (k: string) => {
  try {
    localStorage.setItem(k, '1');
  } catch {
    /* storage blocked → best effort */
  }
};

/**
 * Returns the global site-visit total, or null while loading / if it can't be
 * fetched. On the first load of a browser session it POSTs to the `track`
 * serverless function (which records the visit against the real server-side IP
 * and returns the new total); on later loads it just reads the total.
 *
 * The owner's own visits are never recorded: while signed in, or on any browser
 * where the owner has ever signed in (a persistent device flag). Those sessions
 * still READ the total so the footer shows it — they just don't increment it.
 */
export function useVisitCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait until auth resolves so we know whether this is the owner before we
    // decide whether to record.
    if (loading) return;
    let cancelled = false;

    // Flag this browser as an owner device the first time the owner signs in.
    if (user) setFlag(OWNER_DEVICE_KEY);
    const isOwnerDevice = Boolean(user) || readFlag(OWNER_DEVICE_KEY);

    const alreadyCounted = (() => {
      try {
        return sessionStorage.getItem(SESSION_KEY) === '1';
      } catch {
        return false; // private mode / storage blocked → just read below
      }
    })();

    const readTotal = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.rpc('get_site_visits');
      if (cancelled || error) return;
      setCount(typeof data === 'number' ? data : Number(data));
    };

    const run = async () => {
      // Owner's own device, or already counted this session → read, don't record.
      if (isOwnerDevice || alreadyCounted) {
        await readTotal();
        return;
      }

      // First real visit this session → record it server-side (captures real IP).
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

      await readTotal();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  return count;
}
