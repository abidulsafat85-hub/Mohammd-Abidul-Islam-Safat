export function getTodayString(): string {
  // Current local time from metadata: 2026-09-19
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatDateFull(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDayOnly(dateString: string): { dayName: string; dayNum: number; monthYear: string } {
  if (!dateString) return { dayName: '', dayNum: 0, monthYear: '' };
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return {
    dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
    dayNum: day,
    monthYear: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

export function formatMonthLabel(monthString: string): string {
  if (!monthString) return '';
  const [year, month] = monthString.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getAvailableMonths(): { value: string; label: string }[] {
  const list: { value: string; label: string }[] = [];
  const now = new Date();
  const currYear = now.getFullYear();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Include previous year, current year, and next year dynamically
  for (let y = currYear - 1; y <= currYear + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      const val = `${y}-${String(m).padStart(2, '0')}`;
      list.push({
        value: val,
        label: `${months[m - 1]} ${y}`,
      });
    }
  }

  return list;
}

export function isToday(dateString: string): boolean {
  return dateString === getTodayString();
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const BANGLA_NUMS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

export function formatMonthBangla(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const monthName = banglaMonths[monthIdx] || month;
  const banglaYear = String(year).replace(/[0-9]/g, (d) => BANGLA_NUMS[d] || d);
  return `${monthName} ${banglaYear}`;
}

