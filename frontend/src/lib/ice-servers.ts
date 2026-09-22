/**
 * STUN + public TURN so peers behind symmetric NAT can exchange media.
 * Override with NEXT_PUBLIC_ICE_SERVERS (JSON array of RTCIceServer).
 */
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function resolveIceServers(): RTCIceServer[] {
  if (typeof process === 'undefined') return DEFAULT_ICE_SERVERS;
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (!raw) return DEFAULT_ICE_SERVERS;
  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fall through
  }
  return DEFAULT_ICE_SERVERS;
}
