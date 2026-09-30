import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Utensils,
  CheckCircle2,
  XCircle,
  Edit3,
  ArrowRight,
} from 'lucide-react';
import { Member, MealRecord, MessSettings } from '../../types';
import { formatDateFull, formatMonthLabel, getTodayString } from '../../utils/dateUtils';

interface CalendarHistoryViewProps {
  selectedMonth: string; // YYYY-MM
  onSelectMonth: (month: string) => void;
  members: Member[];
  meals: MealRecord[];
  settings: MessSettings;
  onNavigateToDateMeal: (date: string) => void;
}

export const CalendarHistoryView: React.FC<CalendarHistoryViewProps> = ({
  selectedMonth,
  onSelectMonth,
  members,
  meals,
  settings,
  onNavigateToDateMeal,
}) => {
  const [selectedDayString, setSelectedDayString] = useState<string>(getTodayString());

  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed

  // Days in selected month
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sunday

  // Filter meals for this month
  const monthMeals = meals.filter((m) => m.date.startsWith(selectedMonth));

  // Build days array with padding for week start
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayFormatted = String(d).padStart(2, '0');
    const fullDate = `${selectedMonth}-${dayFormatted}`;
    calendarCells.push(fullDate);
  }

  // Selected date details
  const dayMeals = meals.filter((m) => m.date === selectedDayString);
  const dayTotalMeals = dayMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);
  const activeMembers = members.filter((m) => m.isActive);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Daily History & Calendar</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Inspect daily meal logs and attendance for any day in {formatMonthLabel(selectedMonth)}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const today = getTodayString();
              const [y, m] = today.split('-');
              onSelectMonth(`${y}-${m}`);
              setSelectedDayString(today);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="Jump to current date"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span>Today</span>
          </button>

          <button
            onClick={() => {
              const prevMonth = month === 1 ? 12 : month - 1;
              const prevYear = month === 1 ? year - 1 : year;
              onSelectMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
            }}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-extrabold text-sm text-slate-900 px-3 py-1.5 bg-white rounded-xl border border-slate-200">
            {formatMonthLabel(selectedMonth)}
          </span>
          <button
            onClick={() => {
              const nextMonth = month === 12 ? 1 : month + 1;
              const nextYear = month === 12 ? year + 1 : year;
              onSelectMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
            }}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols on lg) */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-2xl bg-slate-50/50" />;
              }

              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const isSelected = dateStr === selectedDayString;
              const isToday = dateStr === getTodayString();

              // Calculate meals on this date
              const dMeals = monthMeals.filter((m) => m.date === dateStr);
              const dTotalMeals = dMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDayString(dateStr)}
                  className={`h-20 sm:h-24 p-2 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : isToday
                      ? 'bg-amber-50/40 border-amber-300 hover:border-emerald-300'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black ${
                        isSelected
                          ? 'text-emerald-800'
                          : isToday
                          ? 'text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="hidden sm:inline text-[9px] font-bold text-amber-700 uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Badge for meals */}
                  <div className="space-y-1 mt-auto">
                    {dTotalMeals > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md truncate">
                        <Utensils className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                        <span>{dTotalMeals} m</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Drilldown Card */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
                Selected Day Details
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                {formatDateFull(selectedDayString)}
              </h3>
            </div>

            {/* Quick Metrics */}
            <div className="my-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Day Meals</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">{dayTotalMeals} meals recorded</div>
              </div>
            </div>

            {/* Meal Attendance for this day */}
            <div className="space-y-3 mt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Member Meal Log ({dayTotalMeals} total)
              </h4>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {activeMembers.map((m) => {
                  const record = dayMeals.find((rec) => rec.memberId === m.id);
                  const count = record ? record.mealCount : 0;
                  const isEating = count > 0;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {isEating ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                        )}
                        <span className="font-bold text-slate-800">
                          {m.fullName}
                        </span>
                      </div>
                      <span className={`font-bold ${isEating ? 'text-emerald-800' : 'text-slate-400'}`}>
                        {count} {count === 1 ? 'meal' : 'meals'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action button: Edit Meals for this day */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateToDateMeal(selectedDayString)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Meals for {selectedDayString}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
