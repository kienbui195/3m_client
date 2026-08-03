import { getCategoryIcon, CATEGORY_ICON_MAP } from '@/lib/categoryIcons';
import { TagIcon } from '@phosphor-icons/react';

describe('getCategoryIcon', () => {
  it('returns the mapped icon component for a known name', () => {
    expect(getCategoryIcon('ForkKnife')).toBe(CATEGORY_ICON_MAP.ForkKnife);
  });

  it('falls back to TagIcon for null', () => {
    expect(getCategoryIcon(null)).toBe(TagIcon);
  });

  it('falls back to TagIcon for undefined', () => {
    expect(getCategoryIcon(undefined)).toBe(TagIcon);
  });

  it('falls back to TagIcon for an unknown icon name', () => {
    expect(getCategoryIcon('NotARealIcon')).toBe(TagIcon);
  });
});
