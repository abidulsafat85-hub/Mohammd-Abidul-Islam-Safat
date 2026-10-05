import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  UtensilsCrossed,
  Wallet,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Plus,
  RefreshCw,
  ShoppingBag,
  FileText,
  Lock,
  Sun,
  Moon,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  Download,
  Share2,
  FolderArchive,
  Loader2,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { MemberPortalData, MealRecord, Deposit, BazarExpense, AdvanceMealChoice, MemberMonthlyCalculation, MonthlyAccountingSummary, MessSettings, AuthUser } from '../../types';
import { ApiService } from '../../services/apiService';
import { IndividualReportService } from '../../services/individualReportService';
import { Modal } from '../common/Modal';
import { getTodayString, formatDateFull, formatDateShort, getAvailableMonths, getCurrentMonthString } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UpcomingMealCards } from './UpcomingMealCards';
import { useBranding } from '../../hooks/useBranding';
import { MemberBottomNav } from './MemberBottomNav';

interface MemberPortalViewProps {
  memberId: string;
  onLogout: () => void;
  onOpenAdminLogin: () => void;
  isAdmin?: boolean;
  authUser?: AuthUser | null;
  allMembersFallback?: any[];
  allMealsFallback?: MealRecord[];
  allDepositsFallback?: Deposit[];
  allBazarFallback?: BazarExpense[];
  settingsFallback?: any;
}

export const MemberPortalView: React.FC<MemberPortalViewProps> = ({
  memberId,
  onLogout,
  onOpenAdminLogin,
  isAdmin = false,
  authUser,
  allMembersFallback,
  allMealsFallback,
  allDepositsFallback,
  allBazarFallback,
  settingsFallback,
}) => {
  const { appName, logo } = useBranding();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthString());
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState<MemberPortalData | null>(null);
  const [activeTab, setActiveTab] = useState<'monthly' | 'deposits' | 'bazar'>('monthly');

  // Today state
  const todayStr = getTodayString();
  const [todayLunch, setTodayLunch] = useState<boolean>(true);
  const [todayDinner, setTodayDinner] = useState<boolean>(true);
  const [todayMealCount, setTodayMealCount] = useState<number>(2);
  const [todaySaveSuccess, setTodaySaveSuccess] = useState(false);

  // Tomorrow state
  const [tomorrowChoice, setTomorrowChoice] = useState<AdvanceMealChoice>('BOTH');
  const [tomorrowSaveSuccess, setTomorrowSaveSuccess] = useState(false);
  const [isSavingTomorrow, setIsSavingTomorrow] = useState(false);

  // Deposit modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'bKash' | 'Nagad' | 'Cash' | 'Bank' | 'Rocket'>('bKash');
  const [depositNote, setDepositNote] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  // Bazar modal
  const [isBazarModalOpen, setIsBazarModalOpen] = useState(false);
  const [bazarAmount, setBazarAmount] = useState('');
  const [bazarDesc, setBazarDesc] = useState('');
  const [bazarCategory, setBazarCategory] = useState<'Grocery' | 'Fish' | 'Meat' | 'Vegetable' | 'Rice' | 'Other'>('Grocery');
  const [bazarNote, setBazarNote] = useState('');
  const [bazarLoading, setBazarLoading] = useState(false);

  // Change PIN modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Edit specific day meal modal
  const [editingDateMeal, setEditingDateMeal] = useState<{ date: string; lunch: boolean; dinner: boolean; count: number } | null>(null);

  // Load Member Data
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getMemberPortalData(memberId, selectedMonth);
      setPortalData(data);

      // Sync today's meals
      const todayRecord = data.meals.find((m) => m.date === todayStr);
      if (todayRecord) {
        setTodayMealCount(todayRecord.mealCount);
        setTodayLunch(todayRecord.lunch ?? (todayRecord.mealCount >= 1));
        setTodayDinner(todayRecord.dinner ?? (todayRecord.mealCount >= 2));
      } else {
        // Default to active
        setTodayLunch(true);
        setTodayDinner(true);
        setTodayMealCount(2);
      }

      // Sync tomorrow's vote
      if (data.tomorrowVote) {
        setTomorrowChoice(data.tomorrowVote.choice);
      }
    } catch (err) {
      console.warn('Backend fetch failed, constructing from fallback:', err);
      // Fallback: construct strictly isolated data for this member
      if (allMembersFallback) {
        const member = allMembersFallback.find((m) => m.id === memberId);
        if (member) {
          const myMeals = (allMealsFallback || []).filter((m) => m.memberId === memberId);
          const myDeps = (allDepositsFallback || []).filter((d) => d.memberId === memberId);
          const myBazar = (allBazarFallback || []).filter((b) => b.paidByMemberId === memberId);

          const myMonthMeals = myMeals.filter((m) => m.date.startsWith(selectedMonth));
          const myTotalMeals = myMonthMeals.reduce((s, m) => s + (Number(m.mealCount) || 0), 0);
          const rate = 50;
          const myMealCost = Math.round(myTotalMeals * rate);
          const myMonthDeps = myDeps.filter((d) => d.date.startsWith(selectedMonth));
          const myTotalDeps = myMonthDeps.reduce((s, d) => s + (Number(d.amount) || 0), 0);
          const myBal = myTotalDeps - myMealCost;

          const constructed: MemberPortalData = {
            member,
            meals: myMeals,
            deposits: myDeps,
            bazar: myBazar,
            accounting: {
              month: selectedMonth,
              mealRate: rate,
              myTotalMeals,
              myMealCost,
              mySharedFixedCost: 0,
              myTotalDeposits: myTotalDeps,
              myBazarCredits: 0,
              myTotalCharges: myMealCost,
              myTotalCredits: myTotalDeps,
              myBalance: myBal,
              status: myBal < 0 ? 'due' : myBal > 0 ? 'refund' : 'settled',
              dueAmount: myBal < 0 ? Math.abs(myBal) : 0,
              refundAmount: myBal > 0 ? myBal : 0,
            },
            settings: {
              messName: settingsFallback?.messName || 'MessMate',
              subtitle: settingsFallback?.subtitle || 'Smart Mess Meal Management',
              currency: '৳',
              defaultMealsPerDay: 2,
            },
          };
          setPortalData(constructed);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId, selectedMonth]);

  // Tomorrow calculation (YYYY-MM-DD)
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Quick Toggle Handler for Today's Meals (Instant 1-Click Update from Top Box)
  const [quickMealUpdating, setQuickMealUpdating] = useState(false);

  const handleQuickToggleMeal = async (type: 'lunch' | 'dinner' | 'all_off' | 'all_on') => {
    let nextLunch = todayLunch;
    let nextDinner = todayDinner;

    if (type === 'lunch') {
      nextLunch = !todayLunch;
    } else if (type === 'dinner') {
      nextDinner = !todayDinner;
    } else if (type === 'all_off') {
      nextLunch = false;
      nextDinner = false;
    } else if (type === 'all_on') {
      nextLunch = true;
      nextDinner = true;
    }

    setTodayLunch(nextLunch);
    setTodayDinner(nextDinner);
    const count = (nextLunch ? 1 : 0) + (nextDinner ? 1 : 0);
    setTodayMealCount(count);

    setQuickMealUpdating(true);
    try {
      await ApiService.updateMemberMeal(memberId, todayStr, count, nextLunch, nextDinner);
      setTodaySaveSuccess(true);
      setTimeout(() => setTodaySaveSuccess(false), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'মিল আপডেট করতে ব্যর্থ হয়েছে');
    } finally {
      setQuickMealUpdating(false);
    }
  };

  // Save Today's Meal
  const handleSaveTodayMeal = async () => {
    try {
      const count = (todayLunch ? 1 : 0) + (todayDinner ? 1 : 0);
      setTodayMealCount(count);

      await ApiService.updateMemberMeal(memberId, todayStr, count, todayLunch, todayDinner);
      setTodaySaveSuccess(true);
      setTimeout(() => setTodaySaveSuccess(false), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'আজকের মিল সেভ করতে ব্যর্থ হয়েছে');
    }
  };

  // Save Tomorrow's Choice
  const handleSelectTomorrowChoice = async (choice: AdvanceMealChoice) => {
    setTomorrowChoice(choice);
    setIsSavingTomorrow(true);
    try {
      await ApiService.setTomorrowVote(memberId, choice, tomorrowStr);
      setTomorrowSaveSuccess(true);
      setTimeout(() => setTomorrowSaveSuccess(false), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'আগামীকালের মিল পছন্দ সেভ করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSavingTomorrow(false);
    }
  };

  // Submit Deposit
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;
    setDepositLoading(true);
    try {
      await ApiService.submitMemberDeposit(memberId, {
        amount: Number(depositAmount),
        paymentMethod: depositMethod,
        note: depositNote,
        date: todayStr,
      });
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setDepositNote('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'জমা গ্রহণ করতে ব্যর্থ হয়েছে');
    } finally {
      setDepositLoading(false);
    }
  };

  // Submit Bazar
  const handleSubmitBazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bazarAmount || Number(bazarAmount) <= 0 || !bazarDesc.trim()) return;
    setBazarLoading(true);
    try {
      await ApiService.submitMemberBazar(memberId, {
        amount: Number(bazarAmount),
        description: bazarDesc,
        category: bazarCategory,
        note: bazarNote,
        date: todayStr,
      });
      setIsBazarModalOpen(false);
      setBazarAmount('');
      setBazarDesc('');
      setBazarNote('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'বাজারের খরচ যোগ করতে ব্যর্থ হয়েছে');
    } finally {
      setBazarLoading(false);
    }
  };

  // Change PIN (Requires current PIN)
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPin || !oldPin.trim()) {
      setPinError('বর্তমান পিন দেওয়া আবশ্যক (Current PIN is required)');
      return;
    }
    if (newPin.length < 4) {
      setPinError('নতুন পিন কমপক্ষে ৪ ডিজিটের হতে হবে');
      return;
    }
    setPinError(null);
    try {
      await ApiService.updateMemberPin(memberId, oldPin.trim(), newPin.trim());
      setPinSuccess(true);
      setTimeout(() => {
        setPinSuccess(false);
        setIsPinModalOpen(false);
        setOldPin('');
        setNewPin('');
      }, 2000);
    } catch (err: any) {
      setPinError(err.message || 'পিন আপডেট করতে ব্যর্থ হয়েছে');
    }
  };

  // Save specific date meal from Monthly list
  const handleSaveDateMeal = async () => {
    if (!editingDateMeal) return;
    try {
      const count = (editingDateMeal.lunch ? 1 : 0) + (editingDateMeal.dinner ? 1 : 0);
      await ApiService.updateMemberMeal(
        memberId,
        editingDateMeal.date,
        count,
        editingDateMeal.lunch,
        editingDateMeal.dinner
      );
      setEditingDateMeal(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'মিল আপডেট করতে ব্যর্থ হয়েছে');
    }
  };

  // Download personal slip as PDF
  const handleDownloadPersonalSlip = () => {
    if (!portalData) return;
    const doc = new jsPDF();
    const currency = portalData.settings.currency || '৳';
    const acc = portalData.accounting;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105);
    doc.text(portalData.settings.messName || 'MessMate', 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('ব্যক্তিগত মাসিক মিল ও খরচের হিসাব স্লিপ', 105, 28, { align: 'center' });
    doc.text(`মাস: ${acc.month} • তারিখ: ${todayStr}`, 105, 34, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 38, 190, 38);

    // Member Info
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`মেম্বারের নাম: ${portalData.member.fullName}`, 20, 48);
    if (portalData.member.phone) {
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`মোবাইল: ${portalData.member.phone}`, 20, 55);
    }

    // Accounting Table
    const tableData = [
      ['চলতি মিল রেট (Meal Rate)', `${currency}${acc.mealRate.toFixed(2)}`],
      ['আমার মোট মিল সংখ্যা (Total Meals)', `${acc.myTotalMeals} টি`],
      ['মোট মিল বাবদ খরচ (Meal Cost)', `${currency}${acc.myMealCost.toLocaleString()}`],
      ['ফিক্সড খরচ বাবদ ভাগ (Shared Fixed Cost)', `${currency}${acc.mySharedFixedCost.toLocaleString()}`],
      ['মোট প্রদেয় বিল (Total Charges)', `${currency}${acc.myTotalCharges.toLocaleString()}`],
      ['আমার মোট জমা টাকা (Total Deposits)', `${currency}${acc.myTotalDeposits.toLocaleString()}`],
      ['বাজারের নিজস্ব খরচ (Bazar Out of Pocket)', `${currency}${acc.myBazarCredits.toLocaleString()}`],
      ['মোট জমা ও ক্রেডিট (Total Credits)', `${currency}${acc.myTotalCredits.toLocaleString()}`],
      [
        acc.myBalance < 0 ? 'চূড়ান্ত বকেয়া / বাকি (Net Due)' : 'চূড়ান্ত পাওনা / ফেরত (Net Refund)',
        acc.myBalance < 0
          ? `বাকি: ${currency}${acc.dueAmount.toLocaleString()}`
          : `ফেরত: ${currency}${acc.refundAmount.toLocaleString()}`,
      ],
    ];

    autoTable(doc, {
      startY: 65,
      head: [['বিবরণ (Item)', 'পরিমাণ / টাকা (Amount)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      },
    });

    // Save
    doc.save(`${portalData.member.fullName}_Slip_${acc.month}.pdf`);
  };

  // Ultra-HD Individual PDF Statement Download (Matching Admin Panel exactly)
  const [isExportingIndividual, setIsExportingIndividual] = useState(false);
  const [individualExportMsg, setIndividualExportMsg] = useState<string | null>(null);

  const handleDownloadIndividualSlip = async () => {
    if (!portalData) return;
    setIsExportingIndividual(true);
    setIndividualExportMsg(null);

    try {
      const acc = portalData.accounting;
      const calc: MemberMonthlyCalculation = {
        member: {
          id: portalData.member.id,
          fullName: portalData.member.fullName,
          nickname: portalData.member.nickname,
          phone: portalData.member.phone,
          joinDate: '2026-01-01',
          initialDeposit: 0,
          isActive: portalData.member.isActive,
          notes: portalData.member.notes,
        },
        totalMeals: acc.myTotalMeals,
        mealCost: acc.myMealCost,
        sharedFixedCost: acc.mySharedFixedCost,
        totalCost: acc.myTotalCharges,
        totalDeposits: acc.myTotalDeposits,
        bazarPaidOutPocket: acc.myBazarCredits,
        totalCredits: acc.myTotalCredits,
        balance: acc.myBalance,
        due: acc.dueAmount,
        status: acc.status,
      };

      const summary: MonthlyAccountingSummary = {
        month: acc.month,
        totalMeals: acc.myTotalMeals,
        totalBazarCost: acc.myBazarCredits,
        totalFixedExpenses: acc.mySharedFixedCost,
        totalExpenses: acc.myTotalCharges,
        mealRate: acc.mealRate,
        sharedFixedPerMember: acc.mySharedFixedCost || 0,
        totalDeposits: acc.myTotalDeposits,
        totalMemberCredits: acc.myTotalCredits,
        remainingCashFund: 0,
        activeMemberCount: 1,
        memberCalculations: [calc],
        avgMealsPerMember: acc.myTotalMeals,
        totalDue: acc.dueAmount,
        totalRunningMealCost: acc.myMealCost,
      };

      const settingsObj: MessSettings = {
        messName: portalData.settings.messName || 'MessMate',
        subtitle: portalData.settings.subtitle || 'Smart Mess Meal Management',
        currency: portalData.settings.currency || '৳',
        mealRateMode: 'bazar_only',
        defaultMealsPerDay: 2,
        theme: 'light',
        managerName: portalData.settings.managerName || 'Abidul Safat',
        managerPhone: portalData.settings.managerPhone || '01712345678',
      };

      const fileName = await IndividualReportService.downloadSingleMemberPdf(
        calc,
        summary,
        portalData.meals,
        portalData.deposits,
        settingsObj
      );

      setIndividualExportMsg(`সফলভাবে ডাউনলোড হয়েছে: ${fileName}`);
      setTimeout(() => setIndividualExportMsg(null), 5000);
    } catch (err: any) {
      console.warn('Standard HD report fallback triggered:', err);
      handleDownloadPersonalSlip();
    } finally {
      setIsExportingIndividual(false);
    }
  };

  const months = getAvailableMonths();
  const acc = portalData?.accounting;
  const currency = portalData?.settings.currency || '৳';

  // Filter meals for this month
  const monthlyMealsList = useMemo(() => {
    if (!portalData) return [];
    return portalData.meals
      .filter((m) => m.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [portalData, selectedMonth]);

  // Filter deposits for this month
  const monthlyDepositsList = useMemo(() => {
    if (!portalData) return [];
    return portalData.deposits
      .filter((d) => d.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [portalData, selectedMonth]);

  // Registered member name (person who registered)
  const registeredMemberName = useMemo(() => {
    if (portalData?.member?.fullName && portalData.member.fullName !== 'মেম্বার পোর্টাল') {
      return portalData.member.fullName;
    }
    if (authUser?.name) return authUser.name;
    if ((authUser as any)?.fullName) return (authUser as any).fullName;
    const match = allMembersFallback?.find(
      (m: any) => m.id === memberId || (authUser?.email && m.email?.toLowerCase() === authUser.email.toLowerCase())
    );
    if (match?.fullName) return match.fullName;
    try {
      const stored = localStorage.getItem('messmate_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) return parsed.name;
        if (parsed.fullName) return parsed.fullName;
      }
    } catch {}
    return 'মেম্বার';
  }, [portalData, authUser, allMembersFallback, memberId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 sm:pb-20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Left Brand Logo & Registered Member Name */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white p-0.5 border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-emerald-500/20">
              <img
                src={logo || '/ghorer_shadh_logo.svg'}
                alt={appName}
                className="h-full w-full object-contain rounded-full bg-white"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight">
                  ঘরের স্বাদ
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {registeredMemberName}
              </p>
            </div>
          </div>

          {/* Right Action Buttons & Quick Balance */}
          <div className="flex items-center gap-2">
            {/* Quick Balance Badge in Header (Right next to user info) */}
            {acc && (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-2xs transition-all ${
                  acc.myBalance < 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : acc.myBalance > 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="বর্তমান মোট ব্যালেন্স"
              >
                {acc.myBalance < 0 ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>বকেয়া: {currency}{acc.dueAmount.toLocaleString()}</span>
                  </>
                ) : acc.myBalance > 0 ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>ফেরত: {currency}{acc.refundAmount.toLocaleString()}</span>
                  </>
                ) : (
                  <span>ব্যালেন্স: {currency}০</span>
                )}
              </div>
            )}

            {/* Month Selector */}
            <div className="relative hidden sm:block">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none text-xs font-bold bg-emerald-50 text-emerald-950 px-3 py-2 rounded-xl border border-emerald-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-7"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Deposit Button */}
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              title="নতুন টাকা জমা দিন"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>টাকা জমা</span>
            </button>

            {/* Logout Button: Visible on desktop, on mobile it is inside Profile per user request */}
            <button
              onClick={onLogout}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer"
              title="লগআউট করুন"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>লগআউট</span>
            </button>

            {/* Admin Switch: Only visible if the logged in user is Admin */}
            {isAdmin && (
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                title="মেস এডমিন প্যানেলে ফিরুন"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden md:inline">এডমিন মোড</span>
              </button>
            )}
          </div>
        </div>

        {/* Member Navigation Tabs: Hidden on mobile (bottom nav is used), visible on desktop */}
        <div className="hidden md:flex max-w-5xl mx-auto border-t border-slate-100 mt-2.5 pt-2 items-center gap-1.5 overflow-x-auto scrollbar-none">
          <NavLink
            to="/member/home"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            মিল এন্ট্রি
          </NavLink>
          <NavLink
            to="/member/history"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/member/payment"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            পেমেন্ট ও জমা (Payment)
          </NavLink>
          <NavLink
            to="/member/complaints"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            অভিযোগ বক্স (Complaints)
          </NavLink>
          <NavLink
            to="/member/profile"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            আমার প্রোফাইল (Profile)
          </NavLink>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Upcoming 7-Day Meal Cards with Tomorrow Featured & Auto-Lock (Part H) */}
        <UpcomingMealCards
          memberId={memberId}
          meals={portalData?.meals || []}
          onMealUpdated={() => {
            loadData();
          }}
        />

        {/* 1. PERSONAL FINANCIAL OVERVIEW CARD */}
        {acc && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  চলতি মাস: {acc.month} এর হিসাব বিবরণী
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">
                  আমার আর্থিক অবস্থা ও ব্যালেন্স
                </h2>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <div
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-2xs ${
                    acc.myBalance < 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : acc.myBalance > 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {acc.myBalance < 0 ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-rose-600" />
                      <span>মেসে বকেয়া: {currency}{acc.dueAmount.toLocaleString()}</span>
                    </>
                  ) : acc.myBalance > 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span>মেস থেকে ফেরত: {currency}{acc.refundAmount.toLocaleString()}</span>
                    </>
                  ) : (
                    <span>হিসাব শূন্য (Settled)</span>
                  )}
                </div>

                {/* Ultra-HD Individual PDF Statement Download */}
                <button
                  id="btn-member-download-individual-pdf"
                  onClick={handleDownloadIndividualSlip}
                  disabled={isExportingIndividual}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title="ব্যক্তিগত পূর্ণাঙ্গ PDF স্লিপ ডাউনলোড (Individual Monthly Statement)"
                >
                  {isExportingIndividual ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  ) : (
                    <FolderArchive className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>{isExportingIndividual ? 'তৈরি হচ্ছে...' : 'ব্যক্তিগত স্লিপ ডাউনলোড (PDF)'}</span>
                </button>
              </div>
            </div>

            {/* Download feedback */}
            {individualExportMsg && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{individualExportMsg}</span>
              </div>
            )}

            {/* Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-5">
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-600" />
                  <span>আমার মোট মিল</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {acc.myTotalMeals} <span className="text-xs font-bold text-slate-400">টি</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  মিল রেট: {currency}{acc.mealRate.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Receipt className="h-3.5 w-3.5 text-amber-600" />
                  <span>আমার মিল খরচ</span>
                </div>
                <div className="text-2xl font-black text-amber-900 mt-2">
                  {currency}{acc.myMealCost.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ({acc.myTotalMeals} × {currency}{acc.mealRate.toFixed(2)})
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>আমার মোট জমা</span>
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-2">
                  {currency}{acc.myTotalDeposits.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  জমা এন্ট্রি: {monthlyDepositsList.length} টি
                </div>
              </div>

              <div
                className={`rounded-2xl p-4 border ${
                  acc.myBalance < 0
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  {acc.myBalance < 0 ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                      <span>চলতি বকেয়া (Due)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>ফেরত ব্যালেন্স (Refund)</span>
                    </>
                  )}
                </div>
                <div className="text-2xl font-black mt-2">
                  {currency}{Math.abs(acc.myBalance).toLocaleString()}
                </div>
                <div className="text-[11px] opacity-75 mt-1">
                  {acc.myBalance < 0 ? 'মেস ম্যানেজারকে পরিশোধযোগ্য' : 'মাস শেষে আপনার পাওনা'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation for Member actions */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'monthly'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>আমার মিলের তালিকা ({monthlyMealsList.length} দিন)</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>আমার জমা খাতা</span>
          </button>

          {portalData?.settings.showBazarOption && (
            <button
              onClick={() => setActiveTab('bazar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'bazar'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>আমার বাজার</span>
            </button>
          )}
        </div>

        {/* TAB 2: MY MONTHLY MEALS */}
        {activeTab === 'monthly' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedMonth} মাসের আমার সকল মিলের খাতা
                </h3>
                <p className="text-xs text-slate-500">
                  যেকোনো দিনের মিলে ক্লিক করে পরিবর্তন করতে পারেন
                </p>
              </div>

              <div className="text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
                মোট মিল: {monthlyMealsList.reduce((s, m) => s + (Number(m.mealCount) || 0), 0)} টি
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">তারিখ (Date)</th>
                    <th className="py-2.5 px-3 text-center">দুপুর (Lunch)</th>
                    <th className="py-2.5 px-3 text-center">রাত (Dinner)</th>
                    <th className="py-2.5 px-3 text-right">মোট মিল</th>
                    <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyMealsList.map((m) => {
                    const isLunch = m.lunch ?? m.mealCount >= 1;
                    const isDinner = m.dinner ?? m.mealCount >= 2;
                    const isToday = m.date === todayStr;

                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isToday ? 'bg-amber-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900">{m.date}</span>
                          {isToday && (
                            <span className="ml-2 text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md">
                              আজ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isLunch ? (
                            <span className="text-emerald-600 font-bold">✅ ১ মিল</span>
                          ) : (
                            <span className="text-slate-400">❌ বন্ধ</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isDinner ? (
                            <span className="text-emerald-600 font-bold">✅ ১ মিল</span>
                          ) : (
                            <span className="text-slate-400">❌ বন্ধ</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 text-sm">
                          {m.mealCount}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() =>
                              setEditingDateMeal({
                                date: m.date,
                                lunch: isLunch,
                                dinner: isDinner,
                                count: m.mealCount,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            এডিট
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {monthlyMealsList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        এই মাসে এখনও কোনো মিল এন্ট্রি নেই
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MY DEPOSITS */}
        {activeTab === 'deposits' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  আমার জমা ও পেমেন্ট বিবরণী
                </h3>
                <p className="text-xs text-slate-500">
                  আপনার জমা দেওয়া সকল টাকার তালিকা
                </p>
              </div>

              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>নতুন টাকা জমা দিন</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">তারিখ (Date)</th>
                    <th className="py-2.5 px-3">মাধ্যম (Method)</th>
                    <th className="py-2.5 px-3">নোট / TrxID</th>
                    <th className="py-2.5 px-3 text-right">পরিমাণ (Amount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyDepositsList.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800">{d.date}</td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                          {d.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{d.note || '-'}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                        +{currency}{Number(d.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {monthlyDepositsList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        এই মাসে আপনার কোনো জমা এন্ট্রি নেই
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MY BAZAR EXPENSES */}
        {activeTab === 'bazar' && portalData?.settings.showBazarOption && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  আমার বাজারের খরচ
                </h3>
                <p className="text-xs text-slate-500">
                  আপনি বাজার করে থাকলে সেই খরচের হিসাব
                </p>
              </div>

              <button
                onClick={() => setIsBazarModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>বাজার খরচ যোগ করুন</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">বিবরণ</th>
                    <th className="py-2.5 px-3">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 text-right">খরচ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {portalData.bazar.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800">{b.date}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{b.description}</td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        {currency}{Number(b.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {portalData.bazar.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        আপনার কোনো বাজার খরচ পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal 1: Add Deposit */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title="টাকা জমা দিন (Submit Deposit)"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitDeposit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              টাকার পরিমাণ (Amount):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currency}</span>
              <input
                type="number"
                required
                min={1}
                placeholder="2000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              পেমেন্ট মাধ্যম (Payment Method):
            </label>
            <select
              value={depositMethod}
              onChange={(e) => setDepositMethod(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-emerald-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="bKash">বিকাশ (bKash)</option>
              <option value="Nagad">নগদ (Nagad)</option>
              <option value="Cash">ক্যাশ / নগদ টাকা (Cash)</option>
              <option value="Rocket">রকেট (Rocket)</option>
              <option value="Bank">ব্যাংক ট্রান্সফার (Bank)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              নোট বা ট্রানজেকশন আইডি (ঐচ্ছিক):
            </label>
            <input
              type="text"
              placeholder="e.g. TrxID: 9X3Y... অথবা রুমের ক্যাশ জমা"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 focus:bg-white outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={depositLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {depositLoading ? 'জমা হচ্ছে...' : 'জমা সম্পন্ন করুন'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add Bazar */}
      <Modal
        isOpen={isBazarModalOpen}
        onClose={() => setIsBazarModalOpen(false)}
        title="বাজারের খরচ যোগ করুন (Add Bazar)"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitBazar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              বিবরণ (Description):
            </label>
            <input
              type="text"
              required
              placeholder="e.g. চাল, আলু, তেল ও মুরগি"
              value={bazarDesc}
              onChange={(e) => setBazarDesc(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-emerald-500 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              খরচের পরিমাণ (Amount):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currency}</span>
              <input
                type="number"
                required
                min={1}
                placeholder="1200"
                value={bazarAmount}
                onChange={(e) => setBazarAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ক্যাটাগরি (Category):
            </label>
            <select
              value={bazarCategory}
              onChange={(e) => setBazarCategory(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-emerald-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="Grocery">গ্রোসারি / মুদি (Grocery)</option>
              <option value="Fish">মাছ (Fish)</option>
              <option value="Meat">মাংস (Meat)</option>
              <option value="Vegetable">শাকসবজি (Vegetable)</option>
              <option value="Rice">চাল (Rice)</option>
              <option value="Other">অন্যান্য (Other)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBazarModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={bazarLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {bazarLoading ? 'যোগ হচ্ছে...' : 'খরচ সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Change PIN */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="গোপন পিন কোড পরিবর্তন (Change PIN)"
        maxWidth="sm"
      >
        <form onSubmit={handleUpdatePin} className="space-y-4">
          <p className="text-xs text-slate-500">
            লগইন করার সময় ব্যবহারের জন্য আপনার ৪ ডিজিটের পিন পরিবর্তন করুন।
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              বর্তমান পিন (Current PIN): <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold focus:border-emerald-500 focus:bg-white outline-none tracking-widest"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              নতুন ৪ ডিজিটের পিন (New PIN): <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold focus:border-emerald-500 focus:bg-white outline-none tracking-widest"
            />
          </div>

          {pinError && (
            <p className="text-xs font-semibold text-rose-600">{pinError}</p>
          )}

          {pinSuccess && (
            <p className="text-xs font-bold text-emerald-600">পিন সফলভাবে পরিবর্তন হয়েছে!</p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              পিন সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Edit Specific Date Meal */}
      {editingDateMeal && (
        <Modal
          isOpen={true}
          onClose={() => setEditingDateMeal(null)}
          title={`মিল পরিবর্তন: ${editingDateMeal.date}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {editingDateMeal.date} তারিখের জন্য আপনার মিল আপডেট করুন:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setEditingDateMeal({
                    ...editingDateMeal,
                    lunch: !editingDateMeal.lunch,
                  })
                }
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  editingDateMeal.lunch
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs font-bold">দুপুর</span>
                <span className="text-[10px]">
                  {editingDateMeal.lunch ? 'চালু (১ মিল)' : 'বন্ধ (০ মিল)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditingDateMeal({
                    ...editingDateMeal,
                    dinner: !editingDateMeal.dinner,
                  })
                }
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  editingDateMeal.dinner
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs font-bold">রাত</span>
                <span className="text-[10px]">
                  {editingDateMeal.dinner ? 'চালু (১ মিল)' : 'বন্ধ (০ মিল)'}
                </span>
              </button>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDateMeal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveDateMeal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                আপডেট করুন
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fixed Soft RGB Animated Bottom Navigation Bar on Mobile Phone */}
      <MemberBottomNav />
    </div>
  );
};
