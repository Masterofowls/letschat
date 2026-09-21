export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
  sendSignal: (msg: {
    toUserId: number;
    signalType: 'offer' | 'answer' | 'ice';
    payload: string;
  }) => Promise<void>;
};

type ConnectOptions = {
  /** Joiner should initiate offers; existing peers must wait for offers. */
  initiate?: boolean;
};

/**
 * Mesh WebRTC: only the joining peer creates offers to existing participants.
 * Existing peers answer — avoids glare when both sides call connectToPeers.
 */
export class MeshCallSession {
  private readonly peers = new Map<number, RTCPeerConnection>();
  private readonly makingOffer = new Map<number, boolean>();
  private readonly ignoreOffer = new Map<number, boolean>();
  private readonly pendingIce = new Map<number, RTCIceCandidateInit[]>();
  private readonly remoteStreams = new Map<number, MediaStream>();
  private localStream: MediaStream | null = null;

  constructor(
    private readonly selfUserId: number,
    private readonly callbacks: MeshCallCallbacks,
    private readonly iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS,
  ) {}

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  async setLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    for (const pc of this.peers.values()) {
      const senders = pc.getSenders();
      for (const track of stream.getTracks()) {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) await sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      }
    }
  }

  async connectToPeers(peerIds: number[], options: ConnectOptions = {}): Promise<void> {
    const initiate = options.initiate ?? false;
    const others = peerIds.filter((id) => id !== this.selfUserId);
    await Promise.all(others.map((id) => this.ensurePeer(id, initiate)));
  }

  async handleSignal(signal: SignalMessage): Promise<void> {
    if (signal.fromUserId === this.selfUserId) return;
    const pc = await this.ensurePeer(signal.fromUserId, false);
    const data = JSON.parse(signal.payload) as
      | RTCSessionDescriptionInit
      | RTCIceCandidateInit;

    if (signal.signalType === 'offer') {
      const readyForOffer = !this.makingOffer.get(signal.fromUserId) && pc.signalingState === 'stable';
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
    pc.close();
    this.peers.delete(userId);
    this.makingOffer.delete(userId);
    this.ignoreOffer.delete(userId);
    this.pendingIce.delete(userId);
    this.remoteStreams.delete(userId);
    this.callbacks.onRemoteStreamRemoved(userId);
  }

  close(): void {
    for (const userId of [...this.peers.keys()]) {
      this.removePeer(userId);
    }
    // Do not stop local tracks here — caller owns the MediaStream lifecycle.
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

  private async ensurePeer(userId: number, createOffer: boolean): Promise<RTCPeerConnection> {
    const existing = this.peers.get(userId);
    if (existing) {
      if (createOffer && existing.signalingState === 'stable') {
        await this.makeOffer(userId, existing);
      }
      return existing;
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(userId, pc);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    } else {
      // Ensure recv transceivers exist even before local media is attached.
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
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
      let stream = this.remoteStreams.get(userId);
      if (!stream) {
        stream = event.streams[0] ? event.streams[0] : new MediaStream();
        this.remoteStreams.set(userId, stream);
      }
      if (!stream.getTracks().some((t) => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      // Clone reference bump so React sees an update when tracks are added.
      const notified = new MediaStream(stream.getTracks());
      this.remoteStreams.set(userId, notified);
      this.callbacks.onRemoteStream(userId, notified);
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionState?.(userId, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(userId);
      }
    };

    if (createOffer) {
      await this.makeOffer(userId, pc);
    }
    return pc;
  }

  private async makeOffer(userId: number, pc: RTCPeerConnection): Promise<void> {
    try {
      this.makingOffer.set(userId, true);
      const offer = await pc.createOffer();
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
