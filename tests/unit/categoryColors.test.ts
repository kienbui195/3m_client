import { getCategoryColorClass } from '@/lib/categoryColors';

describe('getCategoryColorClass', () => {
  it('returns the mapped class for a known color', () => {
    expect(getCategoryColorClass('red')).toBe('bg-red-500/10 text-red-600 dark:text-red-400');
  });

  it('falls back to the default class for null', () => {
    expect(getCategoryColorClass(null)).toBe('bg-primary/10 text-primary');
  });

  it('falls back to the default class for undefined', () => {
    expect(getCategoryColorClass(undefined)).toBe('bg-primary/10 text-primary');
  });

  it('falls back to the default class for an unknown color name', () => {
    expect(getCategoryColorClass('mystery-color')).toBe('bg-primary/10 text-primary');
  });

  it('is case-sensitive - a mismatched case falls back to default', () => {
    expect(getCategoryColorClass('Red')).toBe('bg-primary/10 text-primary');
  });
});
