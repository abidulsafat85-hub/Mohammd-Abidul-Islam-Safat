import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  TrendingUp,
  Award,
  Users,
  User,
  ChevronDown,
  ArrowUpDown,
  Utensils,
  Receipt,
  Wallet,
  Banknote,
  Calendar,
  CheckCircle2,
  Loader2,
  FileText,
  X,
} from 'lucide-react';
import {
  Member,
  MealRecord,
  Deposit,
  MonthlyAccountingSummary,
  MessSettings,
  MemberMonthlyCalculation,
} from '../../types';
import { formatCurrency, formatRate } from '../../services/calculations';
import { formatMonthLabel, getTodayString, formatDateShort } from '../../utils/dateUtils';
import { PdfExportService } from '../../services/pdfExportService';
import { IndividualReportService } from '../../services/individualReportService';

interface MonthlyReportViewProps {
  summary: MonthlyAccountingSummary;
  meals: MealRecord[];
  deposits: Deposit[];
  settings: MessSettings;
}

type SortField = 'meals' | 'cost' | 'deposit' | 'due' | 'balance' | 'name';

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  summary,
  meals,
  deposits,
  settings,
}) => {
  const [sortField, setSortField] = useState<SortField>('meals');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCalculations = [...summary.memberCalculations].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    switch (sortField) {
      case 'meals':
        valA = a.totalMeals;
        valB = b.totalMeals;
        break;
      case 'cost':
        valA = a.totalCost;
        valB = b.totalCost;
        break;
      case 'deposit':
        valA = a.totalDeposits;
        valB = b.totalDeposits;
        break;
      case 'due':
        valA = a.due ?? (a.mealCost > a.totalCredits ? a.mealCost - a.totalCredits : 0);
        valB = b.due ?? (b.mealCost > b.totalCredits ? b.mealCost - b.totalCredits : 0);
        break;
      case 'balance':
        valA = a.balance;
        valB = b.balance;
        break;
      case 'name':
        valA = a.member.fullName.toLowerCase();
        valB = b.member.fullName.toLowerCase();
        return sortDirection === 'asc'
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
    }

    return sortDirection === 'asc'
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  // Export Monthly Summary PDF
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      PdfExportService.exportMonthlyReportPdf(summary, meals, deposits, settings);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Individual Member Slips
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [individualExportMode, setIndividualExportMode] = useState<'specific' | 'all'>('specific');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    summary.memberCalculations[0]?.member.id || ''
  );

  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [zipSuccessMsg, setZipSuccessMsg] = useState<string | null>(null);

  const [isExportingSingle, setIsExportingSingle] = useState(false);
  const [singleSuccessMsg, setSingleSuccessMsg] = useState<string | null>(null);

  // Download single member's individual PDF
  const handleExportSingleMember = async (memberId: string) => {
    const calc = summary.memberCalculations.find((m) => m.member.id === memberId);
    if (!calc) return;
    try {
      setIsExportingSingle(true);
      setSingleSuccessMsg(null);
      const fileName = await IndividualReportService.downloadSingleMemberPdf(
        calc,
        summary,
        meals,
        deposits,
        settings
      );
      setSingleSuccessMsg(`Successfully downloaded ${fileName}!`);
      setTimeout(() => setSingleSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to generate individual member PDF:', err);
    } finally {
      setIsExportingSingle(false);
    }
  };

  // Download all members' PDFs as ZIP
  const handleExportIndividualZip = async () => {
    try {
      setIsExportingZip(true);
      setZipSuccessMsg(null);
      const res = await IndividualReportService.generateAndDownloadZip(
        summary,
        meals,
        deposits,
        settings,
        (current, total, memberName) => {
          setZipProgress({ current, total, name: memberName });
        }
      );
      setZipSuccessMsg(`Downloaded ZIP containing ${res.count} members' individual PDF statements!`);
      setTimeout(() => setZipSuccessMsg(null), 6000);
      setShowIndividualModal(false);
    } catch (err) {
      console.error('Failed to generate individual reports ZIP:', err);
    } finally {
      setIsExportingZip(false);
      setZipProgress(null);
    }
  };

  // Total Due: calculated as (Total Meals * Meal Rate); 0 if <= total deposits, or excess if > deposits
  const totalDue = summary.totalDue ?? 0;

  const selectedCalc = summary.memberCalculations.find((m) => m.member.id === selectedMemberId);
  const monthLabel = formatMonthLabel(summary.month);
  const membersWithMeals = summary.memberCalculations.filter((m) => m.totalMeals > 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Accounting Report</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Official monthly meal statement for {monthLabel}.
          </p>
        </div>

        {/* Actions: Download PDF and Download Individual Reports */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-report-pdf"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download formatted PDF Monthly Statement"
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          {/* Download Individual Reports Button (Opens choice modal for Specific Member vs All) */}
          <button
            id="btn-report-individual-options"
            onClick={() => setShowIndividualModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            title="Download individual member reports as PDF (Specific Member or All in ZIP)"
          >
            <FolderArchive className="h-4 w-4" />
            <span>Download Individual Reports</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Progress or Success feedback */}
      {isExportingZip && zipProgress && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
            <span>
              Generating individual PDF statement for <strong>{zipProgress.name}</strong> ({zipProgress.current} of {zipProgress.total})...
            </span>
          </div>
          <span className="font-bold text-emerald-700">
            {Math.round((zipProgress.current / zipProgress.total) * 100)}%
          </span>
        </div>
      )}

      {zipSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
          <span className="font-semibold">{zipSuccessMsg}</span>
        </div>
      )}

      {singleSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{singleSuccessMsg}</span>
        </div>
      )}

      {/* Printable Sheet Header (only appears on print) */}
      <div className="hidden print-only mb-6 text-center border-b pb-4">
        <h1 className="text-2xl font-black">{settings.messName}</h1>
        <p className="text-sm text-slate-600">{settings.subtitle}</p>
        <p className="text-xs font-bold mt-1">MONTHLY MEAL STATEMENT: {monthLabel.toUpperCase()}</p>
      </div>

      {/* Monthly Key Metrics Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accounting Summary</span>
            <h3 className="text-xl font-extrabold text-slate-900">{monthLabel}</h3>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs sm:text-sm border border-emerald-200/60 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span>Today: {formatDateShort(getTodayString())}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Meals</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{summary.totalMeals}</div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Active Members</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {summary.activeMemberCount}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Deposits</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(summary.totalDeposits, settings.currency)}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Mess Cost</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(summary.totalExpenses, settings.currency)}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Meal Rate</span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {formatRate(summary.mealRate, settings.currency)}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Net Due / Refund</span>
            <div
              className={`text-2xl font-black mt-0.5 ${
                summary.memberCalculations.reduce((a, b) => a + b.balance, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {summary.memberCalculations.reduce((a, b) => a + b.balance, 0) >= 0 ? '+' : ''}
              {formatCurrency(summary.memberCalculations.reduce((a, b) => a + b.balance, 0), settings.currency)}
            </div>
          </div>
        </div>

        {/* 3 Detail Financial Sub-cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-100/80 text-emerald-700">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bazaar Expenses</div>
              <div className="text-lg font-black text-slate-900">
                {formatCurrency(summary.totalBazarCost, settings.currency)}
              </div>
              <div className="text-[11px] text-slate-500">Shared strictly among eating members</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-100/80 text-blue-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Shared Fixed Bills</div>
              <div className="text-lg font-black text-slate-900">
                {formatCurrency(summary.totalFixedExpenses, settings.currency)}
              </div>
              <div className="text-[11px] text-slate-500">
                Split equally among all active members ({formatCurrency(summary.activeMemberCount > 0 ? summary.totalFixedExpenses / summary.activeMemberCount : 0, settings.currency)}/each)
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-100/80 text-amber-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Remaining Cash in Hand</div>
              <div className="text-lg font-black text-slate-900">
                {formatCurrency(summary.remainingCashFund, settings.currency)}
              </div>
              <div className="text-[11px] text-slate-500">
                Total Deposits minus Total Expenses spent
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Analytical Stat Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 no-print">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Highest Meals</div>
            <div className="font-extrabold text-sm text-slate-900 truncate">
              {summary.highestMealMember ? `${summary.highestMealMember.memberName} (${summary.highestMealMember.meals})` : '—'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 shrink-0">
            <Utensils className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Lowest Meals</div>
            <div className="font-extrabold text-sm text-slate-900 truncate">
              {summary.lowestMealMember ? `${summary.lowestMealMember.memberName} (${summary.lowestMealMember.meals})` : '—'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Active Members</div>
            <div className="font-extrabold text-sm text-slate-900">
              {summary.activeMemberCount} members
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Avg Meals / Member</div>
            <div className="font-extrabold text-sm text-slate-900">
              {summary.avgMealsPerMember.toFixed(1)} meals
            </div>
          </div>
        </div>
      </div>

      {/* Main Member Accounting Report Table */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-extrabold text-slate-900 text-base">Individual Member Statement</h4>
          <span className="text-xs text-slate-500 font-medium">Click headers to sort table</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-5">SL</th>
                <th
                  className="py-3.5 px-4 cursor-pointer select-none hover:text-slate-900"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Member Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-slate-900"
                  onClick={() => handleSort('meals')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Meals</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none hover:text-slate-900"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Cost</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none hover:text-slate-900"
                  onClick={() => handleSort('deposit')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Deposit</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none hover:text-slate-900"
                  onClick={() => handleSort('due')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Due</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-5 text-right cursor-pointer select-none hover:text-slate-900"
                  onClick={() => handleSort('balance')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Balance (Due / Refund)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                {/* Action column to download individual PDF */}
                <th className="py-3.5 px-4 text-center no-print">Individual PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedCalculations.map((calc, idx) => {
                const isPositive = calc.balance >= 0;
                const memberDue =
                  calc.due !== undefined
                    ? calc.due
                    : calc.mealCost > calc.totalCredits
                    ? calc.mealCost - calc.totalCredits
                    : 0;
                return (
                  <tr key={calc.member.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 text-xs text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900">
                        {calc.member.fullName}
                      </div>
                      {calc.member.nickname && (
                        <div className="text-xs text-emerald-700 font-semibold">@{calc.member.nickname}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 font-bold text-xs">
                        {calc.totalMeals}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(calc.totalCost, settings.currency)}
                      {calc.sharedFixedCost > 0 && (
                        <span className="text-[10px] text-slate-400 block">
                          (Meal: {formatCurrency(calc.mealCost, settings.currency)})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-800 font-extrabold">
                      {formatCurrency(calc.totalDeposits, settings.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black">
                      {memberDue > 0 ? (
                        <span className="text-rose-600 font-black">
                          {formatCurrency(memberDue, settings.currency)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          {formatCurrency(0, settings.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-black text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-black'
                            : 'bg-rose-50 text-rose-800 border border-rose-200 font-black'
                        }`}
                      >
                        {isPositive ? `Refund: +${formatCurrency(calc.balance, settings.currency)}` : `Due: ${formatCurrency(calc.balance, settings.currency)}`}
                      </span>
                    </td>
                    {/* Direct 1-Click PDF Download */}
                    <td className="py-3.5 px-4 text-center no-print">
                      <button
                        onClick={() => handleExportSingleMember(calc.member.id)}
                        disabled={isExportingSingle}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer border border-emerald-200/60 disabled:opacity-50"
                        title={`Download individual PDF statement for ${calc.member.fullName}`}
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Grand Total Row */}
              <tr className="bg-slate-100/90 font-black text-slate-900 text-sm border-t-2 border-slate-200">
                <td className="py-4 px-5 text-xs text-slate-500 font-bold">TOTAL</td>
                <td className="py-4 px-4 font-black">All Active Members</td>
                <td className="py-4 px-4 text-center font-black">{summary.totalMeals}</td>
                <td className="py-4 px-4 text-right font-black text-slate-900">
                  {formatCurrency(
                    summary.memberCalculations.reduce((a, b) => a + b.totalCost, 0),
                    settings.currency
                  )}
                </td>
                <td className="py-4 px-4 text-right font-black text-slate-900">
                  {formatCurrency(summary.totalDeposits, settings.currency)}
                </td>
                <td className="py-4 px-4 text-right font-black text-rose-600">
                  {formatCurrency(totalDue, settings.currency)}
                </td>
                <td className="py-4 px-5 text-right font-black">
                  {formatCurrency(
                    summary.memberCalculations.reduce((a, b) => a + b.balance, 0),
                    settings.currency
                  )}
                </td>
                <td className="py-4 px-4 text-center no-print text-xs text-slate-400 font-semibold">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Download Individual Reports (Specific Member vs All Members) */}
      {showIndividualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <FolderArchive className="h-5 w-5 text-emerald-600" />
                  <span>Download Individual Reports</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download monthly 30-day PDF meal statement for {monthLabel}
                </p>
              </div>
              <button
                onClick={() => setShowIndividualModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Choice Tabs */}
            <div className="p-6 space-y-5">
              {/* Option Selector Buttons */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIndividualExportMode('specific')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    individualExportMode === 'specific'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Specific Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIndividualExportMode('all')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    individualExportMode === 'all'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>All Members (ZIP)</span>
                </button>
              </div>

              {/* MODE 1: Specific Member */}
              {individualExportMode === 'specific' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select Member
                    </label>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {summary.memberCalculations.map((calc) => (
                        <option key={calc.member.id} value={calc.member.id}>
                          {calc.member.fullName} ({calc.totalMeals} Meals • {calc.balance >= 0 ? `Refund: +Tk ${Math.round(calc.balance)}` : `Due: -Tk ${Math.round(Math.abs(calc.balance))}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCalc && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold">Member Name:</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {selectedCalc.member.fullName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold">Total Meals:</span>
                        <span className="font-extrabold text-emerald-800">
                          {selectedCalc.totalMeals} Meals
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold">PDF Filename:</span>
                        <code className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-900 font-mono text-[11px] font-bold">
                          {IndividualReportService.getPdfFileName(selectedCalc.member.fullName, summary.month)}
                        </code>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleExportSingleMember(selectedMemberId)}
                    disabled={isExportingSingle || !selectedMemberId}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingSingle ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating Member PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        <span>Download PDF Statement</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* MODE 2: All Members (ZIP) */}
              {individualExportMode === 'all' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Members to Export:</span>
                      <span className="font-extrabold text-emerald-800">
                        {membersWithMeals.length} members with meals
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Output Format:</span>
                      <span className="font-bold text-slate-900">
                        Single ZIP containing individual PDF files
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">File Naming:</span>
                      <span className="text-slate-600 font-mono text-[11px]">
                        [MemberName]_[Month Year].pdf
                      </span>
                    </div>
                  </div>

                  {isExportingZip && zipProgress && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span>Generating: {zipProgress.name}</span>
                        <span>{zipProgress.current} / {zipProgress.total}</span>
                      </div>
                      <div className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleExportIndividualZip}
                    disabled={isExportingZip}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingZip ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Packaging ZIP Archive...</span>
                      </>
                    ) : (
                      <>
                        <FolderArchive className="h-4 w-4" />
                        <span>Download All Member PDFs (ZIP)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
