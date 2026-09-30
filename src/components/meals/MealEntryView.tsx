import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
  Plus,
  Minus,
  AlertCircle,
  Sun,
  Moon,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { Member, MealRecord, MessSettings } from '../../types';
import {
  getTodayString,
  formatDateFull,
  addDays,
  formatDayOnly,
} from '../../utils/dateUtils';

interface MealEntryViewProps {
  members: Member[];
  allMeals: MealRecord[];
  onSaveDayMeals: (
    date: string,
    mealEntries: { memberId: string; count: number; lunch?: boolean; dinner?: boolean }[]
  ) => void;
  settings: MessSettings;
  onNavigateTab?: (tab: any) => void;
}

interface MemberMealSlot {
  lunch: boolean;
  dinner: boolean;
  extra: number;
}

const calculateSlotCount = (slot?: MemberMealSlot): number => {
  if (!slot) return 0;
  const base = (slot.lunch ? 1 : 0) + (slot.dinner ? 1 : 0);
  return Math.max(0, base + Math.max(0, Math.round(slot.extra || 0)));
};

const countToSlot = (count: number, lunch?: boolean, dinner?: boolean): MemberMealSlot => {
  const rounded = Math.max(0, Math.round(count));
  if (lunch !== undefined && dinner !== undefined) {
    const base = (lunch ? 1 : 0) + (dinner ? 1 : 0);
    return { lunch, dinner, extra: Math.max(0, rounded - base) };
  }
  if (rounded <= 0) {
    return { lunch: false, dinner: false, extra: 0 };
  } else if (rounded === 1) {
    return { lunch: true, dinner: false, extra: 0 };
  } else if (rounded === 2) {
    return { lunch: true, dinner: true, extra: 0 };
  } else {
    // 2+ meals (e.g. 3, 4, 5...)
    return { lunch: true, dinner: true, extra: rounded - 2 };
  }
};

export const MealEntryView: React.FC<MealEntryViewProps> = ({
  members,
  allMeals,
  onSaveDayMeals,
  settings,
  onNavigateTab,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const isToday = selectedDate === getTodayString();
  // Map of memberId -> MemberMealSlot
  const [mealSlots, setMealSlots] = useState<{ [memberId: string]: MemberMealSlot }>({});
  const [hasExistingRecord, setHasExistingRecord] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const activeMembers = members.filter((m) => m.isActive);
  const defaultMeals = settings.defaultMealsPerDay || 2;

  // Load meals for selected date whenever selectedDate or allMeals changes
  useEffect(() => {
    const existing = allMeals.filter((m) => m.date === selectedDate);
    const slots: { [memberId: string]: MemberMealSlot } = {};

    if (existing.length > 0) {
      setHasExistingRecord(true);
      activeMembers.forEach((mem) => {
        const record = existing.find((r) => r.memberId === mem.id);
        const count = record ? record.mealCount : 0;
        slots[mem.id] = countToSlot(count, record?.lunch, record?.dinner);
      });
    } else {
      setHasExistingRecord(false);
      activeMembers.forEach((mem) => {
        slots[mem.id] = countToSlot(defaultMeals);
      });
    }
    setMealSlots(slots);
    setSaveSuccessMessage(null);
  }, [selectedDate, allMeals, activeMembers.length, defaultMeals]);

  // Automatically update selectedDate if day changes while app is open
  useEffect(() => {
    const checkLiveDate = () => {
      const today = getTodayString();
      if (document.visibilityState === 'visible') {
        setSelectedDate((prev) => (prev !== today && isToday ? today : prev));
      }
    };

    const interval = setInterval(checkLiveDate, 30000);
    window.addEventListener('visibilitychange', checkLiveDate);
    window.addEventListener('focus', checkLiveDate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', checkLiveDate);
      window.removeEventListener('focus', checkLiveDate);
    };
  }, [isToday]);

  // Toggle individual meal slot (Lunch or Dinner)
  const handleToggleSlot = (memberId: string, type: 'lunch' | 'dinner') => {
    setMealSlots((prev) => {
      const current = prev[memberId] || { lunch: false, dinner: false, extra: 0 };
      const nextState = !current[type];
      const updated = {
        ...current,
        [type]: nextState,
      };
      // If either lunch or dinner is turned off, reset extra meals
      if (!updated.lunch || !updated.dinner) {
        updated.extra = 0;
      }
      return {
        ...prev,
        [memberId]: updated,
      };
    });
    setSaveSuccessMessage(null);
  };

  // Toggle member meal: if eating (> 0) -> turn off (0), if off -> defaultMeals
  const handleToggleMember = (memberId: string) => {
    setMealSlots((prev) => {
      const current = prev[memberId] || { lunch: false, dinner: false, extra: 0 };
      const currentCount = calculateSlotCount(current);
      return {
        ...prev,
        [memberId]: currentCount > 0
          ? { lunch: false, dinner: false, extra: 0 }
          : countToSlot(Math.round(defaultMeals)),
      };
    });
    setSaveSuccessMessage(null);
  };

  // Adjust count by delta (+1 / -1) - strictly real integer numbers
  const handleAdjustCount = (memberId: string, delta: number) => {
    setMealSlots((prev) => {
      const current = prev[memberId] || { lunch: false, dinner: false, extra: 0 };
      const currentCount = calculateSlotCount(current);
      const updatedCount = Math.max(0, Math.min(20, Math.round(currentCount + delta)));
      return {
        ...prev,
        [memberId]: countToSlot(updatedCount),
      };
    });
    setSaveSuccessMessage(null);
  };

  // Save/Update day meals
  const handleSave = () => {
    setIsSaving(true);
    const entries = activeMembers.map((mem) => {
      const slot = mealSlots[mem.id];
      return {
        memberId: mem.id,
        count: calculateSlotCount(slot),
        lunch: slot?.lunch,
        dinner: slot?.dinner,
      };
    });

    onSaveDayMeals(selectedDate, entries);
    setIsSaving(false);
    setSaveSuccessMessage(`Saved for ${formatDateFull(selectedDate)}!`);
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3500);
  };

  // Total calculations for the day
  const totalLunchCount = activeMembers.filter((m) => mealSlots[m.id]?.lunch).length;
  const totalDinnerCount = activeMembers.filter((m) => mealSlots[m.id]?.dinner).length;
  const totalDayMeals = activeMembers.reduce((sum, m) => sum + calculateSlotCount(mealSlots[m.id]), 0);

  const { dayName, dayNum, monthYear } = formatDayOnly(selectedDate);

  return (
    <div className="w-full space-y-2.5 pb-4">
      {/* Compact Single-Screen Header Card */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Date Navigation & Day Name */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                type="date"
                id="meal-entry-date-picker"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-bold text-xs sm:text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              />

              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-slate-900 leading-none">
                {dayName}
              </span>
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                {dayNum} {monthYear}
              </span>

              {hasExistingRecord ? (
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-teal-600" />
                  Recorded
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-600" />
                  Unsaved
                </span>
              )}

              {!isToday && (
                <button
                  onClick={() => setSelectedDate(getTodayString())}
                  className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {onNavigateTab && (
              <button
                type="button"
                id="btn-nav-to-whatsapp"
                onClick={() => onNavigateTab('whatsapp')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                title="WhatsApp Meal Polls & Overrides"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp Polls</span>
                <span className="text-[10px] bg-emerald-600 text-white px-1 py-0.2 rounded font-black">Live</span>
              </button>
            )}

            {/* Embedded Top Save Button */}
            <button
              id="meal-btn-save-record"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{hasExistingRecord ? 'Update Record' : 'Save Record'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-slate-600 font-medium">
            <div>
              Total Day Meals:{' '}
              <span className="font-black text-emerald-700 text-sm">{totalDayMeals}</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div>
              Lunch: <span className="font-bold text-slate-800">{totalLunchCount}</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div>
              Dinner: <span className="font-bold text-slate-800">{totalDinnerCount}</span>
            </div>
          </div>

          {saveSuccessMessage && (
            <div className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-fade-in">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Member Grid: Fits completely on one screen without scrolling */}
      {activeMembers.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium text-sm">No active members found.</p>
          <p className="text-xs text-slate-400 mt-1">Please add active members in the Members tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {activeMembers.map((member) => {
            const slot = mealSlots[member.id] || { lunch: false, dinner: false, extra: 0 };
            const count = calculateSlotCount(slot);
            const isEating = count > 0;

            return (
              <div
                key={member.id}
                id={`meal-row-${member.id}`}
                className={`flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl border transition-all ${
                  isEating
                    ? 'bg-white border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs'
                    : 'bg-slate-50/80 border-slate-200/90 text-slate-400'
                }`}
              >
                {/* Left: Quick Toggle Checkbox & Member Name */}
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none"
                  onClick={() => handleToggleMember(member.id)}
                >
                  <div
                    className={`h-5 w-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                      isEating
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {isEating && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                      {member.fullName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium leading-none truncate">
                      {member.nickname
                        ? `@${member.nickname}`
                        : isEating
                        ? count > 2
                          ? `${count} meals (+${count - 2} extra)`
                          : `${count} meal${count > 1 ? 's' : ''}`
                        : 'Off'}
                    </div>
                  </div>
                </div>

                {/* Right: Lunch button, Dinner button, Extra option (only when 2+), & Stepper */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {/* Lunch Toggle */}
                  <button
                    type="button"
                    id={`meal-lunch-${member.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSlot(member.id, 'lunch');
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer select-none ${
                      slot.lunch
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Toggle Lunch"
                  >
                    <Sun className={`h-3 w-3 ${slot.lunch ? 'text-emerald-100' : 'text-amber-500'}`} />
                    <span>Lunch</span>
                  </button>

                  {/* Dinner Toggle */}
                  <button
                    type="button"
                    id={`meal-dinner-${member.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSlot(member.id, 'dinner');
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer select-none ${
                      slot.dinner
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Toggle Dinner"
                  >
                    <Moon className={`h-3 w-3 ${slot.dinner ? 'text-emerald-100' : 'text-indigo-400'}`} />
                    <span>Dinner</span>
                  </button>

                  {/* Extra Option Badge: ONLY visible when count > 2 (2+ meals) */}
                  {count > 2 && (
                    <button
                      type="button"
                      id={`meal-extra-${member.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustCount(member.id, 1);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-extrabold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white border border-amber-600 shadow-2xs transition-all cursor-pointer select-none"
                      title={`Click to add more extra (currently ${count - 2} extra)`}
                    >
                      <Plus className="h-3 w-3 stroke-[3]" />
                      <span>+{count - 2} Extra</span>
                    </button>
                  )}

                  {/* Stepper Count - Real integer numbers only (1, 2, 3, 4...) */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      id={`meal-dec-${member.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustCount(member.id, -1);
                      }}
                      className="p-1 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Decrease meal (-1)"
                    >
                      <Minus className="h-3 w-3" />
                    </button>

                    <div className="w-7 text-center select-none">
                      <span className="font-black text-xs text-slate-900 block leading-tight">
                        {count}
                      </span>
                    </div>

                    <button
                      type="button"
                      id={`meal-inc-${member.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustCount(member.id, 1);
                      }}
                      className="p-1 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Increase meal (+1)"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
