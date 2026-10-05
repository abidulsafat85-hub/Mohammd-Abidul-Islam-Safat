import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Lock, Check } from 'lucide-react';
import {
  getBangladeshNow,
  getBangladeshToday,
  getBangladeshTomorrow,
  getBanglaWeekday,
  getPreviousDayBanglaWeekday,
  formatBanglaDate,
  formatBanglaDateShort,
  toBanglaDigits,
  getMealLockStatus,
  UPCOMING_DAYS,
} from '../../utils/bangladeshTime';

export interface UpcomingMealCardsProps {
  memberId: string;
  meals: Array<{
    date: string;
    mealCount: number;
    lunch?: boolean;
    dinner?: boolean;
    source?: 'default' | 'member' | 'admin';
  }>;
  showToday?: boolean; // When true (on /member/meal page), prepends today's locked card
  onMealUpdated?: () => void;
}

export const UpcomingMealCards: React.FC<UpcomingMealCardsProps> = ({
  memberId,
  meals,
  showToday = false,
  onMealUpdated,
}) => {
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(getBangladeshNow());

  // Update clock every minute for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getBangladeshNow());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const todayStr = getBangladeshToday();
  const tomorrowStr = getBangladeshTomorrow();

  // Generate 7 upcoming days: tomorrow + 6 days
  const upcomingDates = useMemo(() => {
    const list: string[] = [];
    if (showToday) {
      list.push(todayStr);
    }
    const [y, m, d] = tomorrowStr.split('-').map(Number);
    for (let i = 0; i < UPCOMING_DAYS; i++) {
      const dt = new Date(y, m - 1, d + i);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      list.push(`${year}-${month}-${day}`);
    }
    return list;
  }, [showToday, todayStr, tomorrowStr]);

  // Meals lookup map
  const mealsMap = useMemo(() => {
    const map = new Map<
      string,
      { mealCount: number; lunch: boolean; dinner: boolean; source?: 'default' | 'member' | 'admin' }
    >();
    (meals || []).forEach((m) => {
      map.set(m.date, {
        mealCount: Number(m.mealCount) || 0,
        lunch: m.lunch !== undefined ? Boolean(m.lunch) : (Number(m.mealCount) || 0) >= 1,
        dinner: m.dinner !== undefined ? Boolean(m.dinner) : (Number(m.mealCount) || 0) >= 2,
        source: m.source,
      });
    });
    return map;
  }, [meals]);

  // Handler to toggle lunch or dinner for a specific date
  const handleToggle = async (date: string, slot: 'lunch' | 'dinner', currentVal: boolean) => {
    const lockStatus = getMealLockStatus(date, currentTime);
    if (lockStatus.isLocked) {
      showToast('error', 'এই দিনের মিল পরিবর্তনের সময় শেষ হয়ে গেছে (লক করা হয়েছে)।');
      return;
    }

    // Default is ON (lunch = true, dinner = true)
    const currentRecord = mealsMap.get(date) || { mealCount: 2, lunch: true, dinner: true };
    const newLunch = slot === 'lunch' ? !currentVal : currentRecord.lunch;
    const newDinner = slot === 'dinner' ? !currentVal : currentRecord.dinner;
    const newMealCount = (newLunch ? 1 : 0) + (newDinner ? 1 : 0);

    setSavingDate(date);
    try {
      const res = await fetch(`/api/mess/member/${memberId}/meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          date,
          mealCount: newMealCount,
          lunch: newLunch,
          dinner: newDinner,
        }),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { success: false, error: 'সার্ভার রেসপন্স ত্রুটিপূর্ণ' };
      }

      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'পরিবর্তন সেভ করা যায়নি');
      }

      showToast('success', `${formatBanglaDateShort(date)} এর ${slot === 'lunch' ? 'দুপুরের' : 'রাতের'} মিল পরিবর্তিত হয়েছে!`);
      if (onMealUpdated) onMealUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'সংরক্ষণ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setSavingDate(null);
    }
  };

  // Bulk action: all on or all off for a specific date
  const handleBulk = async (date: string, mode: 'ALL_ON' | 'ALL_OFF') => {
    const lockStatus = getMealLockStatus(date, currentTime);
    if (lockStatus.isLocked) {
      showToast('error', 'এই দিনের মিল পরিবর্তনের সময় শেষ হয়ে গেছে (লক করা হয়েছে)।');
      return;
    }

    const newLunch = mode === 'ALL_ON';
    const newDinner = mode === 'ALL_ON';
    const newMealCount = mode === 'ALL_ON' ? 2 : 0;

    setSavingDate(date);
    try {
      const res = await fetch(`/api/mess/member/${memberId}/meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          date,
          mealCount: newMealCount,
          lunch: newLunch,
          dinner: newDinner,
        }),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { success: false, error: 'সার্ভার রেসপন্স ত্রুটিপূর্ণ' };
      }

      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'পরিবর্তন সেভ করা যায়নি');
      }

      showToast('success', `${formatBanglaDateShort(date)} এর সব মিল ${mode === 'ALL_ON' ? 'চালু' : 'বন্ধ'} করা হয়েছে!`);
      if (onMealUpdated) onMealUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setSavingDate(null);
    }
  };

  const tomorrowWeekday = getBanglaWeekday(tomorrowStr);
  const tomorrowLock = getMealLockStatus(tomorrowStr, currentTime);

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 text-white transition-all ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-white" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. TOMORROW'S FEATURED CARD (Dark theme as in screenshot) */}
      {(() => {
        const tomorrowRecord = mealsMap.get(tomorrowStr) || { mealCount: 2, lunch: true, dinner: true };
        const isSaving = savingDate === tomorrowStr;

        return (
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4 relative overflow-hidden">
            {/* Header: Title & Total */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-white">
                  আগামীকালের ({tomorrowWeekday}) এর মিল
                </p>
                <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
                  {formatBanglaDate(tomorrowStr)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400 block font-medium">আগামীকালের মোট মিল:</span>
                <span className="text-lg font-black text-white">
                  {toBanglaDigits(tomorrowRecord.mealCount)} টি
                </span>
              </div>
            </div>

            {/* Countdown / Lock notice */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px]">
              <span className="text-amber-300 font-bold flex items-center gap-1">
                {tomorrowLock.isLocked ? (
                  <>
                    <Lock className="h-3 w-3 text-rose-400" />
                    <span className="text-rose-400">লক হয়ে গেছে — শুধু অ্যাডমিন পরিবর্তন করতে পারবে</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{tomorrowLock.countdownTextBangla}</span>
                  </>
                )}
              </span>
              <span className="text-slate-400">
                রাত ১১:৫৯ (বাংলাদেশ সময়) পর্যন্ত পরিবর্তন করা যাবে। এরপর লক হয়ে যাবে।
              </span>
            </div>

            {/* Admin Edited Badge */}
            {tomorrowRecord.source === 'admin' && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                <span>অ্যাডমিন পরিবর্তন করেছেন</span>
              </div>
            )}

            {/* Lunch & Dinner Big Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Lunch Button */}
              <button
                type="button"
                disabled={tomorrowLock.isLocked || isSaving}
                onClick={() => handleToggle(tomorrowStr, 'lunch', tomorrowRecord.lunch)}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                  tomorrowLock.isLocked ? 'opacity-60 grayscale-[40%]' : ''
                } ${
                  tomorrowRecord.lunch
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
                title="দুপুরের মিল চালু বা বন্ধ করতে ক্লিক করুন"
              >
                <Sun className={`h-6 w-6 ${tomorrowRecord.lunch ? 'text-amber-200' : 'text-slate-400'}`} />
                <span className="text-xs sm:text-sm font-extrabold">দুপুর (Lunch)</span>
                <span
                  className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg ${
                    tomorrowRecord.lunch ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {tomorrowRecord.lunch ? '✓ চালু (১ মিল)' : '✕ বন্ধ (০ মিল)'}
                </span>
              </button>

              {/* Dinner Button */}
              <button
                type="button"
                disabled={tomorrowLock.isLocked || isSaving}
                onClick={() => handleToggle(tomorrowStr, 'dinner', tomorrowRecord.dinner)}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                  tomorrowLock.isLocked ? 'opacity-60 grayscale-[40%]' : ''
                } ${
                  tomorrowRecord.dinner
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
                title="রাতের মিল চালু বা বন্ধ করতে ক্লিক করুন"
              >
                <Moon className={`h-6 w-6 ${tomorrowRecord.dinner ? 'text-blue-200' : 'text-slate-400'}`} />
                <span className="text-xs sm:text-sm font-extrabold">রাত (Dinner)</span>
                <span
                  className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg ${
                    tomorrowRecord.dinner ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {tomorrowRecord.dinner ? '✓ চালু (১ মিল)' : '✕ বন্ধ (০ মিল)'}
                </span>
              </button>
            </div>

            {/* Bottom Quick Actions (All OFF / All ON) */}
            <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400">
                {isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'ক্লিক করলেই সাথে সাথে সেভ হয়ে যাবে'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tomorrowLock.isLocked || isSaving}
                  onClick={() => handleBulk(tomorrowStr, 'ALL_OFF')}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  সব মিল বন্ধ (Off)
                </button>
                <button
                  type="button"
                  disabled={tomorrowLock.isLocked || isSaving}
                  onClick={() => handleBulk(tomorrowStr, 'ALL_ON')}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  সব মিল চালু (On)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. NEXT DAYS CARDS (Total 7 upcoming days: tomorrow + 6 days, or today + 7 days on /member/meal) */}
      <div className="space-y-3">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">
          পরবর্তী {toBanglaDigits(UPCOMING_DAYS - 1)} দিনের মিল পরিকল্পনা (৭ দিনের উইন্ডো)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {upcomingDates
            .filter((d) => d !== tomorrowStr) // Tomorrow already rendered in featured card above
            .map((date) => {
              const isToday = date === todayStr;
              const lockStatus = getMealLockStatus(date, currentTime);
              const isLocked = lockStatus.isLocked;
              const record = mealsMap.get(date) || { mealCount: 2, lunch: true, dinner: true };
              const isSaving = savingDate === date;
              const weekday = getBanglaWeekday(date);
              const prevWeekday = getPreviousDayBanglaWeekday(date);

              return (
                <div
                  key={date}
                  className={`rounded-2xl p-3.5 border transition-all ${
                    isLocked
                      ? 'bg-slate-900/90 text-slate-300 border-slate-800 opacity-75'
                      : 'bg-slate-900 text-white border-slate-800 hover:border-slate-700 shadow-sm'
                  }`}
                >
                  {/* Top Bar: Date, Weekday & Meal Count */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">
                          {weekday}, {formatBanglaDateShort(date)}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            আজ
                          </span>
                        )}
                        {record.source === 'admin' && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                            অ্যাডমিন
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {isLocked
                          ? 'লক হয়ে গেছে — শুধু অ্যাডমিন পরিবর্তন করতে পারবে'
                          : `লক হবে: ${prevWeekday} রাত ১১:৫৯`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400">
                        {toBanglaDigits(record.mealCount)} মিল
                      </span>
                    </div>
                  </div>

                  {/* Lunch & Dinner Toggles */}
                  <div className="grid grid-cols-2 gap-2 my-2.5">
                    <button
                      type="button"
                      disabled={isLocked || isSaving}
                      onClick={() => handleToggle(date, 'lunch', record.lunch)}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
                        record.lunch
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Sun className="h-3.5 w-3.5 text-amber-200" />
                        দুপুর
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20">
                        {record.lunch ? '✓ অন' : '✕ অফ'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isLocked || isSaving}
                      onClick={() => handleToggle(date, 'dinner', record.dinner)}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
                        record.dinner
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Moon className="h-3.5 w-3.5 text-blue-200" />
                        রাত
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20">
                        {record.dinner ? '✓ অন' : '✕ অফ'}
                      </span>
                    </button>
                  </div>

                  {/* Bulk On / Off buttons per card */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px]">
                    <button
                      type="button"
                      disabled={isLocked || isSaving}
                      onClick={() => handleBulk(date, 'ALL_OFF')}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      সব অফ
                    </button>
                    <button
                      type="button"
                      disabled={isLocked || isSaving}
                      onClick={() => handleBulk(date, 'ALL_ON')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      সব অন
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
