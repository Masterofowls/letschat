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

  it('exchanges offer/answer so both peers see each other (mutual connection)', async () => {
    class FakeMediaStream {
      private tracks: MediaStreamTrack[];
      constructor(tracks: MediaStreamTrack[] = []) {
        this.tracks = [...tracks];
      }
      getTracks() {
        return this.tracks;
      }
      addTrack(track: MediaStreamTrack) {
        this.tracks.push(track);
      }
    }
    (global as unknown as { MediaStream: unknown }).MediaStream = FakeMediaStream;

    const pcs: FakePC[] = [];
    (global as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = jest
      .fn()
      .mockImplementation(() => {
        const pc = new FakePC();
        pcs.push(pc);
        return pc;
      });

    const remoteFor1 = jest.fn();
    const remoteFor2 = jest.fn();

    let session1: MeshCallSession;
    let session2: MeshCallSession;

    session1 = new MeshCallSession(1, {
      onRemoteStream: remoteFor1,
      onRemoteStreamRemoved: jest.fn(),
      sendSignal: async (msg) => {
        await session2.handleSignal({
          fromUserId: 1,
          toUserId: msg.toUserId,
          signalType: msg.signalType,
          payload: msg.payload,
        });
      },
    });
    session2 = new MeshCallSession(2, {
      onRemoteStream: remoteFor2,
      onRemoteStreamRemoved: jest.fn(),
      sendSignal: async (msg) => {
        await session1.handleSignal({
          fromUserId: 2,
          toUserId: msg.toUserId,
          signalType: msg.signalType,
          payload: msg.payload,
        });
      },
    });

    await session1.connectToPeers([2], { initiate: false });
    await session2.connectToPeers([1], { initiate: true });

    const offerSent = pcs.some(
      (pc) => (pc.createOffer as jest.Mock).mock.calls.length > 0,
    );
    const answerSent = pcs.some(
      (pc) => (pc.createAnswer as jest.Mock).mock.calls.length > 0,
    );
    expect(offerSent).toBe(true);
    expect(answerSent).toBe(true);

    const track1 = { id: 'a1', kind: 'audio' } as MediaStreamTrack;
    const track2 = { id: 'a2', kind: 'audio' } as MediaStreamTrack;
    const stream1 = new FakeMediaStream([track1]) as unknown as MediaStream;
    const stream2 = new FakeMediaStream([track2]) as unknown as MediaStream;

    pcs[0].ontrack?.({ streams: [stream2], track: track2 });
    pcs[1].ontrack?.({ streams: [stream1], track: track1 });

    expect(remoteFor1).toHaveBeenCalledWith(2, expect.any(Object));
    expect(remoteFor2).toHaveBeenCalledWith(1, expect.any(Object));

    session1.close();
    session2.close();
  });
});
