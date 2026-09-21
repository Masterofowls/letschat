import { healthUrlFromGraphql } from '../api-keepalive';

describe('api-keepalive', () => {
  it('derives /health from GraphQL URL', () => {
    expect(healthUrlFromGraphql('https://letschat-api-6k8g.onrender.com/graphql')).toBe(
      'https://letschat-api-6k8g.onrender.com/health',
    );
  });
});
