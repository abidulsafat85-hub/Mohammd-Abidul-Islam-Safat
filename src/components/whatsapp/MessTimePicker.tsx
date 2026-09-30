import React from 'react';
import { Clock, Check, Trash2, RotateCcw } from 'lucide-react';

export interface TimePreset {
  label: string;
  val: string; // 'HH:mm'
}

interface MessTimePickerProps {
  label: string;
  badge?: string;
  value: string; // 'HH:mm' 24-hour string (e.g. '20:00')
  onChange: (time24: string) => void;
  presets?: TimePreset[];
  helperText?: string;
  isDeleted?: boolean;
  onDelete?: () => void;
  onRestore?: () => void;
  deleteNoticeTitle?: string;
  deleteNoticeDesc?: string;
  accentColor?: 'emerald' | 'indigo' | 'amber' | 'rose';
}

/**
 * Parses a 24-hour 'HH:mm' time string into 12-hour hour, minute, and period ('AM' | 'PM')
 */
export const parse24To12 = (time24?: string) => {
  if (!time24 || !time24.includes(':')) {
    return { hour12: 8, minute: '00', period: 'PM' as const };
  }
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10) || 0;
  const minute = (mStr || '00').padStart(2, '0');
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
};

/**
 * Converts 12-hour parts into a 24-hour 'HH:mm' string
 */
export const format12To24 = (hour12: number, minute: string, period: 'AM' | 'PM'): string => {
  let h = hour12 % 12;
  if (period === 'PM') {
    h += 12;
  }
  return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

/**
 * Returns human-friendly Bengali time text
 */
export const getBengaliTimeLabel = (time24?: string): string => {
  if (!time24 || !time24.includes(':')) return '';
  const { hour12, minute, period } = parse24To12(time24);
  const hourBn = String(hour12).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
  const minBn = minute.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
  const [h24] = time24.split(':').map((s) => parseInt(s, 10) || 0);

  let prefix = '';
  if (h24 >= 5 && h24 < 12) prefix = 'সকাল';
  else if (h24 >= 12 && h24 < 16) prefix = 'দুপুর';
  else if (h24 >= 16 && h24 < 19) prefix = 'বিকাল';
  else prefix = 'রাত';

  return `${prefix} ${hourBn}:${minBn} ${period}`;
};

export const MessTimePicker: React.FC<MessTimePickerProps> = ({
  label,
  badge,
  value = '20:00',
  onChange,
  presets = [],
  helperText,
  isDeleted = false,
  onDelete,
  onRestore,
  deleteNoticeTitle,
  deleteNoticeDesc,
  accentColor = 'emerald',
}) => {
  if (isDeleted) {
    return (
      <div className="p-3.5 rounded-2xl bg-rose-50/90 border-2 border-dashed border-rose-300 flex flex-col justify-between space-y-2">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
              <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{deleteNoticeTitle || `${label}: ডিলিট করা হয়েছে`}</span>
            </span>
            {onRestore && (
              <button
                type="button"
                onClick={onRestore}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>পুনরুদ্ধার</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-rose-800 mt-1.5 leading-snug">
            {deleteNoticeDesc || 'এই পোলটি বর্তমানে বন্ধ রয়েছে।'}
          </p>
        </div>
        <div className="text-[10px] font-bold text-rose-700 bg-white/80 px-2 py-1 rounded-md border border-rose-200 text-center">
          ✅ এই সময়সূচীতে কোনো মেসেজ পাঠানো হবে না
        </div>
      </div>
    );
  }

  const { hour12, minute, period } = parse24To12(value);
  const bengaliDisplay = getBengaliTimeLabel(value);

  const handleHourChange = (newHour: number) => {
    const updated = format12To24(newHour, minute, period);
    onChange(updated);
  };

  const handleMinuteChange = (newMin: string) => {
    const updated = format12To24(hour12, newMin, period);
    onChange(updated);
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    const updated = format12To24(hour12, minute, newPeriod);
    onChange(updated);
  };

  // Minutes options: 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
  const minuteOptions = [
    '00', '05', '10', '15', '20', '25',
    '30', '35', '40', '45', '50', '55'
  ];
  if (!minuteOptions.includes(minute)) {
    minuteOptions.push(minute);
    minuteOptions.sort();
  }

  return (
    <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-500 shadow-xs space-y-2.5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-emerald-600" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {badge}
            </span>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 cursor-pointer"
              title="এই পোল ডিলিট বা বন্ধ করুন"
            >
              <Trash2 className="h-2.5 w-2.5" />
              <span>ডিলিট</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Time Display Pill */}
      <div className="flex items-center justify-between bg-emerald-50/90 border border-emerald-200 px-3 py-1.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>নির্বাচিত সময়:</span>
          <span className="text-emerald-800 font-extrabold bg-white px-2 py-0.5 rounded-md border border-emerald-300">
            {bengaliDisplay}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>

      {/* Time Selectors Row: Hour, Minute, AM/PM */}
      <div className="grid grid-cols-3 gap-2">
        {/* Hour Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
            ঘণ্টা (Hour)
          </label>
          <select
            value={hour12}
            onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
            className="w-full px-2 py-1.5 rounded-lg border-2 border-slate-300 font-black text-sm text-slate-900 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
              const hBn = String(h).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
              return (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')} ({hBn} টা)
                </option>
              );
            })}
          </select>
        </div>

        {/* Minute Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
            মিনিট (Min)
          </label>
          <select
            value={minute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border-2 border-slate-300 font-black text-sm text-slate-900 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {minuteOptions.map((m) => {
              const mBn = m.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
              return (
                <option key={m} value={m}>
                  :{m} ({mBn} মি.)
                </option>
              );
            })}
          </select>
        </div>

        {/* AM/PM Toggle Buttons */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
            বেলা (AM/PM)
          </label>
          <div className="grid grid-cols-2 gap-1 h-[34px]">
            <button
              type="button"
              onClick={() => handlePeriodChange('AM')}
              className={`text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                period === 'AM'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="সকাল (AM)"
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('PM')}
              className={`text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                period === 'PM'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="রাত / দুপুর (PM)"
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Quick Presets Buttons */}
      {presets.length > 0 && (
        <div className="pt-1 border-t border-slate-100">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">
            ⚡ এক ক্লিকে সিলেক্ট করুন:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((preset) => {
              const isSelected = value === preset.val;
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => onChange(preset.val)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                      : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-slate-500 font-medium">
          {helperText}
        </p>
      )}
    </div>
  );
};
