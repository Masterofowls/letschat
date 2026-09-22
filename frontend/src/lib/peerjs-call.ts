import Peer, { type MediaConnection } from 'peerjs';
import { resolveIceServers } from './ice-servers';

export type PeerSignalMessage = {
  signalType: 'peer-id' | string;
  payload: string;
  fromUserId: number;
  toUserId?: number | null;
};

export type PeerCallCallbacks = {
  onRemoteStream: (userId: number, stream: MediaStream) => void;
  onRemoteStreamRemoved: (userId: number) => void;
  onPeerReady?: (peerId: string) => void;
  onConnectionState?: (userId: number, state: 'connecting' | 'connected' | 'disconnected') => void;
  /** Broadcast presence (like socket emit join-room / user-connected in the tutorial). */
  sendPeerId: (peerId: string) => Promise<void>;
};

export type PeerBrokerConfig = {
  host: string;
  port: number;
  path: string;
  secure: boolean;
};

export const PUBLIC_PEER_BROKER: PeerBrokerConfig = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
};

/**
 * Resolve PeerJS broker from NEXT_PUBLIC_API_URL (Nest PeerServer),
 * matching https://habr.com/ru/companies/skillfactory/articles/551008/
 *
 * NEXT_PUBLIC_PEERJS_CLOUD=true → public broker only.
 */
export function resolvePeerBroker(): PeerBrokerConfig {
  if (process.env.NEXT_PUBLIC_PEERJS_CLOUD === 'true') {
    return { ...PUBLIC_PEER_BROKER };
  }

  const graphql = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9000/graphql';
  try {
    const url = new URL(graphql);
    const secure = url.protocol === 'https:';
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : secure ? 443 : 80,
      // ExpressPeerServer `{ path: '/peerjs' }` → client path `/peerjs`
      // ID URL: /peerjs/peerjs/id
      path: '/peerjs',
      secure,
    };
  } catch {
    return { host: 'localhost', port: 9000, path: '/peerjs', secure: false };
  }
}

/**
 * Video chat session using the PeerJS pattern from:
 * https://habr.com/ru/companies/skillfactory/articles/551008/
 *
 * - peer.on('call') → answer(localStream) → call.on('stream')
 * - on remote peer-id (user-connected) → peer.call(remotePeerId, localStream)
 * GraphQL replaces Socket.io for announcing peer IDs.
 */
export class PeerJsCallSession {
  private peer: Peer | null = null;
  private localStream: MediaStream | null = null;
  private readonly calls = new Map<number, MediaConnection>();
  private readonly remotePeerIds = new Map<number, string>();
  private readonly calledPeerIds = new Set<string>();
  private myPeerId: string | null = null;
  private closed = false;
  private broker: PeerBrokerConfig;

  constructor(
    private readonly selfUserId: number,
    private readonly callbacks: PeerCallCallbacks,
    broker: PeerBrokerConfig = resolvePeerBroker(),
  ) {
    this.broker = broker;
  }

  async start(localStream: MediaStream): Promise<string> {
    this.localStream = localStream;
    try {
      return await this.openPeer(this.broker);
    } catch (err) {
      // Self-hosted Render broker often 404s if path/proxy is wrong — use public PeerJS.
      if (
        this.broker.host !== PUBLIC_PEER_BROKER.host &&
        process.env.NEXT_PUBLIC_PEERJS_CLOUD !== 'false'
      ) {
        this.broker = { ...PUBLIC_PEER_BROKER };
        return this.openPeer(this.broker);
      }
      throw err;
    }
  }

  private async openPeer(broker: PeerBrokerConfig): Promise<string> {
    this.peer?.destroy();

    const peer = new Peer({
      host: broker.host,
      port: broker.port,
      path: broker.path,
      secure: broker.secure,
      config: { iceServers: resolveIceServers() },
      debug: 1,
    });
    this.peer = peer;

    peer.on('call', (call) => {
      if (!this.localStream || this.closed) return;
      const fromUserId = this.userIdForPeerId(call.peer);
      call.answer(this.localStream);
      this.bindCallStream(call, fromUserId);
    });

    peer.on('error', (err) => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[PeerJS]', err);
      }
    });

    const peerId = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PeerJS connection timeout')), 12_000);
      peer.on('open', (id) => {
        clearTimeout(timer);
        resolve(id);
      });
      peer.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    if (this.closed) {
      peer.destroy();
      throw new Error('Call session closed');
    }

    this.myPeerId = peerId;
    this.callbacks.onPeerReady?.(peerId);
    await this.callbacks.sendPeerId(peerId);
    return peerId;
  }

  /**
   * Handle GraphQL callSignal — peer-id is the tutorial's "user-connected" event.
   * Existing peers call the newcomer; the newcomer only answers via peer.on('call').
   */
  async handleSignal(signal: PeerSignalMessage): Promise<void> {
    if (this.closed || signal.fromUserId === this.selfUserId) return;
    if (signal.signalType !== 'peer-id') return;

    let remotePeerId = signal.payload;
    try {
      const parsed = JSON.parse(signal.payload) as { peerId?: string };
      if (parsed?.peerId) remotePeerId = parsed.peerId;
    } catch {
      // plain peer id string
    }
    if (!remotePeerId) return;

    this.remotePeerIds.set(signal.fromUserId, remotePeerId);

    // One initiator per pair (lower userId calls).
    if (this.selfUserId > signal.fromUserId) return;

    await this.connectToNewUser(signal.fromUserId, remotePeerId);
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

  close(): void {
    this.closed = true;
    for (const call of this.calls.values()) {
      try {
        call.close();
      } catch {
        // ignore
      }
    }
    this.calls.clear();
    this.remotePeerIds.clear();
    this.calledPeerIds.clear();
    this.peer?.destroy();
    this.peer = null;
    this.localStream = null;
    this.myPeerId = null;
  }

  private userIdForPeerId(peerId: string): number | null {
    for (const [userId, id] of this.remotePeerIds) {
      if (id === peerId) return userId;
    }
    return null;
  }

  private async connectToNewUser(userId: number, remotePeerId: string): Promise<void> {
    if (!this.peer || !this.localStream || this.closed) return;
    if (this.calledPeerIds.has(remotePeerId) || this.calls.has(userId)) return;
    if (!this.peer.open) return;

    this.calledPeerIds.add(remotePeerId);
    this.callbacks.onConnectionState?.(userId, 'connecting');

    const call = this.peer.call(remotePeerId, this.localStream);
    if (!call) {
      this.calledPeerIds.delete(remotePeerId);
      return;
    }
    this.bindCallStream(call, userId);
  }

  private bindCallStream(call: MediaConnection, userId: number | null): void {
    const resolvedUserId = userId ?? this.userIdForPeerId(call.peer);

    call.on('stream', (remoteStream) => {
      const uid = resolvedUserId ?? this.userIdForPeerId(call.peer);
      if (uid == null) return;
      this.calls.set(uid, call);
      this.callbacks.onConnectionState?.(uid, 'connected');
      this.callbacks.onRemoteStream(uid, remoteStream);
    });

    call.on('close', () => {
      const uid = resolvedUserId ?? this.userIdForPeerId(call.peer);
      if (uid == null) return;
      this.calls.delete(uid);
      this.callbacks.onConnectionState?.(uid, 'disconnected');
      this.callbacks.onRemoteStreamRemoved(uid);
    });

    call.on('error', () => {
      const uid = resolvedUserId ?? this.userIdForPeerId(call.peer);
      if (uid != null) {
        this.calls.delete(uid);
        this.callbacks.onConnectionState?.(uid, 'disconnected');
        this.callbacks.onRemoteStreamRemoved(uid);
      }
    });
  }
}
