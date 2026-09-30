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
