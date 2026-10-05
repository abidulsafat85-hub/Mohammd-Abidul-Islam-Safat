/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
  PollVoteStatus,
  AuthUser,
} from './types';
import { ApiService } from './services/apiService';
import { calculateMonthlySummary } from './services/calculations';
import { getCurrentMonthString, getTodayString } from './utils/dateUtils';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { MealEntryView } from './components/meals/MealEntryView';
import { MembersView } from './components/members/MembersView';
import { BazarView } from './components/bazar/BazarView';
import { DepositsView } from './components/deposits/DepositsView';
import { MonthlyReportView } from './components/reports/MonthlyReportView';
import { CalendarHistoryView } from './components/history/CalendarHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { WhatsAppPollView } from './components/whatsapp/WhatsAppPollView';
import { MemberPortalView } from './components/member/MemberPortalView';
import { ShareLinksModal } from './components/admin/ShareLinksModal';
import { LoginView } from './components/auth/LoginView';
import { AdminForcePasswordChange } from './components/auth/AdminForcePasswordChange';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { OrderPage } from './pages/OrderPage';
import { OrderStatusPage } from './pages/OrderStatusPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { MemberMealPage } from './components/member/MemberMealPage';
import { MemberHistoryPage } from './components/member/MemberHistoryPage';
import { MemberPaymentPage } from './components/member/MemberPaymentPage';
import { MemberComplaintsPage } from './components/member/MemberComplaintsPage';
import { MemberProfilePage } from './components/member/MemberProfilePage';
import { OrdersView } from './components/admin/OrdersView';
import { DEFAULT_APP_NAME, DEFAULT_LOGO } from './constants/branding';

const ADMIN_EMAIL = 'abidulsafat85@gmail.com';

export default function App() {
  // Authentication State: loaded synchronously from localStorage if available, then verified from server
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('messmate_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Check if current authenticated user is the Admin / Manager
  const isAdmin = useMemo(() => {
    return authUser?.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }, [authUser]);

  // Mode: for Admin, can toggle between 'admin' and 'member' preview; for other users, strictly 'member'
  const [appMode, setAppMode] = useState<'admin' | 'member'>('admin');

  // Active Member ID for Member Portal
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Navigation tabs for Admin Panel: 1st Meal Entry then Dashboard
  const [currentTab, setCurrentTab] = useState<NavTab>('meals');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthString());
  const [todayStr, setTodayStr] = useState<string>(() => getTodayString());

  // Quick Action Modal states in Admin
  const [openQuickDeposit, setOpenQuickDeposit] = useState(false);

  // Auto-update live date and synchronize automatically on rollover, interval, or focus
  useEffect(() => {
    const syncLiveDate = () => {
      const nowToday = getTodayString();
      setTodayStr(nowToday);
    };

    const interval = setInterval(syncLiveDate, 30000);
    const handleFocus = () => syncLiveDate();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Core Data loaded directly from Firestore API (Section 4a)
  const [members, setMembers] = useState<Member[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [bazar, setBazar] = useState<BazarExpense[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [settings, setSettings] = useState<MessSettings>({
    appName: DEFAULT_APP_NAME,
    messName: DEFAULT_APP_NAME,
    logo: DEFAULT_LOGO,
    subtitle: 'ঘরের তৈরি স্বাস্থ্যকর খাবারের নির্ভরযোগ্য ঠিকানা',
    currency: '৳',
    mealRateMode: 'bazar_only',
    defaultMealsPerDay: 2,
    theme: 'light',
    fixedMealRate: 50,
  });

  // Helper to sync changes to server database
  const syncToServer = useCallback(
    (customState?: Partial<{
      members: Member[];
      meals: MealRecord[];
      bazar: BazarExpense[];
      deposits: Deposit[];
      fixedExpenses: FixedExpense[];
      settings: MessSettings;
    }>) => {
      const payload = {
        members: customState?.members || members,
        meals: customState?.meals || meals,
        bazar: customState?.bazar || bazar,
        deposits: customState?.deposits || deposits,
        fixedExpenses: customState?.fixedExpenses || fixedExpenses,
        settings: customState?.settings || settings,
      };

      ApiService.syncState(payload).catch((err) => {
        console.warn('Background sync to server skipped or failed:', err);
      });
    },
    [members, meals, bazar, deposits, fixedExpenses, settings]
  );

  // Sync with Server Database on Initial Mount & Verify User Session
  useEffect(() => {
    // 1. Check user session via httpOnly cookie (Section 4b)
    ApiService.getMe()
      .then((user) => {
        if (user) {
          setAuthUser(user);
          try {
            localStorage.setItem('messmate_auth_user', JSON.stringify(user));
          } catch {}
        } else {
          // If server says no session, clear stale auth
          setAuthUser(null);
          localStorage.removeItem('messmate_auth_user');
        }
      })
      .catch(() => {})
      .finally(() => {
        setAuthChecking(false);
      });

    // 2. Load live state from server (Section 4a)
    ApiService.getFullState()
      .then((serverState) => {
        if (serverState) {
          if (Array.isArray(serverState.members)) {
            setMembers(serverState.members);
          }
          if (Array.isArray(serverState.meals)) {
            setMeals(serverState.meals);
          }
          if (Array.isArray(serverState.deposits)) {
            setDeposits(serverState.deposits);
          }
          if (Array.isArray(serverState.bazar)) {
            setBazar(serverState.bazar);
          }
          if (Array.isArray(serverState.fixedExpenses)) {
            setFixedExpenses(serverState.fixedExpenses);
          }
          if (serverState.settings) {
            setSettings(serverState.settings);
          }
        }
      })
      .catch((err) => {
        console.info('State load from server:', err);
      });
  }, []);

  // Update App Mode and Active Member based on logged in user
  useEffect(() => {
    if (!authUser) return;

    if (authUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setAppMode('admin');
      setActiveMemberId('mem-1');
    } else {
      setAppMode('member');
      // Match member by email or memberId
      const matched = members.find(
        (m) => m.email && m.email.trim().toLowerCase() === authUser.email.trim().toLowerCase()
      );
      if (matched) {
        setActiveMemberId(matched.id);
      } else if (authUser.memberId) {
        setActiveMemberId(authUser.memberId);
      } else {
        // Fallback to first regular member
        const regularMember = members.find((m) => m.id !== 'mem-1') || members[0];
        setActiveMemberId(regularMember ? regularMember.id : 'mem-2');
      }
    }
  }, [authUser, members]);

  // Real-time Monthly Accounting Calculation
  const monthlySummary = useMemo(() => {
    return calculateMonthlySummary(
      selectedMonth,
      members,
      meals,
      bazar,
      deposits,
      fixedExpenses,
      settings
    );
  }, [selectedMonth, members, meals, bazar, deposits, fixedExpenses, settings]);

  // Today's meals for badges and status
  const todayMeals = useMemo(() => {
    return meals.filter((m) => m.date === todayStr);
  }, [meals, todayStr]);

  const todayMealCount = useMemo(() => {
    return todayMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);
  }, [todayMeals]);

  // Admin Preview Member View
  const handlePreviewMember = (targetMemberId: string) => {
    setActiveMemberId(targetMemberId);
    navigate('/member/home');
  };

  // Quick Action trigger from Header
  const handleHeaderQuickAction = (action: 'meal' | 'deposit') => {
    if (action === 'meal') {
      navigate('/admin/meals');
    } else if (action === 'deposit') {
      setOpenQuickDeposit(true);
      navigate('/admin/deposits');
    }
  };

  // Save Day Meals (Admin)
  const handleSaveDayMeals = (
    date: string,
    mealEntries: { memberId: string; count: number; lunch?: boolean; dinner?: boolean }[]
  ) => {
    const otherMeals = meals.filter((m) => m.date !== date);
    const newRecords: MealRecord[] = mealEntries.map((entry) => ({
      id: `meal-${date}-${entry.memberId}`,
      date,
      memberId: entry.memberId,
      mealCount: entry.count,
      lunch: entry.lunch,
      dinner: entry.dinner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const updated = [...otherMeals, ...newRecords];
    setMeals(updated);
    syncToServer({ meals: updated });
  };

  // Sync WhatsApp Poll votes to Mess Daily Meals for today
  const handleApplyPollToMeals = (slot: 'lunch' | 'dinner', votes: Record<string, PollVoteStatus>) => {
    const today = new Date().toISOString().split('T')[0];
    const existingTodayMeals = meals.filter((m) => m.date === today);
    const otherMeals = meals.filter((m) => m.date !== today);

    const updatedTodayRecords: MealRecord[] = members
      .filter((m) => m.isActive)
      .map((member) => {
        const existing = existingTodayMeals.find((m) => m.memberId === member.id);
        const vote = votes[member.id];
        const isYes = vote === 'YES' || vote === 'AUTO_YES';

        let currentLunch = existing ? (existing.lunch ?? (existing.mealCount >= 1)) : false;
        let currentDinner = existing ? (existing.dinner ?? (existing.mealCount >= 2)) : false;

        if (slot === 'lunch') {
          currentLunch = isYes;
        } else {
          currentDinner = isYes;
        }

        const mealCount = (currentLunch ? 1 : 0) + (currentDinner ? 1 : 0);

        return {
          id: existing ? existing.id : `meal-${today}-${member.id}`,
          date: today,
          memberId: member.id,
          mealCount,
          lunch: currentLunch,
          dinner: currentDinner,
          createdAt: existing ? existing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

    const updatedMeals = [...otherMeals, ...updatedTodayRecords];
    setMeals(updatedMeals);
    syncToServer({ meals: updatedMeals });
  };

  // Member CRUD with Total Deposit sync (Admin)
  const handleSaveMember = (member: Member, totalDepositAmount?: number) => {
    const exists = members.some((m) => m.id === member.id);
    let updated: Member[];
    if (exists) {
      updated = members.map((m) => (m.id === member.id ? member : m));
    } else {
      updated = [...members, member];
    }
    setMembers(updated);

    let updatedDeposits = deposits;
    if (totalDepositAmount !== undefined) {
      const currentMonthDeps = deposits.filter(
        (d) => d.memberId === member.id && d.date.startsWith(selectedMonth)
      );

      if (currentMonthDeps.length === 0) {
        if (totalDepositAmount > 0) {
          const newDep: Deposit = {
            id: `dep-${Date.now()}`,
            memberId: member.id,
            date: `${selectedMonth}-01`,
            amount: totalDepositAmount,
            paymentMethod: 'Cash',
            note: 'Total Deposit',
            createdAt: new Date().toISOString(),
          };
          updatedDeposits = [newDep, ...deposits];
        }
      } else if (currentMonthDeps.length === 1) {
        updatedDeposits = deposits.map((d) =>
          d.id === currentMonthDeps[0].id ? { ...d, amount: totalDepositAmount } : d
        );
      } else {
        const firstDepId = currentMonthDeps[0].id;
        const otherDepIds = new Set(currentMonthDeps.slice(1).map((d) => d.id));
        updatedDeposits = deposits
          .filter((d) => !otherDepIds.has(d.id))
          .map((d) => (d.id === firstDepId ? { ...d, amount: totalDepositAmount } : d));
      }
      setDeposits(updatedDeposits);
    }

    syncToServer({ members: updated, deposits: updatedDeposits });
  };

  const handleDeleteMember = (memberId: string) => {
    const updated = members.filter((m) => m.id !== memberId);
    setMembers(updated);

    const updatedMeals = meals.filter((m) => m.memberId !== memberId);
    setMeals(updatedMeals);

    const updatedDeposits = deposits.filter((d) => d.memberId !== memberId);
    setDeposits(updatedDeposits);

    syncToServer({ members: updated, meals: updatedMeals, deposits: updatedDeposits });
  };

  const handleToggleMemberActive = (memberId: string) => {
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, isActive: !m.isActive } : m
    );
    setMembers(updated);
    syncToServer({ members: updated });
  };

  // Bazar CRUD
  const handleSaveBazar = (item: BazarExpense) => {
    const exists = bazar.some((b) => b.id === item.id);
    let updated: BazarExpense[];
    if (exists) {
      updated = bazar.map((b) => (b.id === item.id ? item : b));
    } else {
      updated = [item, ...bazar];
    }
    setBazar(updated);
    syncToServer({ bazar: updated });
  };

  const handleDeleteBazar = (id: string) => {
    const updated = bazar.filter((b) => b.id !== id);
    setBazar(updated);
    syncToServer({ bazar: updated });
  };

  // Deposit CRUD
  const handleSaveDeposit = (item: Deposit) => {
    const exists = deposits.some((d) => d.id === item.id);
    let updated: Deposit[];
    if (exists) {
      updated = deposits.map((d) => (d.id === item.id ? item : d));
    } else {
      updated = [item, ...deposits];
    }
    setDeposits(updated);
    syncToServer({ deposits: updated });
  };

  const handleDeleteDeposit = (id: string) => {
    const updated = deposits.filter((d) => d.id !== id);
    setDeposits(updated);
    syncToServer({ deposits: updated });
  };

  // Settings Save
  const handleSaveSettings = (updated: MessSettings) => {
    setSettings(updated);
    syncToServer({ settings: updated });
  };

  // Excel Import Completion
  const handleImportComplete = (imported: {
    members?: Member[];
    meals?: MealRecord[];
    bazar?: BazarExpense[];
    deposits?: Deposit[];
  }) => {
    if (imported.members) {
      setMembers(imported.members);
    }
    if (imported.meals) {
      setMeals(imported.meals);
    }
    if (imported.bazar) {
      setBazar(imported.bazar);
    }
    if (imported.deposits) {
      setDeposits(imported.deposits);
    }
    syncToServer({
      members: imported.members || members,
      meals: imported.meals || meals,
      bazar: imported.bazar || bazar,
      deposits: imported.deposits || deposits,
    });
  };

  // Reset to Server Fresh Data
  const handleResetSampleData = () => {
    ApiService.getFullState().then((serverState) => {
      if (serverState) {
        if (Array.isArray(serverState.members)) setMembers(serverState.members);
        if (Array.isArray(serverState.meals)) setMeals(serverState.meals);
        if (Array.isArray(serverState.deposits)) setDeposits(serverState.deposits);
        if (Array.isArray(serverState.bazar)) setBazar(serverState.bazar);
        if (Array.isArray(serverState.fixedExpenses)) setFixedExpenses(serverState.fixedExpenses);
        if (serverState.settings) setSettings(serverState.settings);
      }
    });
  };

  // Clear All Data
  const handleClearAllData = () => {
    setMembers([]);
    setMeals([]);
    setBazar([]);
    setDeposits([]);
    setFixedExpenses([]);
    syncToServer({
      members: [],
      meals: [],
      bazar: [],
      deposits: [],
      fixedExpenses: [],
    });
  };

  const navigate = useNavigate();

  // New Orders Count for Admin navigation badge (Section 1e)
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);

  const fetchOrdersCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/mess/admin/orders', { credentials: 'include' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const pendingCount = json.data.filter((o: any) => o.status === 'PENDING').length;
        setNewOrdersCount(pendingCount);
      }
    } catch {
      // offline / mock
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchOrdersCount();
    const interval = setInterval(fetchOrdersCount, 30000);
    return () => clearInterval(interval);
  }, [fetchOrdersCount]);

  // Login Success Handler: navigates to ?redirect= or respective default panel
  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    try {
      localStorage.setItem('messmate_auth_user', JSON.stringify(user));
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const isUserAdmin = user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      navigate(redirect, { replace: true });
    } else if (isUserAdmin) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/member/home', { replace: true });
    }
  };

  // Logout Handler - Navigates directly to homepage ('/')
  const handleLogout = async () => {
    try {
      await ApiService.logout();
    } catch {}
    localStorage.removeItem('messmate_auth_user');
    sessionStorage.clear();
    setAuthUser(null);
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // If first admin login, forced password change screen can be completed or dismissed
  if (isAdmin && authUser?.mustChangePassword) {
    return (
      <AdminForcePasswordChange
        authUser={authUser}
        onPasswordChanged={(updatedUser) => {
          setAuthUser(updatedUser);
          try {
            localStorage.setItem('messmate_auth_user', JSON.stringify(updatedUser));
          } catch {}
        }}
        onDismiss={() => {
          const dismissedUser = { ...authUser, mustChangePassword: false };
          setAuthUser(dismissedUser);
          try {
            localStorage.setItem('messmate_auth_user', JSON.stringify(dismissedUser));
          } catch {}
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Routes>
      {/* ========================================== */}
      {/* PUBLIC ROUTES (Section 1a)                */}
      {/* ========================================== */}
      <Route path="/" element={<HomePage authUser={authUser} onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/order/status" element={<OrderStatusPage />} />
      <Route
        path="/login"
        element={
          <PublicLoginRoute
            authUser={authUser}
            isAdmin={isAdmin}
            onLoginSuccess={handleLoginSuccess}
          />
        }
      />
      <Route
        path="/register"
        element={
          <PublicRegisterRoute
            authUser={authUser}
            isAdmin={isAdmin}
            onRegisterSuccess={handleLoginSuccess}
          />
        }
      />

      {/* ========================================== */}
      {/* MEMBER ROUTES (Section 1a & 1c)           */}
      {/* ========================================== */}
      <Route
        path="/member/home"
        element={
          <RequireAuth authUser={authUser} authChecking={authChecking}>
            <div className="relative">
              {isAdmin && (
                <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-50">
                  <span>👑 আপনি এডমিন হিসেবে মেম্বার পোর্টাল প্রিভিউ দেখছেন</span>
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="px-3 py-1 bg-white text-amber-900 rounded-lg font-black hover:bg-amber-50 transition-colors cursor-pointer"
                  >
                    এডমিন প্যানেলে ফিরুন
                  </button>
                </div>
              )}
              <MemberPortalView
                memberId={activeMemberId || authUser?.memberId || authUser?.id || 'mem-2'}
                onLogout={handleLogout}
                isAdmin={isAdmin}
                authUser={authUser}
                onOpenAdminLogin={() => {
                  if (isAdmin) navigate('/admin/dashboard');
                  else handleLogout();
                }}
                allMembersFallback={members}
                allMealsFallback={meals}
                allDepositsFallback={deposits}
                allBazarFallback={bazar}
                settingsFallback={settings}
              />
            </div>
          </RequireAuth>
        }
      />
      <Route
        path="/member/meal"
        element={
          <RequireAuth authUser={authUser} authChecking={authChecking}>
            <MemberMealPage authUser={authUser} onLogout={handleLogout} />
          </RequireAuth>
        }
      />
      <Route
        path="/member/history"
        element={
          <RequireAuth authUser={authUser} authChecking={authChecking}>
            <MemberHistoryPage authUser={authUser} onLogout={handleLogout} isAdmin={isAdmin} />
          </RequireAuth>
        }
      />
      <Route
        path="/member/payment"
        element={
          <RequireAuth authUser={authUser} authChecking={authChecking}>
            <MemberPaymentPage authUser={authUser} onLogout={handleLogout} isAdmin={isAdmin} />
          </RequireAuth>
        }
      />
      <Route
        path="/member/complaints"
        element={
          <RequireAuth authUser={authUser} authChecking={authChecking}>
            <MemberComplaintsPage authUser={authUser} onLogout={handleLogout} isAdmin={isAdmin} />
          </RequireAuth>
        }
      />
      <Route
        path="/member/profile"
        element={
          <RequireAuth authUser={authUser} authChecking={authChecking}>
            <MemberProfilePage authUser={authUser} onLogout={handleLogout} isAdmin={isAdmin} />
          </RequireAuth>
        }
      />
      <Route path="/member" element={<Navigate to="/member/home" replace />} />

      {/* ========================================== */}
      {/* ADMIN ROUTES (Section 1a, 1c & 1e)        */}
      {/* ========================================== */}
      <Route
        path="/admin/*"
        element={
          <RequireAdmin authUser={authUser} isAdmin={isAdmin}>
            <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-900 font-sans">
              {/* Desktop Left Sidebar */}
              <Sidebar
                settings={settings}
                todayMealCount={todayMealCount}
                memberCount={members.length}
                newOrdersCount={newOrdersCount}
                onOpenShareLinks={() => setIsShareModalOpen(true)}
                onSwitchToMemberView={() => {
                  setActiveMemberId(members[1]?.id || 'mem-2');
                  navigate('/member/home');
                }}
                authUser={authUser}
                onLogout={handleLogout}
              />

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Sticky Top Header */}
                <Header
                  selectedMonth={selectedMonth}
                  onSelectMonth={setSelectedMonth}
                  settings={settings}
                  onOpenQuickAction={handleHeaderQuickAction}
                  onNavigateTab={(tab) => navigate(`/admin/${tab}`)}
                  onOpenShareLinks={() => setIsShareModalOpen(true)}
                  onSwitchToMemberView={() => {
                    setActiveMemberId(members[1]?.id || 'mem-2');
                    navigate('/member/home');
                  }}
                  authUser={authUser}
                  onLogout={handleLogout}
                />

                {/* Scrollable View Container */}
                <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-8">
                  <div className="max-w-7xl mx-auto">
                    <Routes>
                      <Route
                        path="dashboard"
                        element={
                          <DashboardView
                            summary={monthlySummary}
                            members={members}
                            todayMeals={todayMeals}
                            allMeals={meals}
                            allDeposits={deposits}
                            settings={settings}
                            onNavigateTab={(tab) => navigate(`/admin/${tab}`)}
                            onOpenQuickAction={handleHeaderQuickAction}
                          />
                        }
                      />
                      <Route
                        path="meals"
                        element={
                          <MealEntryView
                            members={members}
                            allMeals={meals}
                            onSaveDayMeals={handleSaveDayMeals}
                            settings={settings}
                            onNavigateTab={(tab) => navigate(`/admin/${tab}`)}
                          />
                        }
                      />
                      <Route
                        path="members"
                        element={
                          <MembersView
                            members={members}
                            onSaveMember={handleSaveMember}
                            onDeleteMember={handleDeleteMember}
                            onToggleActive={handleToggleMemberActive}
                            meals={meals}
                            deposits={deposits}
                            summary={monthlySummary}
                            settings={settings}
                          />
                        }
                      />
                      <Route
                        path="bazar"
                        element={
                          <BazarView
                            bazar={bazar}
                            members={members}
                            onSaveBazar={handleSaveBazar}
                            onDeleteBazar={handleDeleteBazar}
                            selectedMonth={selectedMonth}
                            settings={settings}
                          />
                        }
                      />
                      <Route
                        path="deposits"
                        element={
                          <DepositsView
                            deposits={deposits}
                            members={members}
                            onSaveDeposit={handleSaveDeposit}
                            onDeleteDeposit={handleDeleteDeposit}
                            selectedMonth={selectedMonth}
                            settings={settings}
                            isOpenAddModalDirectly={openQuickDeposit}
                            onCloseAddModalDirectly={() => setOpenQuickDeposit(false)}
                          />
                        }
                      />
                      <Route
                        path="orders"
                        element={<OrdersView />}
                      />
                      <Route
                        path="whatsapp"
                        element={
                          <WhatsAppPollView
                            members={members}
                            settings={settings}
                            onUpdateSettings={handleSaveSettings}
                            onApplyPollToMeals={handleApplyPollToMeals}
                          />
                        }
                      />
                      <Route
                        path="settings"
                        element={
                          <SettingsView
                            settings={settings}
                            onSaveSettings={handleSaveSettings}
                            members={members}
                            meals={meals}
                            bazar={bazar}
                            deposits={deposits}
                            onImportComplete={handleImportComplete}
                            onResetSampleData={handleResetSampleData}
                            onClearAllData={handleClearAllData}
                          />
                        }
                      />
                      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                    </Routes>
                  </div>
                </main>

                {/* Mobile Bottom Navigation Bar */}
                <BottomNav
                  todayMealCount={todayMealCount}
                  memberCount={members.length}
                  newOrdersCount={newOrdersCount}
                  settings={settings}
                  onLogout={handleLogout}
                />
              </div>

              {/* Share Links Modal */}
              <ShareLinksModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                members={members}
                settings={settings}
                onPreviewMember={(memberId) => {
                  setIsShareModalOpen(false);
                  setActiveMemberId(memberId);
                  navigate('/member/home');
                }}
              />
            </div>
          </RequireAdmin>
        }
      />

      {/* ========================================== */}
      {/* 404 NOT FOUND ROUTE                       */}
      {/* ========================================== */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// ---------------------------------------------------------------------------
// ROUTE GUARDS (Section 1c)
// ---------------------------------------------------------------------------

function RequireAuth({
  authUser,
  authChecking,
  children,
}: {
  authUser: AuthUser | null;
  authChecking?: boolean;
  children: React.ReactElement;
}) {
  if (authChecking && !authUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-500">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }
  if (!authUser) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireAdmin({
  authUser,
  isAdmin,
  children,
}: {
  authUser: AuthUser | null;
  isAdmin: boolean;
  children: React.ReactElement;
}) {
  if (!authUser) {
    return <Navigate to="/" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/member/home" replace />;
  }
  return children;
}

function PublicLoginRoute({
  authUser,
  isAdmin,
  onLoginSuccess,
}: {
  authUser: AuthUser | null;
  isAdmin: boolean;
  onLoginSuccess: (user: AuthUser) => void;
}) {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  if (authUser) {
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return <Navigate to={redirect} replace />;
    }
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/member/home'} replace />;
  }

  return <LoginView onLoginSuccess={onLoginSuccess} />;
}

function PublicRegisterRoute({
  authUser,
  isAdmin,
  onRegisterSuccess,
}: {
  authUser: AuthUser | null;
  isAdmin: boolean;
  onRegisterSuccess: (user: AuthUser) => void;
}) {
  if (authUser) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/member/home'} replace />;
  }
  return <RegisterPage onRegisterSuccess={onRegisterSuccess} />;
}

