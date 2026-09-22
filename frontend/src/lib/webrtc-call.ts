import { resolveIceServers } from './ice-servers';

export { DEFAULT_ICE_SERVERS } from './ice-servers';

export type SignalMessage = {
  signalType: 'offer' | 'answer' | 'ice';
  payload: string;
  fromUserId: number;
  toUserId?: number | null;
};

export type MeshCallCallbacks = {
  onRemoteStream: (userId: number, stream: MediaStream) => void;
  onRemoteStreamRemoved: (userId: number) => void;
  onConnectionState?: (userId: number, state: RTCPeerConnectionState) => void;
  onIceConnectionState?: (userId: number, state: RTCIceConnectionState) => void;
  sendSignal: (msg: {
    toUserId: number;
    signalType: 'offer' | 'answer' | 'ice';
    payload: string;
  }) => Promise<void>;
};

type ConnectOptions = {
  /** Only one side should initiate per pair to avoid glare / one-way media. */
  initiate?: boolean;
};

/**
 * Mesh WebRTC: existing peers (or a single designated initiator) create offers.
 * Answers + trickle ICE; local MediaStream is always attached as sendrecv.
 */
export class MeshCallSession {
  private readonly peers = new Map<number, RTCPeerConnection>();
  private readonly makingOffer = new Map<number, boolean>();
  private readonly ignoreOffer = new Map<number, boolean>();
  private readonly pendingIce = new Map<number, RTCIceCandidateInit[]>();
  private readonly remoteStreams = new Map<number, MediaStream>();
  private localStream: MediaStream | null = null;
  private closed = false;

  constructor(
    private readonly selfUserId: number,
    private readonly callbacks: MeshCallCallbacks,
    private readonly iceServers: RTCIceServer[] = resolveIceServers(),
  ) {}

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getIceConnectionState(userId: number): RTCIceConnectionState | null {
    return this.peers.get(userId)?.iceConnectionState ?? null;
  }

  async setLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    for (const pc of this.peers.values()) {
      await this.attachLocalTracks(pc, stream);
    }
  }

  async connectToPeers(peerIds: number[], options: ConnectOptions = {}): Promise<void> {
    if (this.closed) return;
    const initiate = options.initiate ?? false;
    const others = peerIds.filter((id) => id !== this.selfUserId);
    await Promise.all(others.map((id) => this.ensurePeer(id, initiate)));
  }

  async handleSignal(signal: SignalMessage): Promise<void> {
    if (this.closed) return;
    if (signal.fromUserId === this.selfUserId) return;
    const pc = await this.ensurePeer(signal.fromUserId, false);
    const data = JSON.parse(signal.payload) as
      | RTCSessionDescriptionInit
      | RTCIceCandidateInit;

    if (signal.signalType === 'offer') {
      const readyForOffer =
        !this.makingOffer.get(signal.fromUserId) && pc.signalingState === 'stable';
      const offerCollision = !readyForOffer;
      const polite = this.selfUserId > signal.fromUserId;
      this.ignoreOffer.set(signal.fromUserId, !polite && offerCollision);
      if (this.ignoreOffer.get(signal.fromUserId)) return;

      if (offerCollision) {
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch {
          // ignore
        }
      }

      await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
      await this.flushIce(signal.fromUserId, pc);
      if (this.localStream) {
        await this.attachLocalTracks(pc, this.localStream);
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.callbacks.sendSignal({
        toUserId: signal.fromUserId,
        signalType: 'answer',
        payload: JSON.stringify(pc.localDescription),
      });
      return;
    }

    if (signal.signalType === 'answer') {
      if (pc.signalingState !== 'have-local-offer') return;
      await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
      await this.flushIce(signal.fromUserId, pc);
      return;
    }

    if (signal.signalType === 'ice' && data) {
      if (!pc.remoteDescription) {
        const queue = this.pendingIce.get(signal.fromUserId) ?? [];
        queue.push(data as RTCIceCandidateInit);
        this.pendingIce.set(signal.fromUserId, queue);
        return;
      }
      try {
        await pc.addIceCandidate(data as RTCIceCandidateInit);
      } catch {
        // Ignore late/invalid candidates.
      }
    }
  }

  setMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setCameraOff(off: boolean): void {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !off;
    });
  }

  removePeer(userId: number): void {
    const pc = this.peers.get(userId);
    if (!pc) return;
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.close();
    this.peers.delete(userId);
    this.makingOffer.delete(userId);
    this.ignoreOffer.delete(userId);
    this.pendingIce.delete(userId);
    this.remoteStreams.delete(userId);
    this.callbacks.onRemoteStreamRemoved(userId);
  }

  close(): void {
    this.closed = true;
    for (const userId of [...this.peers.keys()]) {
      this.removePeer(userId);
    }
    this.localStream = null;
  }

  private async flushIce(userId: number, pc: RTCPeerConnection): Promise<void> {
    const queued = this.pendingIce.get(userId) ?? [];
    this.pendingIce.set(userId, []);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    }
  }

  private async attachLocalTracks(pc: RTCPeerConnection, stream: MediaStream): Promise<void> {
    const senders = pc.getSenders();
    for (const track of stream.getTracks()) {
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) {
        if (sender.track?.id !== track.id) {
          await sender.replaceTrack(track);
        }
      } else {
        pc.addTrack(track, stream);
      }
    }
    for (const transceiver of pc.getTransceivers()) {
      if (transceiver.sender.track) {
        try {
          transceiver.direction = 'sendrecv';
        } catch {
          // direction may be immutable after negotiation in some browsers
        }
      }
    }
  }

  private notifyRemote(userId: number, track: MediaStreamTrack): void {
    let stream = this.remoteStreams.get(userId);
    if (!stream) {
      stream = new MediaStream();
      this.remoteStreams.set(userId, stream);
    }
    if (!stream.getTracks().some((t) => t.id === track.id)) {
      stream.addTrack(track);
    }
    const snapshot = new MediaStream(stream.getTracks());
    this.remoteStreams.set(userId, snapshot);
    this.callbacks.onRemoteStream(userId, snapshot);

    const bump = () => {
      const current = this.remoteStreams.get(userId);
      if (!current) return;
      const next = new MediaStream(current.getTracks());
      this.remoteStreams.set(userId, next);
      this.callbacks.onRemoteStream(userId, next);
    };
    if (typeof track.addEventListener === 'function') {
      track.addEventListener('unmute', bump);
      track.addEventListener('mute', bump);
    }
  }

  private async ensurePeer(userId: number, createOffer: boolean): Promise<RTCPeerConnection> {
    const existing = this.peers.get(userId);
    if (existing) {
      if (this.localStream) {
        await this.attachLocalTracks(existing, this.localStream);
      }
      if (createOffer && existing.signalingState === 'stable') {
        await this.makeOffer(userId, existing);
      }
      return existing;
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 4,
    });
    this.peers.set(userId, pc);

    if (this.localStream) {
      await this.attachLocalTracks(pc, this.localStream);
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      void this.callbacks.sendSignal({
        toUserId: userId,
        signalType: 'ice',
        payload: JSON.stringify(event.candidate.toJSON()),
      });
    };

    pc.ontrack = (event) => {
      this.notifyRemote(userId, event.track);
    };

    pc.oniceconnectionstatechange = () => {
      this.callbacks.onIceConnectionState?.(userId, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        void this.restartIce(userId, pc);
      }
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionState?.(userId, pc.connectionState);
      if (pc.connectionState === 'failed') {
        void this.restartIce(userId, pc);
      }
      if (pc.connectionState === 'closed') {
        this.removePeer(userId);
      }
    };

    if (createOffer) {
      await this.makeOffer(userId, pc);
    }
    return pc;
  }

  private async restartIce(userId: number, pc: RTCPeerConnection): Promise<void> {
    if (this.closed || pc.signalingState !== 'stable') return;
    try {
      this.makingOffer.set(userId, true);
      const offer = await pc.createOffer({ iceRestart: true });
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(offer);
      await this.callbacks.sendSignal({
        toUserId: userId,
        signalType: 'offer',
        payload: JSON.stringify(pc.localDescription),
      });
    } catch {
      // ignore
    } finally {
      this.makingOffer.set(userId, false);
    }
  }

  private async makeOffer(userId: number, pc: RTCPeerConnection): Promise<void> {
    try {
      this.makingOffer.set(userId, true);
      if (this.localStream) {
        await this.attachLocalTracks(pc, this.localStream);
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(offer);
      await this.callbacks.sendSignal({
        toUserId: userId,
        signalType: 'offer',
        payload: JSON.stringify(pc.localDescription),
      });
    } finally {
      this.makingOffer.set(userId, false);
    }
  }
}

/** Pure helpers for tests */
export function shouldCreateOfferAsJoiner(
  selfId: number,
  existingPeerIds: number[],
): number[] {
  return existingPeerIds.filter((id) => id !== selfId);
}

export function isCallFull(activeCount: number, max = 4): boolean {
  return activeCount >= max;
}
