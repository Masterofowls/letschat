import { DEFAULT_ICE_SERVERS, resolveIceServers } from '../ice-servers';

describe('ICE servers for remote media', () => {
  it('includes TURN so peers behind NAT can exchange audio/video', () => {
    const urls = DEFAULT_ICE_SERVERS.flatMap((s) =>
      Array.isArray(s.urls) ? s.urls : [s.urls],
    );
    expect(urls.some((u) => String(u).startsWith('turn:'))).toBe(true);
    expect(resolveIceServers().length).toBeGreaterThanOrEqual(2);
  });
});
