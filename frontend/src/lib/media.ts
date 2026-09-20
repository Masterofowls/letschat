export function apiOrigin(): string {
  const graphql = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/graphql';
  try {
    const url = new URL(graphql);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:9000';
  }
}

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const origin = apiOrigin();
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function absoluteProfileUrl(username: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/u/${username}`;
  }
  return `/u/${username}`;
}
