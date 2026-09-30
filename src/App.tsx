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
import { StorageService } from './services/storage';
import { ApiService } from './services/apiService';
import { calculateMonthlySummary } from './services/calculations';
import { getCurrentMonthString, getTodayString } from './utils/dateUtils';
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

const ADMIN_EMAIL = 'abidulsafat85@gmail.com';

export default function App() {
  // Authentication State: persistent in localStorage
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('messmate_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

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

  // Core Data loaded from persistent offline storage
  const [members, setMembers] = useState<Member[]>(() => StorageService.getMembers());
  const [meals, setMeals] = useState<MealRecord[]>(() => StorageService.getMeals());
  const [bazar, setBazar] = useState<BazarExpense[]>(() => StorageService.getBazar());
  const [deposits, setDeposits] = useState<Deposit[]>(() => {
    const rawDeps = StorageService.getDeposits();
    const rawMembers = StorageService.getMembers();
    let hasAdditions = false;
    const synced = [...rawDeps];
    rawMembers.forEach((m) => {
      const initDep = Number(m.initialDeposit) || 0;
      if (initDep > 0) {
        const hasDep = synced.some((d) => d.memberId === m.id);
        if (!hasDep) {
          synced.push({
            id: `dep-init-${m.id}`,
            memberId: m.id,
            date: `2026-09-01`,
            amount: initDep,
            paymentMethod: 'Cash',
            note: 'Initial Deposit',
            createdAt: new Date().toISOString(),
          });
          hasAdditions = true;
        }
      }
    });
    if (hasAdditions) {
      StorageService.saveDeposits(synced);
    }
    return synced;
  });
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() =>
    StorageService.getFixedExpenses()
  );
  const [settings, setSettings] = useState<MessSettings>(() => StorageService.getSettings());

  // Helper to sync changes to both local storage and server database
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

  // Sync with Server Database on Initial Mount
  useEffect(() => {
    ApiService.getFullState()
      .then((serverState) => {
        if (serverState) {
          if (Array.isArray(serverState.members) && serverState.members.length > 0) {
            setMembers(serverState.members);
            StorageService.saveMembers(serverState.members);
          }
          if (Array.isArray(serverState.meals) && serverState.meals.length > 0) {
            setMeals(serverState.meals);
            StorageService.saveMeals(serverState.meals);
          }
          if (Array.isArray(serverState.deposits) && serverState.deposits.length > 0) {
            setDeposits(serverState.deposits);
            StorageService.saveDeposits(serverState.deposits);
          }
          if (Array.isArray(serverState.bazar)) {
            setBazar(serverState.bazar);
            StorageService.saveBazar(serverState.bazar);
          }
          if (Array.isArray(serverState.fixedExpenses)) {
            setFixedExpenses(serverState.fixedExpenses);
            StorageService.saveFixedExpenses(serverState.fixedExpenses);
          }
          if (serverState.settings) {
            setSettings(serverState.settings);
            StorageService.saveSettings(serverState.settings);
          }
        }
      })
      .catch((err) => {
        console.info('Operating from local persistence:', err);
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

  // Authentication Handlers
  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    localStorage.setItem('messmate_auth_user', JSON.stringify(user));

    // Immediately fetch latest members from server so newly registered user is present
    ApiService.getFullState().then((serverState) => {
      if (serverState?.members && Array.isArray(serverState.members)) {
        setMembers(serverState.members);
        StorageService.saveMembers(serverState.members);
      }
    }).catch(() => {});

    if (user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setAppMode('admin');
      setActiveMemberId('mem-1');
    } else {
      setAppMode('member');
      const matched = members.find(
        (m) => m.email && m.email.trim().toLowerCase() === user.email.trim().toLowerCase()
      );
      const targetId = matched?.id || user.memberId || 'mem-2';
      setActiveMemberId(targetId);
      localStorage.setItem('messmate_active_member_id', targetId);
    }
  };

  const handleLogout = async () => {
    try {
      await ApiService.logout();
    } catch {}
    setAuthUser(null);
    localStorage.removeItem('messmate_auth_user');
    localStorage.removeItem('messmate_auth_token');
    localStorage.removeItem('messmate_active_member_id');
  };

  // Admin Preview Member View
  const handlePreviewMember = (targetMemberId: string) => {
    setActiveMemberId(targetMemberId);
    setAppMode('member');
  };

  // Quick Action trigger from Header
  const handleHeaderQuickAction = (action: 'meal' | 'deposit') => {
    if (action === 'meal') {
      setCurrentTab('meals');
    } else if (action === 'deposit') {
      setCurrentTab('deposits');
      setOpenQuickDeposit(true);
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
    StorageService.saveMeals(updated);
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
    StorageService.saveMeals(updatedMeals);
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
    StorageService.saveMembers(updated);

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
      StorageService.saveDeposits(updatedDeposits);
    }

    syncToServer({ members: updated, deposits: updatedDeposits });
  };

  const handleDeleteMember = (memberId: string) => {
    const updated = members.filter((m) => m.id !== memberId);
    setMembers(updated);
    StorageService.saveMembers(updated);

    const updatedMeals = meals.filter((m) => m.memberId !== memberId);
    setMeals(updatedMeals);
    StorageService.saveMeals(updatedMeals);

    const updatedDeposits = deposits.filter((d) => d.memberId !== memberId);
    setDeposits(updatedDeposits);
    StorageService.saveDeposits(updatedDeposits);

    syncToServer({ members: updated, meals: updatedMeals, deposits: updatedDeposits });
  };

  const handleToggleMemberActive = (memberId: string) => {
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, isActive: !m.isActive } : m
    );
    setMembers(updated);
    StorageService.saveMembers(updated);
    syncToServer({ members: updated });
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
    StorageService.saveDeposits(updated);
    syncToServer({ deposits: updated });
  };

  const handleDeleteDeposit = (id: string) => {
    const updated = deposits.filter((d) => d.id !== id);
    setDeposits(updated);
    StorageService.saveDeposits(updated);
    syncToServer({ deposits: updated });
  };

  // Settings Save
  const handleSaveSettings = (updated: MessSettings) => {
    setSettings(updated);
    StorageService.saveSettings(updated);
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
      StorageService.saveMembers(imported.members);
    }
    if (imported.meals) {
      setMeals(imported.meals);
      StorageService.saveMeals(imported.meals);
    }
    if (imported.bazar) {
      setBazar(imported.bazar);
      StorageService.saveBazar(imported.bazar);
    }
    if (imported.deposits) {
      setDeposits(imported.deposits);
      StorageService.saveDeposits(imported.deposits);
    }
    syncToServer({
      members: imported.members || members,
      meals: imported.meals || meals,
      bazar: imported.bazar || bazar,
      deposits: imported.deposits || deposits,
    });
  };

  // Reset to Sample Data
  const handleResetSampleData = () => {
    StorageService.resetToSampleData();
    const freshMembers = StorageService.getMembers();
    const freshMeals = StorageService.getMeals();
    const freshBazar = StorageService.getBazar();
    const freshDeposits = StorageService.getDeposits();
    const freshFixed = StorageService.getFixedExpenses();
    const freshSettings = StorageService.getSettings();

    setMembers(freshMembers);
    setMeals(freshMeals);
    setBazar(freshBazar);
    setDeposits(freshDeposits);
    setFixedExpenses(freshFixed);
    setSettings(freshSettings);

    syncToServer({
      members: freshMembers,
      meals: freshMeals,
      bazar: freshBazar,
      deposits: freshDeposits,
      fixedExpenses: freshFixed,
      settings: freshSettings,
    });
  };

  // Clear All Data
  const handleClearAllData = () => {
    StorageService.clearAllData();
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

  // =========================================================================
  // CONDITION 1: IF NOT LOGGED IN -> SHOW EMAIL & PASSWORD LOGIN SCREEN
  // =========================================================================
  if (!authUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // =========================================================================
  // CONDITION 1B: FIRST ADMIN LOGIN MUST CHANGE PASSWORD SCREEN
  // The admin cannot open the admin panel until the password is changed
  // =========================================================================
  if (isAdmin && authUser.mustChangePassword) {
    return (
      <AdminForcePasswordChange
        authUser={authUser}
        onPasswordChanged={(updatedUser) => {
          setAuthUser(updatedUser);
          localStorage.setItem('messmate_auth_user', JSON.stringify(updatedUser));
        }}
        onLogout={handleLogout}
      />
    );
  }

  // =========================================================================
  // CONDITION 2: IF MEMBER (Any email other than abidulsafat85@gmail.com)
  // OR IF ADMIN IS PREVIEWING A MEMBER PORTAL
  // =========================================================================
  if (!isAdmin || appMode === 'member') {
    const effectiveMemberId = activeMemberId || 'mem-2';

    return (
      <div className="relative">
        {/* If Admin is viewing a member's portal, show top return banner */}
        {isAdmin && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
            <span>
              👑 আপনি এডমিন হিসেবে মেম্বার পোর্টাল প্রিভিউ দেখছেন (মেম্বার ID: {effectiveMemberId})
            </span>
            <button
              onClick={() => setAppMode('admin')}
              className="px-3 py-1 bg-white text-amber-900 rounded-lg font-black hover:bg-amber-50 transition-colors cursor-pointer"
            >
              এডমিন প্যানেলে ফিরুন
            </button>
          </div>
        )}

        {/* Strictly Isolated Member View with Individual Download Option */}
        <MemberPortalView
          memberId={effectiveMemberId}
          onLogout={handleLogout}
          isAdmin={isAdmin}
          onOpenAdminLogin={() => {
            if (isAdmin) {
              setAppMode('admin');
            } else {
              handleLogout();
            }
          }}
          allMembersFallback={members}
          allMealsFallback={meals}
          allDepositsFallback={deposits}
          allBazarFallback={bazar}
          settingsFallback={settings}
        />
      </div>
    );
  }

  // =========================================================================
  // CONDITION 3: IF LOGGED IN AS abidulsafat85@gmail.com -> SHOW ADMIN PANEL
  // =========================================================================
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-900 font-sans">
      {/* Desktop Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        settings={settings}
        todayMealCount={todayMealCount}
        memberCount={members.length}
        onOpenShareLinks={() => setIsShareModalOpen(true)}
        onSwitchToMemberView={() => handlePreviewMember(members[1]?.id || 'mem-2')}
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
          onNavigateTab={setCurrentTab}
          onOpenShareLinks={() => setIsShareModalOpen(true)}
          onSwitchToMemberView={() => handlePreviewMember(members[1]?.id || 'mem-2')}
          authUser={authUser}
          onLogout={handleLogout}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                summary={monthlySummary}
                members={members}
                todayMeals={todayMeals}
                allMeals={meals}
                allDeposits={deposits}
                settings={settings}
                onNavigateTab={setCurrentTab}
                onOpenQuickAction={handleHeaderQuickAction}
              />
            )}

            {currentTab === 'meals' && (
              <MealEntryView
                members={members}
                allMeals={meals}
                onSaveDayMeals={handleSaveDayMeals}
                settings={settings}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'whatsapp' && (
              <WhatsAppPollView
                members={members}
                settings={settings}
                onUpdateSettings={handleSaveSettings}
                onApplyPollToMeals={handleApplyPollToMeals}
              />
            )}

            {currentTab === 'members' && (
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
            )}

            {currentTab === 'deposits' && (
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
            )}

            {currentTab === 'reports' && (
              <MonthlyReportView
                summary={monthlySummary}
                meals={meals}
                deposits={deposits}
                settings={settings}
              />
            )}

            {currentTab === 'calendar' && (
              <CalendarHistoryView
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                members={members}
                meals={meals}
                settings={settings}
                onNavigateToDateMeal={(date) => {
                  setCurrentTab('meals');
                }}
              />
            )}

            {currentTab === 'settings' && (
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
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          todayMealCount={todayMealCount}
          memberCount={members.length}
          settings={settings}
        />
      </div>

      {/* Share Links Modal (Admin Tool to copy links & send WhatsApp invites) */}
      <ShareLinksModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        members={members}
        settings={settings}
        onPreviewMember={(memberId) => {
          setIsShareModalOpen(false);
          handlePreviewMember(memberId);
        }}
      />
    </div>
  );
}
