'use client';

/**
 * Pings the API so Render free-tier instances do not sleep during a session.
 * Uses GraphQL POST (not /health) — ad blockers often block URLs containing "health".
 */
export function startApiKeepAlive(graphqlUrl: string, intervalMs = 4 * 60 * 1000): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const ping = () => {
    void fetch(graphqlUrl, {
      method: 'POST',
      cache: 'no-store',
      mode: 'cors',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    }).catch(() => {
      // Ignore cold starts / offline.
    });
  };

  ping();
  const id = window.setInterval(ping, intervalMs);
  const onVisible = () => {
    if (document.visibilityState === 'visible') ping();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/** @deprecated kept for tests — prefer passing the GraphQL URL directly */
export function healthUrlFromGraphql(graphqlUrl: string): string {
  return graphqlUrl;
}
