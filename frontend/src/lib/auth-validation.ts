export type FieldStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export function validateEmailFormat(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
  return null;
}

export function validateUsernameFormat(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'At least 3 characters';
  if (username.length > 32) return 'Max 32 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Only letters, numbers, and underscores';
  }
  return null;
}

export type PasswordStrength = {
  score: number;
  label: string;
  checks: { id: string; label: string; ok: boolean }[];
  ok: boolean;
  message: string | null;
};

export function evaluatePassword(password: string): PasswordStrength {
  const checks = [
    { id: 'length', label: '8+ characters', ok: password.length >= 8 },
    { id: 'lower', label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { id: 'upper', label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { id: 'number', label: 'Number', ok: /\d/.test(password) },
    { id: 'special', label: 'Symbol (!@#$…)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const ok = checks.slice(0, 4).every((c) => c.ok);
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  return {
    score,
    label: labels[score] ?? 'Too weak',
    checks,
    ok,
    message: password && !ok ? 'Use upper, lower, number, and 8+ chars' : null,
  };
}

export function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const symbols = '!@#$%^&*-_=+';
  const all = upper + lower + nums + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(lower), pick(nums), pick(symbols)];
  const bytes = new Uint32Array(Math.max(length - 4, 0));
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 1e9);
  }
  for (let i = 0; i < bytes.length; i += 1) {
    chars.push(all[bytes[i] % all.length]);
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
