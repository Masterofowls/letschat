'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import {
  CALL_SIGNAL_SUBSCRIPTION,
  CALL_UPDATED_SUBSCRIPTION,
  END_CALL,
  JOIN_CALL,
  LEAVE_CALL,
  SEND_CALL_SIGNAL,
  START_CALL,
  UPDATE_CALL_MEDIA,
} from '@/lib/graphql/calls';
import { MeshCallSession } from '@/lib/webrtc-call';
import {
  describePermissionError,
  requestCallMedia,
  stopMediaStream,
} from '@/lib/media-permissions';
import { CallOverlay } from '@/components/CallOverlay';
import { IncomingCallBanner } from '@/components/IncomingCallBanner';
import {
  normalizeCallPayload,
  toGraphqlCallMediaType,
  type CallMedia,
} from '@/lib/call-enums';

export type CallGql = {
  id: number;
  roomId: number;
  createdById: number;
  mediaType: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended';
  maxParticipants: number;
  targetUserIds?: number[] | null;
  participants?: Array<{
    userId: number;
    muted: boolean;
    cameraOff: boolean;
    user?: {
      id: number;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
    } | null;
  }>;
};

type CallContextValue = {
  activeCall: CallGql | null;
  incomingCall: CallGql | null;
  localStream: MediaStream | null;
  remoteStreams: Record<number, MediaStream>;
  muted: boolean;
  cameraOff: boolean;
  error: string | null;
  startCall: (roomId: number, mediaType: CallMedia) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
};

type PendingSignal = {
  signalType: 'offer' | 'answer' | 'ice';
  payload: string;
  fromUserId: number;
  toUserId?: number | null;
};

const CallContext = createContext<CallContextValue | null>(null);

/** Delay so graphql-ws subscription is live before first offer/answer exchange. */
export const SIGNAL_SUBSCRIBE_GRACE_MS = 350;

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCall must be used within CallProvider');
  }
  return ctx;
}

export function useCallOptional(): CallContextValue | null {
  return useContext(CallContext);
}

type Props = {
  children: ReactNode;
  currentUserId?: number;
};

export function CallProvider({ children, currentUserId }: Props) {
  const [activeCall, setActiveCall] = useState<CallGql | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallGql | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signalCallId, setSignalCallId] = useState<number | null>(null);
  const sessionRef = useRef<MeshCallSession | null>(null);
  const activeCallIdRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalQueueRef = useRef<PendingSignal[]>([]);
  const connectedPeersRef = useRef<Set<number>>(new Set());

  const [startCallMut] = useMutation(START_CALL);
  const [joinCallMut] = useMutation(JOIN_CALL);
  const [leaveCallMut] = useMutation(LEAVE_CALL);
  const [endCallMut] = useMutation(END_CALL);
  const [sendSignalMut] = useMutation(SEND_CALL_SIGNAL);
  const [updateMediaMut] = useMutation(UPDATE_CALL_MEDIA);

  const flushSignalQueue = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    const queued = signalQueueRef.current;
    signalQueueRef.current = [];
    for (const signal of queued) {
      await session.handleSignal(signal);
    }
  }, []);

  const cleanupSession = useCallback((stopLocal = true) => {
    sessionRef.current?.close();
    sessionRef.current = null;
    signalQueueRef.current = [];
    connectedPeersRef.current = new Set();
    if (stopLocal) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setRemoteStreams({});
    activeCallIdRef.current = null;
    setSignalCallId(null);
  }, []);

  const attachSession = useCallback(
    async (call: CallGql, stream: MediaStream, initiateOffers: boolean) => {
      if (!currentUserId) return;
      sessionRef.current?.close();
      sessionRef.current = null;
      connectedPeersRef.current = new Set();
      if (localStreamRef.current && localStreamRef.current !== stream) {
        stopMediaStream(localStreamRef.current);
      }

      activeCallIdRef.current = call.id;
      // Subscribe to signals BEFORE creating offers (grace wait below).
      setSignalCallId(call.id);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraOff(call.mediaType === 'audio' || stream.getVideoTracks().length === 0);
      setMuted(false);

      const session = new MeshCallSession(currentUserId, {
        onRemoteStream: (userId, remote) => {
          setRemoteStreams((prev) => ({ ...prev, [userId]: remote }));
        },
        onRemoteStreamRemoved: (userId) => {
          connectedPeersRef.current.delete(userId);
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        },
        sendSignal: async ({ toUserId, signalType, payload }) => {
          await sendSignalMut({
            variables: {
              input: {
                callId: call.id,
                toUserId,
                signalType,
                payload,
              },
            },
          });
        },
      });
      sessionRef.current = session;
      await session.setLocalStream(stream);
      await flushSignalQueue();

      const peerIds = (call.participants ?? [])
        .map((p) => p.userId)
        .filter((id) => id !== currentUserId);

      // Let the graphql-ws callSignal subscription attach before first offer.
      await new Promise((r) => setTimeout(r, SIGNAL_SUBSCRIBE_GRACE_MS));
      if (sessionRef.current !== session || activeCallIdRef.current !== call.id) {
        return;
      }

      await session.connectToPeers(peerIds, { initiate: initiateOffers });
      for (const id of peerIds) connectedPeersRef.current.add(id);
    },
    [currentUserId, flushSignalQueue, sendSignalMut],
  );

  useSubscription(CALL_UPDATED_SUBSCRIPTION, {
    skip: !currentUserId,
    onData: ({ data }) => {
      const raw = data.data?.callUpdated as CallGql | undefined;
      if (!raw || !currentUserId) return;
      const call = normalizeCallPayload(raw);

      if (call.status === 'ended') {
        if (activeCallIdRef.current === call.id || incomingCall?.id === call.id) {
          cleanupSession(true);
          setActiveCall(null);
        }
        setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
        return;
      }

      const inCall = call.participants?.some((p) => p.userId === currentUserId);
      if (inCall && activeCallIdRef.current === call.id) {
        setActiveCall(call);
        setIncomingCall(null);
        const peers = (call.participants ?? [])
          .map((p) => p.userId)
          .filter((id) => id !== currentUserId);
        const newPeers = peers.filter((id) => !connectedPeersRef.current.has(id));
        // Existing member already has a live signal subscription — initiate to
        // new joiners so we do not depend only on the joiner's first offer.
        if (newPeers.length && sessionRef.current) {
          for (const id of newPeers) connectedPeersRef.current.add(id);
          const session = sessionRef.current;
          const callId = call.id;
          void (async () => {
            // Give joiner time to open callSignal subscription + session.
            await new Promise((r) => setTimeout(r, SIGNAL_SUBSCRIBE_GRACE_MS));
            if (sessionRef.current !== session || activeCallIdRef.current !== callId) {
              return;
            }
            await session.connectToPeers(newPeers, { initiate: true });
          })();
        }
        return;
      }

      if (
        call.status === 'ringing' &&
        call.createdById !== currentUserId &&
        (call.targetUserIds?.includes(currentUserId) ?? true)
      ) {
        setIncomingCall(call);
      }
    },
  });

  useSubscription(CALL_SIGNAL_SUBSCRIPTION, {
    skip: !signalCallId,
    variables: { callId: signalCallId },
    onData: ({ data }) => {
      const signal = data.data?.callSignal as PendingSignal | undefined;
      if (!signal) return;
      if (!sessionRef.current) {
        signalQueueRef.current.push(signal);
        return;
      }
      void sessionRef.current.handleSignal({
        signalType: signal.signalType,
        payload: signal.payload,
        fromUserId: signal.fromUserId,
        toUserId: signal.toUserId,
      });
    },
  });

  const startCall = useCallback(
    async (roomId: number, mediaType: CallMedia) => {
      if (!currentUserId) return;
      setError(null);
      let stream: MediaStream | null = null;
      try {
        stream = await requestCallMedia(mediaType);
        const result = await startCallMut({
          variables: {
            input: { roomId, mediaType: toGraphqlCallMediaType(mediaType) },
          },
        });
        const call = normalizeCallPayload(result.data?.startCall as CallGql);
        setActiveCall(call);
        // Starter waits for joiner; callUpdated will initiate when they join.
        await attachSession(call, stream, false);
      } catch (err) {
        stopMediaStream(stream);
        setError(describePermissionError(err));
      }
    },
    [attachSession, currentUserId, startCallMut],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    setError(null);
    let stream: MediaStream | null = null;
    try {
      stream = await requestCallMedia(incomingCall.mediaType);
      const result = await joinCallMut({ variables: { callId: incomingCall.id } });
      const call = normalizeCallPayload(result.data?.joinCall as CallGql);
      setIncomingCall(null);
      setActiveCall(call);
      // Joiner also offers after grace — glare is handled by polite peer logic.
      await attachSession(call, stream, true);
    } catch (err) {
      stopMediaStream(stream);
      setError(describePermissionError(err));
    }
  }, [attachSession, incomingCall, joinCallMut]);

  const declineCall = useCallback(async () => {
    const call = incomingCall;
    setIncomingCall(null);
    if (!call) return;
    try {
      // Declining a 1:1 ring ends it for the caller too.
      if (call.maxParticipants <= 2) {
        await endCallMut({ variables: { callId: call.id } });
      }
    } catch {
      // ignore
    }
  }, [endCallMut, incomingCall]);

  const hangUp = useCallback(async () => {
    const call = activeCall;
    const callId = call?.id ?? activeCallIdRef.current;
    const maxParticipants = call?.maxParticipants ?? 2;
    cleanupSession(true);
    setActiveCall(null);
    if (!callId) return;
    try {
      if (maxParticipants <= 2) {
        await endCallMut({ variables: { callId } });
      } else {
        await leaveCallMut({ variables: { callId } });
      }
    } catch {
      try {
        await endCallMut({ variables: { callId } });
      } catch {
        // ignore
      }
    }
  }, [activeCall, cleanupSession, endCallMut, leaveCallMut]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next);
    if (activeCall) {
      await updateMediaMut({
        variables: { input: { callId: activeCall.id, muted: next } },
      });
    }
  }, [activeCall, muted, updateMediaMut]);

  const toggleCamera = useCallback(async () => {
    const next = !cameraOff;
    setCameraOff(next);
    sessionRef.current?.setCameraOff(next);
    if (activeCall) {
      await updateMediaMut({
        variables: { input: { callId: activeCall.id, cameraOff: next } },
      });
    }
  }, [activeCall, cameraOff, updateMediaMut]);

  useEffect(() => {
    return () => cleanupSession(true);
  }, [cleanupSession]);

  const value = useMemo(
    () => ({
      activeCall,
      incomingCall,
      localStream,
      remoteStreams,
      muted,
      cameraOff,
      error,
      startCall,
      acceptCall,
      declineCall,
      hangUp,
      toggleMute,
      toggleCamera,
    }),
    [
      activeCall,
      incomingCall,
      localStream,
      remoteStreams,
      muted,
      cameraOff,
      error,
      startCall,
      acceptCall,
      declineCall,
      hangUp,
      toggleMute,
      toggleCamera,
    ],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {error && !activeCall ? (
        <div
          role="alert"
          className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-xl bg-destructive/95 px-4 py-3 text-sm text-white shadow-elev sm:inset-x-auto sm:right-4"
        >
          <p className="font-medium">Call failed</p>
          <p className="mt-1 opacity-90">{error}</p>
          <button
            type="button"
            className="mt-2 text-xs underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {incomingCall ? <IncomingCallBanner /> : null}
      {activeCall ? <CallOverlay /> : null}
    </CallContext.Provider>
  );
}
