import React from 'react';
import {
  Utensils,
  TrendingUp,
  Wallet,
  Receipt,
  Banknote,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
  Calendar,
  Users,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  Member,
  MealRecord,
  Deposit,
  MessSettings,
  MonthlyAccountingSummary,
} from '../../types';
import { formatCurrency, formatRate } from '../../services/calculations';
import { formatDateShort, getTodayString, formatDateFull } from '../../utils/dateUtils';
import { NavTab } from '../layout/Sidebar';
import { PdfExportService } from '../../services/pdfExportService';

interface DashboardViewProps {
  summary: MonthlyAccountingSummary;
  members: Member[];
  todayMeals: MealRecord[];
  allMeals?: MealRecord[];
  allDeposits?: Deposit[];
  settings: MessSettings;
  onNavigateTab: (tab: NavTab) => void;
  onOpenQuickAction: (action: 'meal' | 'deposit') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  members,
  todayMeals,
  allMeals,
  allDeposits,
  settings,
  onNavigateTab,
  onOpenQuickAction,
}) => {
  const todayStr = getTodayString();
  const formattedToday = formatDateFull(todayStr);

  // Active members for today's status
  const activeMembers = members.filter((m) => m.isActive);

  // Map memberId to today's meal count
  const todayMealMap = new Map<string, number>();
  todayMeals.forEach((m) => {
    todayMealMap.set(m.memberId, m.mealCount);
  });
  const todayMealCount = todayMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);

  // Total Due: calculated as (Total Meals * Meal Rate); 0 if <= total deposits, or excess if > deposits
  const totalDue = summary.totalDue ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Calendar className="h-4 w-4" />
              <span>{formattedToday}</span>
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome to {settings.messName}
            </h2>
            <p className="mt-1 text-sm text-emerald-100/90 max-w-xl">
              Real-time automated mess meal tracking and member accounting with automatic daily date synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="dash-btn-mark-meals"
              onClick={() => onNavigateTab('meals')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <Utensils className="h-4 w-4 text-emerald-700" />
              <span>Mark Today's Meals</span>
            </button>
            <button
              id="dash-btn-add-deposit"
              onClick={() => onOpenQuickAction('deposit')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-sm border border-emerald-500/40 transition-all cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              <span>Record Deposit</span>
            </button>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* 6 Key Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Meals */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Meals</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Utensils className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{summary.totalMeals}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summary.activeMemberCount} active members
          </div>
        </div>

        {/* Total Users / Members */}
        <div
          onClick={() => onNavigateTab('members')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
          title="সকল মেম্বারদের তালিকা ও বিস্তারিত দেখুন"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold group-hover:text-emerald-700 transition-colors">
              Total Users (মোট সদস্য)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 flex items-baseline gap-1.5">
            <span>{members.length}</span>
            <span className="text-xs font-normal text-slate-500">জন</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center justify-between">
            <span>{summary.activeMemberCount} active</span>
            <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-bold">দেখুন →</span>
          </div>
        </div>

        {/* Today's Meals (Auto Date) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20">
          <div className="flex items-center justify-between text-emerald-100">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Meals</span>
            <div className="p-1.5 rounded-lg bg-white/20 text-white">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight">
            {todayMealCount}
          </div>
          <div className="mt-1 text-[11px] text-emerald-100">
            {todayStr}
          </div>
        </div>

        {/* Total Deposits */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Deposit</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(summary.totalDeposits, settings.currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Cash collected by manager
          </div>
        </div>

        {/* Total Running Meal Cost (total meals * meal rate) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Running Meal Cost</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(summary.totalRunningMealCost, settings.currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summary.totalMeals} meals × {formatRate(summary.mealRate > 0 ? summary.mealRate : (settings.fixedMealRate || 0), settings.currency)}
          </div>
        </div>

        {/* Total Due (Normally 0; counts when total meals * rate > total deposits) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Due</span>
            <div className={`p-2 rounded-xl ${totalDue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {totalDue > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className={`mt-2 text-2xl font-extrabold ${totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {formatCurrency(totalDue, settings.currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {totalDue > 0 ? 'Exceeds total deposits' : 'No due • Fully covered'}
          </div>
        </div>
      </div>

      {/* Middle Grid: Member Summary & Today's Meal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Accounting Summary Table (2 columns on lg) */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">Member Summary & Balance</h3>
              <p className="text-xs text-slate-500">Individual meal cost vs deposited funds for current month</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-dashboard-download-pdf"
                onClick={() => PdfExportService.exportMonthlyReportPdf(summary, allMeals || todayMeals, allDeposits || [], settings)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer"
                title="Download Monthly Report as PDF"
              >
                <Download className="h-3.5 w-3.5" />
                <span>PDF Report</span>
              </button>
              <button
                onClick={() => onNavigateTab('reports')}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>Full Report</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 overflow-x-auto">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">#</th>
                    <th className="py-3 px-4 border-r border-slate-200">Member</th>
                    <th className="py-3 px-3 text-center border-r border-slate-200">Meals</th>
                    <th className="py-3 px-3 text-right border-r border-slate-200">Meal Cost</th>
                    <th className="py-3 px-3 text-right border-r border-slate-200">Deposit</th>
                    <th className="py-3 px-3 text-right border-r border-slate-200">Due</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                  {summary.memberCalculations.map((calc, idx) => {
                    const isPositive = calc.balance >= 0;
                    const memberDue = calc.due !== undefined ? calc.due : (calc.mealCost > calc.totalCredits ? calc.mealCost - calc.totalCredits : 0);
                    const initials = calc.member.fullName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0]?.toUpperCase())
                      .join('');

                    return (
                      <tr
                        key={calc.member.id}
                        className="odd:bg-white even:bg-slate-50/60 hover:bg-emerald-50/40 transition-colors"
                      >
                        <td className="py-3 px-3 text-center text-xs font-bold text-slate-400 border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-200/60">
                              {initials || 'M'}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">
                                {calc.member.fullName}
                              </div>
                              {calc.member.nickname && (
                                <div className="text-[11px] text-emerald-700 font-medium">
                                  @{calc.member.nickname}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-100">
                          <span className="inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-extrabold text-xs">
                            {calc.totalMeals}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-700 tabular-nums border-r border-slate-100">
                          {formatCurrency(calc.mealCost, settings.currency)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-800 tabular-nums border-r border-slate-100">
                          {formatCurrency(calc.totalDeposits, settings.currency)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums border-r border-slate-100">
                          {memberDue > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-black text-xs">
                              {formatCurrency(memberDue, settings.currency)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-xs">
                              {formatCurrency(0, settings.currency)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                                : 'bg-rose-50 text-rose-800 border border-rose-200/80'
                            }`}
                          >
                            {isPositive ? (
                              <>
                                <ArrowUpRight className="h-3 w-3 shrink-0" />
                                +{formatCurrency(calc.balance, settings.currency)}
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="h-3 w-3 shrink-0" />
                                {formatCurrency(calc.balance, settings.currency)}
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-4 text-xs uppercase tracking-wider font-extrabold text-slate-700 border-r border-slate-200">
                      Total ({summary.memberCalculations.length} Members)
                    </td>
                    <td className="py-3.5 px-3 text-center font-black border-r border-slate-200">
                      <span className="inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-md bg-slate-200 text-slate-900 font-black text-xs">
                        {summary.totalMeals}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-black tabular-nums border-r border-slate-200">
                      {formatCurrency(summary.totalRunningMealCost ?? (summary.totalMeals * summary.mealRate), settings.currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-emerald-800 tabular-nums border-r border-slate-200">
                      {formatCurrency(summary.totalDeposits, settings.currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black tabular-nums border-r border-slate-200">
                      {summary.totalDue > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 font-black text-xs">
                          {formatCurrency(summary.totalDue, settings.currency)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs">
                          {formatCurrency(0, settings.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black tabular-nums">
                      {formatCurrency(
                        summary.memberCalculations.reduce((acc, m) => acc + m.balance, 0),
                        settings.currency
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Meal Summary */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Today's Meal Status</h3>
                <p className="text-xs text-slate-500">Live attendance for today</p>
              </div>
              <button
                onClick={() => onNavigateTab('meals')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Edit Meal
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {activeMembers.map((member) => {
                const count = todayMealMap.get(member.id) ?? 0;
                const ate = count > 0;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          ate ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {member.nickname ? member.nickname[0] : member.fullName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {member.nickname || member.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ate ? `${count} meal${count > 1 ? 's' : ''}` : 'No meal'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {ate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>✓ Ate</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold">
                          <XCircle className="h-3.5 w-3.5 text-slate-400" />
                          <span>✕ Off</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('meals')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-all"
            >
              Open Daily Meal Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
