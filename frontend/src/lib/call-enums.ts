/** Nest GraphQL exposes enum *keys* (AUDIO/VIDEO) unless registered otherwise. */
export type CallMedia = 'audio' | 'video';
export type CallStatusNorm = 'ringing' | 'active' | 'ended';

export function normalizeCallMediaType(value: string | null | undefined): CallMedia {
  const v = (value ?? '').toUpperCase();
  return v === 'VIDEO' ? 'video' : 'audio';
}

export function toGraphqlCallMediaType(value: CallMedia): 'AUDIO' | 'VIDEO' {
  return value === 'video' ? 'VIDEO' : 'AUDIO';
}

export function normalizeCallStatus(value: string | null | undefined): CallStatusNorm {
  const v = (value ?? '').toUpperCase();
  if (v === 'ACTIVE') return 'active';
  if (v === 'ENDED') return 'ended';
  return 'ringing';
}

export function normalizeCallPayload<T extends { mediaType?: string; status?: string }>(
  call: T,
): T & { mediaType: CallMedia; status: CallStatusNorm } {
  return {
    ...call,
    mediaType: normalizeCallMediaType(call.mediaType),
    status: normalizeCallStatus(call.status),
  };
}
