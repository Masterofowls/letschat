import {
  isCallFull,
  MeshCallSession,
  shouldCreateOfferAsJoiner,
} from '../webrtc-call';

describe('webrtc-call helpers', () => {
  it('creates offers to every existing peer when joining', () => {
    expect(shouldCreateOfferAsJoiner(3, [1, 2, 3])).toEqual([1, 2]);
  });

  it('enforces mesh hard limit of 4', () => {
    expect(isCallFull(3, 4)).toBe(false);
    expect(isCallFull(4, 4)).toBe(true);
  });
});

describe('MeshCallSession signaling', () => {
  class FakePC {
    signalingState = 'stable';
    localDescription: RTCSessionDescriptionInit | null = null;
    remoteDescription: RTCSessionDescriptionInit | null = null;
    onicecandidate: ((ev: { candidate: null }) => void) | null = null;
    ontrack: ((ev: { streams: MediaStream[]; track: MediaStreamTrack }) => void) | null =
      null;
    onconnectionstatechange: (() => void) | null = null;
    connectionState: RTCPeerConnectionState = 'new';

    addTrack = jest.fn();
    addTransceiver = jest.fn();
    getSenders = jest.fn(() => []);
    close = jest.fn();
    addIceCandidate = jest.fn(async () => undefined);

    createOffer = jest.fn(async () => ({ type: 'offer', sdp: 'o' }));
    createAnswer = jest.fn(async () => ({ type: 'answer', sdp: 'a' }));
    setLocalDescription = jest.fn(async (desc: RTCSessionDescriptionInit) => {
      this.localDescription = desc;
      this.signalingState = desc.type === 'offer' ? 'have-local-offer' : 'stable';
    });
    setRemoteDescription = jest.fn(async (desc: RTCSessionDescriptionInit) => {
      this.remoteDescription = desc;
      this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable';
    });
  }

  beforeEach(() => {
    (global as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = jest
      .fn()
      .mockImplementation(() => new FakePC());
  });

  it('sends offers to peers when connecting as joiner (1:1)', async () => {
    const sendSignal = jest.fn().mockResolvedValue(undefined);
    const session = new MeshCallSession(2, {
      onRemoteStream: jest.fn(),
      onRemoteStreamRemoved: jest.fn(),
      sendSignal,
    });

    await session.connectToPeers([1, 2], { initiate: true });
    expect(sendSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        toUserId: 1,
        signalType: 'offer',
      }),
    );
    session.close();
  });

  it('does not send offers when connecting as existing peer', async () => {
    const sendSignal = jest.fn().mockResolvedValue(undefined);
    const session = new MeshCallSession(1, {
      onRemoteStream: jest.fn(),
      onRemoteStreamRemoved: jest.fn(),
      sendSignal,
    });

    await session.connectToPeers([1, 2], { initiate: false });
    expect(sendSignal).not.toHaveBeenCalled();
    session.close();
  });

  it('answers an incoming offer from a peer', async () => {
    const sendSignal = jest.fn().mockResolvedValue(undefined);
    const session = new MeshCallSession(2, {
      onRemoteStream: jest.fn(),
      onRemoteStreamRemoved: jest.fn(),
      sendSignal,
    });

    await session.handleSignal({
      fromUserId: 1,
      toUserId: 2,
      signalType: 'offer',
      payload: JSON.stringify({ type: 'offer', sdp: 'offer-sdp' }),
    });

    expect(sendSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        toUserId: 1,
        signalType: 'answer',
      }),
    );
    session.close();
  });

  it('meshes offers to multiple peers for group calls', async () => {
    const sendSignal = jest.fn().mockResolvedValue(undefined);
    const session = new MeshCallSession(4, {
      onRemoteStream: jest.fn(),
      onRemoteStreamRemoved: jest.fn(),
      sendSignal,
    });

    await session.connectToPeers([1, 2, 3, 4], { initiate: true });
    const offered = sendSignal.mock.calls.map((c) => c[0].toUserId).sort();
    expect(offered).toEqual([1, 2, 3]);
    session.close();
  });
});
