import { describe, it, expect } from 'vitest';
import {
  getMealLockStatus,
  isMealDayLocked,
  getBanglaWeekday,
  getPreviousDayBanglaWeekday,
  formatBanglaDate,
  UPCOMING_DAYS,
  toBanglaDigits,
} from './bangladeshTime';

describe('Part H: 7-Day Window and Auto-Lock Rules', () => {
  it('1. Lock boundary test: 23:59:59 is allowed, 00:00:00 is rejected', () => {
    const targetDate = '2026-10-02'; // Tomorrow

    // 1 second before midnight: 2026-10-01 23:59:59 in BD time
    const beforeMidnightBD = new Date(2026, 9, 1, 23, 59, 59); // Month is 0-indexed: 9 = October
    const statusBefore = getMealLockStatus(targetDate, beforeMidnightBD);
    expect(statusBefore.isLocked).toBe(false);

    // Exactly at midnight: 2026-10-02 00:00:00 in BD time
    const atMidnightBD = new Date(2026, 9, 2, 0, 0, 0);
    const statusAtMidnight = getMealLockStatus(targetDate, atMidnightBD);
    expect(statusAtMidnight.isLocked).toBe(true);
  });

  it('2. Bangla Weekday lookup matches fixed table', () => {
    // 2026-10-02 is a Friday
    expect(getBanglaWeekday('2026-10-02')).toBe('শুক্রবার');
    // 2026-10-03 is a Saturday
    expect(getBanglaWeekday('2026-10-03')).toBe('শনিবার');
    // Previous day of 2026-10-02 is Thursday
    expect(getPreviousDayBanglaWeekday('2026-10-02')).toBe('বৃহস্পতিবার');
  });

  it('3. Date formatting in Bangla', () => {
    expect(formatBanglaDate('2026-10-02')).toBe('২ অক্টোবর ২০২৬');
    expect(toBanglaDigits(7)).toBe('৭');
    expect(UPCOMING_DAYS).toBe(7);
  });

  it('4. Today or past dates are strictly locked', () => {
    const pastDate = '2026-09-01';
    expect(isMealDayLocked(pastDate)).toBe(true);
  });
});
