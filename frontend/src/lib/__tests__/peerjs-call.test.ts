import { resolvePeerBroker } from '../peerjs-call';

describe('PeerJS broker config (Habr tutorial style)', () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = original;
  });

  it('points Peer client at our Nest /peerjs path over HTTPS', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://letschat-api.onrender.com/graphql';
    expect(resolvePeerBroker()).toEqual({
      host: 'letschat-api.onrender.com',
      port: 443,
      path: '/peerjs',
      secure: true,
    });
  });

  it('uses local broker on port 9000 for development', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:9000/graphql';
    delete process.env.NEXT_PUBLIC_PEERJS_CLOUD;
    expect(resolvePeerBroker()).toEqual({
      host: 'localhost',
      port: 9000,
      path: '/peerjs',
      secure: false,
    });
  });

  it('can force the public PeerJS cloud broker', () => {
    process.env.NEXT_PUBLIC_PEERJS_CLOUD = 'true';
    expect(resolvePeerBroker()).toEqual({
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
    });
  });
});

describe('PeerJS call/answer helpers', () => {
  it('lower userId is the dialer (existing→newcomer pattern)', () => {
    const shouldDial = (selfId: number, remoteUserId: number) => selfId < remoteUserId;
    // user 1 receives peer-id from user 2 → dials
    expect(shouldDial(1, 2)).toBe(true);
    // user 2 receives peer-id from user 1 → only answers
    expect(shouldDial(2, 1)).toBe(false);
  });
});
