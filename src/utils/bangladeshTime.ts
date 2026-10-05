// Central Bangladesh Time (Asia/Dhaka, UTC+6) Utility for both client and server

export const BANGLADESH_TIMEZONE = 'Asia/Dhaka';
export const UPCOMING_DAYS = 7;

export const BANGLA_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

export function toBanglaDigits(val: number | string): string {
  return String(val).replace(/[0-9]/g, (digit) => BANGLA_DIGITS[digit] || digit);
}

// Fixed lookup table for Bangla weekdays (Sunday = 0 to Saturday = 6)
export const BANGLA_WEEKDAYS = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];

// Returns the current Date shifted to Bangladesh time
export function getBangladeshNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // Bangladesh is UTC+6 (offset: +6 hours = 21,600,000 ms)
  return new Date(utc + 6 * 3600000);
}

// Returns today's date formatted as YYYY-MM-DD in Asia/Dhaka
export function getBangladeshToday(): string {
  const bdNow = getBangladeshNow();
  const y = bdNow.getFullYear();
  const m = String(bdNow.getMonth() + 1).padStart(2, '0');
  const d = String(bdNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns tomorrow's date formatted as YYYY-MM-DD in Asia/Dhaka
export function getBangladeshTomorrow(): string {
  const bdNow = getBangladeshNow();
  bdNow.setDate(bdNow.getDate() + 1);
  const y = bdNow.getFullYear();
  const m = String(bdNow.getMonth() + 1).padStart(2, '0');
  const d = String(bdNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to get Bangladesh Date object from YYYY-MM-DD string
export function parseBangladeshDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function getBanglaWeekday(dateOrStr: Date | string): string {
  let date: Date;
  if (typeof dateOrStr === 'string') {
    date = parseBangladeshDate(dateOrStr);
  } else {
    date = dateOrStr;
  }
  return BANGLA_WEEKDAYS[date.getDay()];
}

export function getPreviousDayBanglaWeekday(dateStr: string): string {
  const date = parseBangladeshDate(dateStr);
  date.setDate(date.getDate() - 1);
  return BANGLA_WEEKDAYS[date.getDay()];
}

export interface MealLockStatus {
  isLocked: boolean;
  lockTimeStr: string;
  hoursRemaining: number;
  minutesRemaining: number;
  countdownTextBangla: string;
}

/**
 * Shared meal lock status function (Part H rule 3)
 * A member can change a day's lunch and dinner only until 11:59:59 PM Bangladesh time
 * of the PREVIOUS day. At 12:00:00 AM (midnight) of the target day, it locks automatically.
 */
export function getMealLockStatus(targetDateStr: string, nowBangladesh: Date = getBangladeshNow()): MealLockStatus {
  const [year, month, day] = targetDateStr.split('-').map(Number);

  // Bangladesh midnight of target day in UTC timestamp
  // UTC+6: Midnight in BD is (18:00 UTC of previous day)
  const targetMidnightUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - 6 * 3600000;

  // Current time in true UTC ms
  const nowUtcMs = nowBangladesh.getTime() - (nowBangladesh.getTimezoneOffset() !== 0 ? 0 : 6 * 3600000);
  const trueNowMs = Date.now();

  // If running in test or with overridden nowBangladesh:
  const diffMs = targetMidnightUtcMs - (nowBangladesh === undefined ? trueNowMs : nowBangladesh.getTime() - 6 * 3600000);

  // Derive YYYY-MM-DD from the provided nowBangladesh
  const nowY = nowBangladesh.getFullYear();
  const nowM = String(nowBangladesh.getMonth() + 1).padStart(2, '0');
  const nowD = String(nowBangladesh.getDate()).padStart(2, '0');
  const currentBdDate = `${nowY}-${nowM}-${nowD}`;

  if (targetDateStr <= currentBdDate) {
    return {
      isLocked: true,
      lockTimeStr: 'লক হয়ে গেছে',
      hoursRemaining: 0,
      minutesRemaining: 0,
      countdownTextBangla: 'লক হয়ে গেছে',
    };
  }

  // Target is in future (e.g. tomorrow or later)
  // Calculate remaining time until previous day 23:59:59 (which is midnight tonight for tomorrow)
  const bdNow = nowBangladesh;
  const targetMidnightInBd = new Date(year, month - 1, day, 0, 0, 0, 0);
  const remainingMs = targetMidnightInBd.getTime() - bdNow.getTime();

  if (remainingMs <= 0) {
    return {
      isLocked: true,
      lockTimeStr: 'লক হয়ে গেছে',
      hoursRemaining: 0,
      minutesRemaining: 0,
      countdownTextBangla: 'লক হয়ে গেছে',
    };
  }

  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const countdownTextBangla = `লক হতে বাকি: ${toBanglaDigits(hours)} ঘণ্টা ${toBanglaDigits(minutes)} মিনিট`;

  return {
    isLocked: false,
    lockTimeStr: 'রাত ১১:৫৯',
    hoursRemaining: hours,
    minutesRemaining: minutes,
    countdownTextBangla,
  };
}

export function isMealDayLocked(targetDate: string, nowBangladesh?: Date): boolean {
  return getMealLockStatus(targetDate, nowBangladesh).isLocked;
}

// Formats a YYYY-MM-DD date into Bangla format e.g. "২ অক্টোবর ২০২৬"
export function formatBanglaDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = toBanglaDigits(parts[0]);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = toBanglaDigits(parseInt(parts[2], 10));

  const months = [
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ];

  const monthName = months[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

export function formatBanglaDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = toBanglaDigits(parseInt(parts[2], 10));

  const shortMonths = [
    'জানু',
    'ফেব্রু',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ',
    'অক্টো',
    'নভে',
    'ডিসে',
  ];

  return `${day} ${shortMonths[monthIdx] || parts[1]}`;
}
