import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges conflicting Tailwind classes, keeping the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('joins non-conflicting classes', () => {
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('applies conditional classes via clsx object syntax', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});
