'use client';

/**
 * Pings the Render API so free-tier instances do not sleep during an active session.
 * Interval is under Render's ~15m idle spin-down window.
 */
export function startApiKeepAlive(healthUrl: string, intervalMs = 4 * 60 * 1000): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const ping = () => {
    void fetch(healthUrl, { method: 'GET', cache: 'no-store', mode: 'cors' }).catch(() => {
      // Ignore — cold starts / offline are expected occasionally.
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

export function healthUrlFromGraphql(graphqlUrl: string): string {
  try {
    const url = new URL(graphqlUrl);
    url.pathname = '/health';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return graphqlUrl.replace(/\/graphql\/?$/, '/health');
  }
}
