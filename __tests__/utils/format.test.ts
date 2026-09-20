import { describe, it, expect } from 'vitest';
import { formatIsoDate } from '@/lib/utils/format';

describe('formatIsoDate', () => {
  it('formats a mid-year date correctly', () => {
    expect(formatIsoDate('2024-06-15')).toBe('Jun 2024');
  });

  it('formats a January date without timezone drift', () => {
    // "2024-01-01" must not shift to Dec 2023 in any timezone
    expect(formatIsoDate('2024-01-01')).toBe('Jan 2024');
  });

  it('formats a December date without timezone drift', () => {
    expect(formatIsoDate('2023-12-31')).toBe('Dec 2023');
  });

  it('ignores the day component and formats by month and year only', () => {
    expect(formatIsoDate('2022-03-01')).toBe('Mar 2022');
    expect(formatIsoDate('2022-03-31')).toBe('Mar 2022');
  });
});
