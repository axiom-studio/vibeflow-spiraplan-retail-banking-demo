import { useEffect, useState } from 'react';

export function parseRoute(hash: string): string[] {
  try { return (hash.replace(/^#\/?/, '') || 'accounts').split('/').map(decodeURIComponent); }
  catch { return ['not-found']; }
}
export function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const update = () => setHash(location.hash);
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  useEffect(() => { document.querySelector<HTMLElement>('h1')?.focus(); }, [hash]);
  return parseRoute(hash);
}
export function formatDate(value: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: dateOnly ? 'UTC' : 'America/Los_Angeles' }).format(new Date(value));
}
