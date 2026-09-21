/** Who should receive a callUpdated subscription event. */
export function shouldReceiveCallUpdate(
  userId: number,
  call: {
    createdById: number;
    targetUserIds?: number[] | null;
    participants?: Array<{ userId: number }> | null;
  },
): boolean {
  if (call.createdById === userId) return true;
  if (call.targetUserIds?.includes(userId)) return true;
  return Boolean(call.participants?.some((p) => p.userId === userId));
}

/** Who should receive a callSignal subscription event. */
export function shouldReceiveCallSignal(
  userId: number,
  signal: {
    callId: number;
    fromUserId: number;
    toUserId?: number | null;
  },
  subscribedCallId: number,
): boolean {
  if (signal.callId !== subscribedCallId) return false;
  if (signal.fromUserId === userId) return false;
  if (signal.toUserId != null && signal.toUserId !== userId) return false;
  return true;
}
