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
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client';
import {
  Call as StreamCallObj,
  StreamVideoClient,
  type User as StreamUser,
} from '@stream-io/video-react-sdk';
import { ME_QUERY } from '@/lib/graphql/queries';
import { CALLS_ENABLED } from '@/lib/feature-flags';
import {
  CALL_UPDATED_SUBSCRIPTION,
  END_CALL,
  JOIN_CALL,
  LEAVE_CALL,
  START_CALL,
  STREAM_VIDEO_AUTH,
  UPDATE_CALL_MEDIA,
} from '@/lib/graphql/calls';
import { describePermissionError } from '@/lib/media-permissions';
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
  streamCallId?: string;
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
  streamClient: StreamVideoClient | null;
  streamCall: StreamCallObj | null;
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

const CallContext = createContext<CallContextValue | null>(null);

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

/** Wraps app when CALLS_ENABLED; GetStream handles media, GraphQL owns lifecycle. */
export function CallProvider({ children, currentUserId: currentUserIdProp }: Props) {
  const meQuery = useQuery(ME_QUERY, { skip: currentUserIdProp != null });
  const currentUserId = currentUserIdProp ?? meQuery.data?.me?.id;
  const me = meQuery.data?.me;

  if (!CALLS_ENABLED) {
    return <>{children}</>;
  }

  return (
    <CallProviderActive currentUserId={currentUserId} me={me}>
      {children}
    </CallProviderActive>
  );
}

function CallProviderActive({
  children,
  currentUserId,
  me,
}: {
  children: ReactNode;
  currentUserId?: number;
  me?: {
    id: number;
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}) {
  const apollo = useApolloClient();
  const [activeCall, setActiveCall] = useState<CallGql | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallGql | null>(null);
  const [streamCall, setStreamCall] = useState<StreamCallObj | null>(null);
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const streamCallRef = useRef<StreamCallObj | null>(null);
  const activeCallIdRef = useRef<number | null>(null);

  const [startCallMut] = useMutation(START_CALL);
  const [joinCallMut] = useMutation(JOIN_CALL);
  const [leaveCallMut] = useMutation(LEAVE_CALL);
  const [endCallMut] = useMutation(END_CALL);
  const [updateMediaMut] = useMutation(UPDATE_CALL_MEDIA);

  const leaveStreamMedia = useCallback(async () => {
    const call = streamCallRef.current;
    streamCallRef.current = null;
    setStreamCall(null);
    if (call) {
      try {
        await call.leave();
      } catch {
        // already left
      }
    }
  }, []);

  const disconnectStream = useCallback(async () => {
    await leaveStreamMedia();
    const client = clientRef.current;
    clientRef.current = null;
    setStreamClient(null);
    if (client) {
      try {
        await client.disconnectUser();
      } catch {
        // ignore
      }
    }
  }, [leaveStreamMedia]);

  const ensureStreamClient = useCallback(async (): Promise<StreamVideoClient> => {
    if (clientRef.current) return clientRef.current;
    if (!currentUserId) {
      throw new Error('Not signed in');
    }

    const { data } = await apollo.query({
      query: STREAM_VIDEO_AUTH,
      fetchPolicy: 'network-only',
    });
    const auth = data?.streamVideoAuth as {
      apiKey: string;
      token: string;
      userId: string;
      callType: string;
    };
    if (!auth?.apiKey || !auth?.token) {
      throw new Error('Could not get GetStream credentials');
    }

    const user: StreamUser = {
      id: auth.userId,
      name: me?.displayName || me?.username || `User ${currentUserId}`,
      image: me?.avatarUrl || undefined,
    };

    const client = new StreamVideoClient({
      apiKey: auth.apiKey,
      user,
      token: auth.token,
      tokenProvider: async () => {
        const refreshed = await apollo.query({
          query: STREAM_VIDEO_AUTH,
          fetchPolicy: 'network-only',
        });
        return refreshed.data?.streamVideoAuth?.token as string;
      },
    });
    clientRef.current = client;
    setStreamClient(client);
    return client;
  }, [apollo, currentUserId, me?.avatarUrl, me?.displayName, me?.username]);

  const joinStreamMedia = useCallback(
    async (call: CallGql) => {
      const client = await ensureStreamClient();
      await leaveStreamMedia();

      const streamId = call.streamCallId || `letschat-${call.id}`;
      const { data } = await apollo.query({
        query: STREAM_VIDEO_AUTH,
        fetchPolicy: 'cache-first',
      });
      const callType = (data?.streamVideoAuth?.callType as string) || 'default';
      const stream = client.call(callType, streamId);

      if (call.mediaType === 'audio') {
        await stream.camera.disable();
      } else {
        await stream.camera.enable();
      }
      await stream.microphone.enable();

      await stream.join({ create: true });
      streamCallRef.current = stream;
      setStreamCall(stream);
      setCameraOff(call.mediaType === 'audio');
      setMuted(false);
    },
    [apollo, ensureStreamClient, leaveStreamMedia],
  );

  const cleanupSession = useCallback(async () => {
    activeCallIdRef.current = null;
    await leaveStreamMedia();
  }, [leaveStreamMedia]);

  useSubscription(CALL_UPDATED_SUBSCRIPTION, {
    skip: !currentUserId,
    onData: ({ data }) => {
      const raw = data.data?.callUpdated as CallGql | undefined;
      if (!raw || !currentUserId) return;
      const call = normalizeCallPayload(raw);

      if (call.status === 'ended') {
        if (activeCallIdRef.current === call.id || incomingCall?.id === call.id) {
          void cleanupSession();
          setActiveCall(null);
        }
        setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
        return;
      }

      const inCall = call.participants?.some((p) => p.userId === currentUserId);
      if (inCall && activeCallIdRef.current === call.id) {
        setActiveCall(call);
        setIncomingCall(null);
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

  const startCall = useCallback(
    async (roomId: number, mediaType: CallMedia) => {
      if (!currentUserId) return;
      setError(null);
      try {
        const result = await startCallMut({
          variables: {
            input: { roomId, mediaType: toGraphqlCallMediaType(mediaType) },
          },
        });
        const call = normalizeCallPayload(result.data?.startCall as CallGql);
        activeCallIdRef.current = call.id;
        setActiveCall(call);
        await joinStreamMedia(call);
      } catch (err) {
        await cleanupSession();
        setActiveCall(null);
        setError(describePermissionError(err));
      }
    },
    [cleanupSession, currentUserId, joinStreamMedia, startCallMut],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    setError(null);
    try {
      const result = await joinCallMut({ variables: { callId: incomingCall.id } });
      const call = normalizeCallPayload(result.data?.joinCall as CallGql);
      setIncomingCall(null);
      activeCallIdRef.current = call.id;
      setActiveCall(call);
      await joinStreamMedia(call);
    } catch (err) {
      await cleanupSession();
      setActiveCall(null);
      setError(describePermissionError(err));
    }
  }, [cleanupSession, incomingCall, joinCallMut, joinStreamMedia]);

  const declineCall = useCallback(async () => {
    const call = incomingCall;
    setIncomingCall(null);
    if (!call) return;
    try {
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
    await cleanupSession();
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
    const call = streamCallRef.current;
    if (call) {
      if (next) await call.microphone.disable();
      else await call.microphone.enable();
    }
    if (activeCall) {
      await updateMediaMut({
        variables: { input: { callId: activeCall.id, muted: next } },
      });
    }
  }, [activeCall, muted, updateMediaMut]);

  const toggleCamera = useCallback(async () => {
    if (activeCall?.mediaType !== 'video') return;
    const next = !cameraOff;
    setCameraOff(next);
    const call = streamCallRef.current;
    if (call) {
      if (next) await call.camera.disable();
      else await call.camera.enable();
    }
    if (activeCall) {
      await updateMediaMut({
        variables: { input: { callId: activeCall.id, cameraOff: next } },
      });
    }
  }, [activeCall, cameraOff, updateMediaMut]);

  useEffect(() => {
    return () => {
      void disconnectStream();
    };
  }, [disconnectStream]);

  const value = useMemo(
    () => ({
      activeCall,
      incomingCall,
      streamClient,
      streamCall,
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
      streamClient,
      streamCall,
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
          <button type="button" className="mt-2 text-xs underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {incomingCall ? <IncomingCallBanner /> : null}
      {activeCall ? <CallOverlay /> : null}
    </CallContext.Provider>
  );
}
