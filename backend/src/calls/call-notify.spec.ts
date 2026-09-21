import { shouldReceiveCallSignal, shouldReceiveCallUpdate } from './call-notify';

describe('call realtime notify filters', () => {
  it('delivers ringing updates to the targeted peer', () => {
    expect(
      shouldReceiveCallUpdate(2, {
        createdById: 1,
        targetUserIds: [2],
        participants: [{ userId: 1 }],
      }),
    ).toBe(true);
  });

  it('delivers hangup to callee even when active participants were cleared', () => {
    // After endCall, active participants are empty — targetUserIds must still notify.
    expect(
      shouldReceiveCallUpdate(2, {
        createdById: 1,
        targetUserIds: [2],
        participants: [],
      }),
    ).toBe(true);
  });

  it('delivers hangup when left participants remain on the payload', () => {
    expect(
      shouldReceiveCallUpdate(2, {
        createdById: 1,
        targetUserIds: undefined,
        participants: [{ userId: 1 }, { userId: 2 }],
      }),
    ).toBe(true);
  });

  it('does not leak call updates to unrelated users', () => {
    expect(
      shouldReceiveCallUpdate(99, {
        createdById: 1,
        targetUserIds: [2],
        participants: [{ userId: 1 }, { userId: 2 }],
      }),
    ).toBe(false);
  });

  it('routes signals only to the intended peer for the subscribed call', () => {
    expect(
      shouldReceiveCallSignal(
        2,
        { callId: 10, fromUserId: 1, toUserId: 2 },
        10,
      ),
    ).toBe(true);
    expect(
      shouldReceiveCallSignal(
        2,
        { callId: 10, fromUserId: 1, toUserId: 2 },
        11,
      ),
    ).toBe(false);
    expect(
      shouldReceiveCallSignal(
        1,
        { callId: 10, fromUserId: 1, toUserId: 2 },
        10,
      ),
    ).toBe(false);
  });
});
