import { healthUrlFromGraphql, startApiKeepAlive } from '../api-keepalive';

describe('api-keepalive', () => {
  it('passes through the GraphQL URL for keep-alive pings', () => {
    expect(healthUrlFromGraphql('https://letschat-api-6k8g.onrender.com/graphql')).toBe(
      'https://letschat-api-6k8g.onrender.com/graphql',
    );
  });

  it('posts a lightweight GraphQL probe on an interval', () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as never;

    const stop = startApiKeepAlive('https://example.com/graphql', 1000);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/graphql',
      expect.objectContaining({ method: 'POST' }),
    );
    jest.advanceTimersByTime(1000);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    stop();
    jest.useRealTimers();
  });
});
