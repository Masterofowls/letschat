import { streamCallIdFor, streamUserIdFor } from './stream-video.service';

describe('stream video id helpers', () => {
  it('maps DB call id to a stable GetStream call id', () => {
    expect(streamCallIdFor(42)).toBe('letschat-42');
  });

  it('maps numeric user ids to Stream string user ids', () => {
    expect(streamUserIdFor(7)).toBe('7');
  });
});
