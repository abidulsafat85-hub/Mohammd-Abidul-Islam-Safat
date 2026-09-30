import React from 'react';
import {
  CalendarDays,
  Plus,
  UtensilsCrossed,
  Wallet,
  ChevronDown,
  Share2,
  Users,
  Shield,
  LogOut,
} from 'lucide-react';
import { MessSettings, AuthUser } from '../../types';
import { getAvailableMonths, formatDateFull, getTodayString, getCurrentMonthString } from '../../utils/dateUtils';
import { NavTab } from './Sidebar';

interface HeaderProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  settings: MessSettings;
  onOpenQuickAction: (action: 'meal' | 'deposit') => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenShareLinks?: () => void;
  onSwitchToMemberView?: () => void;
  authUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onSelectMonth,
  settings,
  onOpenQuickAction,
  onNavigateTab,
  onOpenShareLinks,
  onSwitchToMemberView,
  authUser,
  onLogout,
}) => {
  const months = getAvailableMonths();
  const todayStr = getTodayString();
  const formattedToday = formatDateFull(todayStr);
  const currentMonth = getCurrentMonthString();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Date & Month Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mobile brand indicator */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm">
              {settings.messName}
            </span>
            <span className="text-[10px] font-black bg-slate-900 text-emerald-400 px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>

          {/* Desktop Admin Mode Badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>এডমিন প্যানেল</span>
          </div>

          <div className="hidden sm:block h-5 w-[1px] bg-slate-200" />

          {/* Month selector dropdown */}
          <div className="relative inline-flex items-center">
            <CalendarDays className="absolute left-3 h-4 w-4 text-emerald-600 pointer-events-none" />
            <select
              id="header-month-selector"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="appearance-none bg-emerald-50/70 hover:bg-emerald-50 text-emerald-950 font-bold text-xs sm:text-sm pl-9 pr-8 py-2 rounded-xl border border-emerald-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-all"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-emerald-700 pointer-events-none" />
          </div>

          {selectedMonth !== currentMonth && (
            <button
              onClick={() => onSelectMonth(currentMonth)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              title="Jump to current active month"
            >
              Current Month
            </button>
          )}

          {/* Current Date & Day Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/70">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-bold">Today:</span>
            <span>{formattedToday}</span>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Share Member Links Button */}
          {onOpenShareLinks && (
            <button
              id="header-share-links-btn"
              onClick={onOpenShareLinks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs sm:text-sm border border-teal-200/90 shadow-2xs transition-all cursor-pointer"
              title="প্রত্যেক মেম্বারের জন্য আলাদা শেয়ার লিংক"
            >
              <Share2 className="h-3.5 w-3.5 text-teal-600" />
              <span>লিংক শেয়ার</span>
            </button>
          )}

          {/* Switch to Member Portal Preview */}
          {onSwitchToMemberView && (
            <button
              id="header-member-view-btn"
              onClick={onSwitchToMemberView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-200 transition-all cursor-pointer"
              title="মেম্বার পোর্টাল প্রিভিউ দেখুন"
            >
              <Users className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">মেম্বার ভিউ</span>
            </button>
          )}

          {/* Quick Today's Meal Entry */}
          <button
            id="header-quick-meal-btn"
            onClick={() => onNavigateTab('meals')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>Today's Meal</span>
          </button>

          {/* Quick Add Deposit */}
          <button
            id="header-quick-deposit-btn"
            onClick={() => onOpenQuickAction('deposit')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-200 transition-all cursor-pointer"
            title="Record Member Deposit"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">+ Deposit</span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              id="header-logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              title="লগআউট করুন"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">লগআউট</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

