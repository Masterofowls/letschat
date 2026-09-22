import {
  SIGNAL_SUBSCRIBE_GRACE_MS,
} from '../../components/CallProvider';

describe('call connection timing', () => {
  it('waits for signal subscription before first WebRTC offer', () => {
    // Prevents "Waiting for opponent" when answers arrive before callSignal is live.
    expect(SIGNAL_SUBSCRIBE_GRACE_MS).toBeGreaterThanOrEqual(300);
  });
});
