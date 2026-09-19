import { getToken, setToken } from '@/lib/apollo-client';

describe('token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and reads tokens', () => {
    expect(getToken()).toBeNull();
    setToken('abc');
    expect(getToken()).toBe('abc');
    setToken(null);
    expect(getToken()).toBeNull();
  });
});
