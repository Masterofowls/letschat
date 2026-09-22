import { CALLS_ENABLED } from '../feature-flags';

describe('calls feature flag', () => {
  it('enables GetStream-backed calls in the UI', () => {
    expect(CALLS_ENABLED).toBe(true);
  });
});
