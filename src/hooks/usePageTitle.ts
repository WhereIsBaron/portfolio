import { useEffect } from 'react';

const BASE = 'Andrew Langeveldt — Software Engineer & Developer';

/**
 * Sets document.title for the current page and resets to the portfolio
 * base title when the component unmounts. Pass an empty string to use
 * the base title directly (e.g. the home page).
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Andrew Langeveldt` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [title]);
}
