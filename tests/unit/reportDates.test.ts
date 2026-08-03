import { lastNMonthsRange, monthRange, formatPeriodLabel } from '@/lib/reportDates';

describe('lastNMonthsRange', () => {
  it('n=1 returns just the current month, UTC-bounded', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 7, 15))); // Aug 15 2026
    const { from, to } = lastNMonthsRange(1);
    expect(from).toBe(new Date(Date.UTC(2026, 7, 1)).toISOString());
    expect(to).toBe(new Date(Date.UTC(2026, 7, 31, 23, 59, 59)).toISOString());
    jest.useRealTimers();
  });

  it('rolls back into the previous year when n spans across January', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 0, 15))); // Jan 15 2026
    const { from } = lastNMonthsRange(6);
    // Jan back 5 months (n-1) -> Aug 2025
    expect(from).toBe(new Date(Date.UTC(2025, 7, 1)).toISOString());
    jest.useRealTimers();
  });
});

describe('monthRange', () => {
  it('January does not spill into December of the previous year', () => {
    const { from, to } = monthRange(1, 2026);
    expect(from).toBe(new Date(Date.UTC(2026, 0, 1)).toISOString());
    expect(to).toBe(new Date(Date.UTC(2026, 0, 31, 23, 59, 59)).toISOString());
  });

  it('December does not spill into January of the next year', () => {
    const { from, to } = monthRange(12, 2026);
    expect(from).toBe(new Date(Date.UTC(2026, 11, 1)).toISOString());
    expect(to).toBe(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)).toISOString());
  });

  it('February in a leap year ends on the 29th', () => {
    const { to } = monthRange(2, 2028);
    expect(to).toBe(new Date(Date.UTC(2028, 1, 29, 23, 59, 59)).toISOString());
  });
});

describe('formatPeriodLabel', () => {
  it('formats a day-granularity period as DD/MM', () => {
    expect(formatPeriodLabel('2026-08-03')).toBe('03/08');
  });

  it('formats a month-granularity period as ThM/YYYY without zero-padding', () => {
    expect(formatPeriodLabel('2026-08')).toBe('Th8/2026');
  });

  it('returns a bare year unchanged', () => {
    expect(formatPeriodLabel('2026')).toBe('2026');
  });

  it('returns an empty string unchanged', () => {
    expect(formatPeriodLabel('')).toBe('');
  });
});
