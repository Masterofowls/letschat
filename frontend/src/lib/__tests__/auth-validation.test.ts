import {
  evaluatePassword,
  generateSecurePassword,
  validateEmailFormat,
  validateUsernameFormat,
} from '@/lib/auth-validation';

describe('auth-validation', () => {
  it('validates email format', () => {
    expect(validateEmailFormat('bad')).toBeTruthy();
    expect(validateEmailFormat('ada@example.com')).toBeNull();
  });

  it('validates username format', () => {
    expect(validateUsernameFormat('ab')).toBeTruthy();
    expect(validateUsernameFormat('good_user')).toBeNull();
  });

  it('scores passwords and generates a strong one', () => {
    expect(evaluatePassword('short').ok).toBe(false);
    expect(evaluatePassword('Secret1x').ok).toBe(true);
    const generated = generateSecurePassword(20);
    expect(generated.length).toBe(20);
    expect(evaluatePassword(generated).score).toBeGreaterThanOrEqual(4);
  });
});
