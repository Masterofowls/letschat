import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and resolves conflicts', () => {
    expect(cn('px-2', 'px-4', false && 'hidden', 'text-sm')).toBe('px-4 text-sm');
  });
});
