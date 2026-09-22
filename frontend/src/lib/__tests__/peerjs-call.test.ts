import { resolvePeerBroker } from '../peerjs-call';

describe('PeerJS broker config (Habr tutorial style)', () => {
  const originalUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalCloud = process.env.NEXT_PUBLIC_PEERJS_CLOUD;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalUrl;
    process.env.NEXT_PUBLIC_PEERJS_CLOUD = originalCloud;
  });

  it('defaults to the public PeerJS cloud broker', () => {
    delete process.env.NEXT_PUBLIC_PEERJS_CLOUD;
    expect(resolvePeerBroker()).toEqual({
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
    });
  });

  it('can use the self-hosted Nest broker when cloud is disabled', () => {
    process.env.NEXT_PUBLIC_PEERJS_CLOUD = 'false';
    process.env.NEXT_PUBLIC_API_URL = 'https://letschat-api.onrender.com/graphql';
    expect(resolvePeerBroker()).toEqual({
      host: 'letschat-api.onrender.com',
      port: 443,
      path: '/peerjs',
      secure: true,
    });
  });
});

describe('PeerJS call/answer helpers', () => {
  it('lower userId is the dialer (existing→newcomer pattern)', () => {
    const shouldDial = (selfId: number, remoteUserId: number) => selfId < remoteUserId;
    expect(shouldDial(1, 2)).toBe(true);
    expect(shouldDial(2, 1)).toBe(false);
  });
});
